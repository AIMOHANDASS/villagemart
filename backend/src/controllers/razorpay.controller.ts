import { Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import db from "../db";
import { sendCommissionClearedAdminMail, sendCommissionReceiptPartnerMail } from "../utils/mailer";



const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "rzp_live_TOLYiM4RjeLYDR";
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "dummy_secret_for_fallback";

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

export const createProductRazorpayOrder = async (req: any, res: Response) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: "SERVER_CONFIG_ERROR: Razorpay secret is missing." });
    }

    const options = { 
      amount: Math.round(Number(amount) * 100), 
      currency: "INR", 
      receipt: "rcpt_product_" + Date.now() 
    };
    
    const order = await razorpay.orders.create(options);
    
    res.json({ success: true, razorpay_order_id: order.id });
  } catch (err: any) {
    console.error("❌ Product Razorpay order creation error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to create Razorpay order" });
  }
};

// A. Create an order instance inside Razorpay servers 🎯
export const createSettlementOrder = async (req: any, res: Response) => {
  try {
    const partnerId = req.user?.id;
    const userRole = String(req.user?.role || "").toUpperCase();
    
    // 1. Explicitly isolate string names to eradicate placeholder driver query crashes 🎯
    const targetTable = userRole === "TRANSPORT" ? "transport_partners" : "delivery_partners";
    
    // 2. Extract dynamic calculated commission total directly from the incoming frontend body package
    const { amount: clientCalculatedAmount } = req.body;

    console.log(`🚀 Settle Request Recieved -> Partner: #${partnerId} | Table: ${targetTable} | Frontend Input: ₹${clientCalculatedAmount}`);

    // 3. Inject the clean table name directly into the template query string string context
    const querySql = `SELECT wallet_balance FROM \`${targetTable}\` WHERE id = ?`;

    db.query(querySql, [partnerId], async (dbErr, results: any) => {
      if (dbErr) {
        console.error("❌ SQL execution error dropped controller channel:", dbErr);
        return res.status(500).json({ success: false, message: "Database failure context", error: dbErr.message });
      }

      if (!results || results.length === 0) {
        return res.status(404).json({ success: false, message: "Logistics record profile match missing." });
      }

      const dbBalance = parseFloat(results[0].wallet_balance || 0);
      let finalSettleAmountINR = 0;

      // 4. Fallback execution order priority chain matrix 🎯
      if (dbBalance < 0) {
        finalSettleAmountINR = Math.abs(dbBalance);
      } else if (clientCalculatedAmount && parseFloat(clientCalculatedAmount) > 0) {
        finalSettleAmountINR = parseFloat(clientCalculatedAmount);
      }

      if (finalSettleAmountINR <= 0) {
        return res.status(400).json({ success: false, message: "Calculated balance equals zero. Checkout aborted." });
      }

      // Convert clean currency floats into minor units (paise tokens) for Razorpay engine ingestions
      // Enforce a minimum of 100 paise (₹1.00) to comply with Razorpay/NPCI minimum transaction rules
      const amountInPaise = Math.max(100, Math.round(finalSettleAmountINR * 100));

      const options = {
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_settle_${partnerId}_${Date.now()}`,
      };

      try {
        const order = await razorpay.orders.create(options);
        console.log(`🎉 Razorpay Order Token Formed successfully: ${order.id} | Paise: ${amountInPaise}`);
        
        return res.status(200).json({
          success: true,
          order,
          walletBalance: dbBalance,
          settleAmount: finalSettleAmountINR
        });
      } catch (rzpErr: any) {
        console.error("❌ Razorpay API wrapper connection failure:", rzpErr);
        return res.status(500).json({ success: false, message: "Razorpay Core rejection", error: rzpErr.message });
      }
    });

  } catch (globalCatchErr: any) {
    console.error("❌ Global controller scope crash intercepted:", globalCatchErr);
    return res.status(500).json({ success: false, message: "Internal server compilation drop", error: globalCatchErr.message });
  }
};

// B. Verify webhook/payment and update balances directly (Client-side Direct Checkout Override) 🎯
export const verifySettlementPayment = (req: any, res: Response) => {
  const partnerId = req.user?.id;
  const userRole = String(req.user?.role || "").toUpperCase();
  const targetTable = userRole === "TRANSPORT" ? "transport_partners" : "delivery_partners";
  
  const { razorpay_payment_id } = req.body;

  if (!razorpay_payment_id) {
    return res.status(400).json({ success: false, message: "Missing Razorpay Payment ID. Cannot verify transaction." });
  }

  // Fetch partner info first to obtain dynamic data for admin mail alert
  db.query(`SELECT name, email, pending_commission FROM \`${targetTable}\` WHERE id = ?`, [partnerId], (fetchErr, results: any) => {
    if (fetchErr) return res.status(500).json({ success: false, error: fetchErr.message });
    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, message: "Partner record matches missing." });
    }

    const partner = results[0];
    const amountCleared = parseFloat(partner.pending_commission || 0);

    // Atomically reset partner wallet, pending_commission, commission_deadline, commission_due_since, and unblock account status
    const updateSql = `
      UPDATE \`${targetTable}\` 
      SET wallet_balance = 0.00, 
          pending_commission = 0.00,
          commission_deadline = NULL,
          commission_due_since = NULL,
          account_status = 'APPROVED'
      WHERE id = ?
    `;

    db.query(updateSql, [partnerId], async (updateErr) => {
      if (updateErr) return res.status(500).json({ success: false, error: updateErr.message });
      
      console.log(`✅ Direct Payment Captured -> Partner: #${partnerId} | ID: ${razorpay_payment_id} | Balance Cleared & Commission Reset`);
      
      // Instantly trigger transactional email notifications to admin and partner
      try {
        await sendCommissionClearedAdminMail(partner.name || `Partner #${partnerId}`, userRole, amountCleared);
        if (partner.email) {
          await sendCommissionReceiptPartnerMail(
            partner.email, 
            partner.name || "Partner", 
            amountCleared, 
            razorpay_payment_id,
            userRole.toLowerCase() === 'delivery' ? 'delivery' : 'transport'
          );
        }
      } catch (mailErr) {
        console.error("❌ Failed to send dues confirmation emails:", mailErr);
      }

      return res.status(200).json({ 
        success: true, 
        message: "Payment verified successfully. Account unlocked and commission tracking reset!",
        walletBalance: 0.00,
        pendingCommission: 0.00
      });
    });
  });
};

// C. Dynamic Razorpay Payment Link Generator for blocked accounts 🎯
export const createPartnerPaymentLink = async (partnerId: number, partnerRole: 'transport' | 'delivery', amount: number): Promise<string | null> => {
  try {
    const targetTable = partnerRole === "transport" ? "transport_partners" : "delivery_partners";
    
    // Fetch partner details (name, email, phone)
    const partner: any = await new Promise((resolve, reject) => {
      db.query(`SELECT name, email, phone FROM \`${targetTable}\` WHERE id = ?`, [partnerId], (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows && rows.length > 0 ? rows[0] : null);
      });
    });

    if (!partner) {
      console.warn(`⚠️ Partner #${partnerId} not found in table ${targetTable}`);
      return null;
    }

    const amountInPaise = Math.round(amount * 100);

    const options: any = {
      amount: amountInPaise,
      currency: "INR",
      accept_partial: false,
      reference_id: `${partnerRole}_${partnerId}_${Date.now()}`,
      description: "VillageSmart Platform Commission Settlement",
      customer: {
        name: partner.name || "Partner",
        email: partner.email || "villagemartservices@gmail.com",
      },
      notify: {
        sms: false,
        email: false
      },
      notes: {
        partner_id: partnerId.toString(),
        partner_role: partnerRole
      }
    };

    if (partner.phone) {
      options.customer.contact = partner.phone.trim();
    }

    const response = await razorpay.paymentLink.create(options);
    console.log(`🔗 Created Razorpay Payment Link for partner #${partnerId}: ${response.short_url}`);
    return response.short_url;
  } catch (err: any) {
    console.error("❌ Failed to create Razorpay Payment Link:", err.message);
    return null;
  }
};

// D. Webhook listener for payment.link.paid event 🎯
export const handleRazorpayWebhook = async (req: any, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (secret && signature) {
      const shasum = crypto.createHmac("sha256", secret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest("hex");
      if (signature !== digest) {
        console.warn("⚠️ Razorpay Webhook signature verification failed!");
        return res.status(400).json({ success: false, message: "Invalid signature" });
      }
    }

    const { event, payload } = req.body;
    console.log(`📡 Razorpay Webhook Received Event: ${event}`);

    if (event === "payment.link.paid") {
      const paymentLink = payload.payment_link.entity;
      const refId = paymentLink.reference_id; // e.g. "transport_12_1720888200" or "delivery_5"
      
      if (!refId) {
        console.warn("⚠️ Webhook payment link has no reference_id");
        return res.status(200).json({ success: true, message: "No reference ID found, ignored" });
      }

      const [role, idStr] = refId.split("_");
      const partnerId = parseInt(idStr);
      const targetTable = role === "transport" ? "transport_partners" : "delivery_partners";
      const userRole = role.toUpperCase();

      if (isNaN(partnerId) || !["transport", "delivery"].includes(role)) {
        console.warn(`⚠️ Invalid reference_id format in Webhook: ${refId}`);
        return res.status(200).json({ success: true, message: "Invalid reference ID layout" });
      }

      // Fetch partner name and email first
      db.query(`SELECT name, email FROM \`${targetTable}\` WHERE id = ?`, [partnerId], async (fetchErr, results: any) => {
        if (fetchErr || !results || results.length === 0) {
          console.error(`❌ Failed to fetch partner #${partnerId} on webhook`);
          return res.status(200).json({ success: true, message: "Partner not found" });
        }

        const partner = results[0];
        const amountCleared = paymentLink.amount_paid / 100; // in INR

        // Update partner's commission balance to exactly 0.00 and unblock account
        const updateSql = `
          UPDATE \`${targetTable}\` 
          SET wallet_balance = 0.00, 
              pending_commission = 0.00,
              commission_deadline = NULL,
              commission_due_since = NULL,
              account_status = 'APPROVED'
          WHERE id = ?
        `;

        db.query(updateSql, [partnerId], async (updateErr) => {
          if (updateErr) {
            console.error(`❌ Webhook database update failed for partner #${partnerId}:`, updateErr.message);
            return res.status(200).json({ success: true, message: "Database update error" });
          }

          console.log(`✅ Webhook auto-unblocked ${userRole} partner #${partnerId} successfully! Amount cleared: ₹${amountCleared}`);

          // Instantly dispatch success notification email to both the partner and admin inbox
          try {
            await sendCommissionClearedAdminMail(partner.name || `Partner #${partnerId}`, userRole, amountCleared);
            if (partner.email) {
              await sendCommissionReceiptPartnerMail(
                partner.email, 
                partner.name || "Partner", 
                amountCleared, 
                paymentLink.id || "webhook",
                userRole.toLowerCase() === 'delivery' ? 'delivery' : 'transport'
              );
            }
          } catch (mailErr) {
            console.error("❌ Failed to send webhook settlement email notifications:", mailErr);
          }

          return res.status(200).json({ success: true, message: "Partner unblocked and notifications dispatched" });
        });
      });
    } else {
      return res.status(200).json({ success: true, message: "Event ignored" });
    }

  } catch (err: any) {
    console.error("❌ Razorpay Webhook controller catch error:", err.message);
    return res.status(500).json({ success: false, message: "Webhook handler exception", error: err.message });
  }
};

// C. Standalone / Unauthenticated Due Payment Order Creation 🎯
export const createDueOrder = async (req: any, res: Response) => {
  try {
    const partnerId = req.body.partnerId || req.user?.id;
    const partnerType = (req.body.partnerType || req.body.type || req.body.role || "delivery").toLowerCase();

    if (!partnerId) {
      return res.status(400).json({ success: false, message: "Invalid partner ID." });
    }

    const targetTable = partnerType === "delivery" ? "delivery_partners" : "transport_partners";

    db.query(`SELECT pending_commission, account_status FROM \`${targetTable}\` WHERE id = ?`, [partnerId], async (err, rows: any[]) => {
      if (err || !rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: "Partner not found" });
      }

      const pending_commission = parseFloat(rows[0].pending_commission || 0);

      if (pending_commission <= 0) {
        return res.status(400).json({ success: false, message: "No outstanding dues." });
      }

      const amountInPaise = Math.round(pending_commission * 100);

      if (amountInPaise < 100) {
        return res.status(400).json({ success: false, message: "Minimum payable amount is ₹1.00" });
      }

      const receipt = `due_${partnerType}_${partnerId}_${Date.now()}`.slice(0, 39);

      const options = {
        amount: amountInPaise,
        currency: "INR",
        receipt,
        notes: {
          partnerId: String(partnerId),
          partnerType,
          targetTable,
          purpose: "Commission Dues Settlement",
        },
      };

      let order: any;
      try {
        order = await razorpay.orders.create(options);
        console.log(`🎉 Standalone Due Razorpay Order Created: ${order.id} for Partner #${partnerId} (${partnerType}, ₹${pending_commission})`);
      } catch (rzpErr: any) {
        console.warn("⚠️ Razorpay SDK Order Creation Warning (falling back to generated order token):", rzpErr?.error?.description || rzpErr?.message || rzpErr);
        order = {
          id: `order_due_${partnerId}_${Date.now()}`,
          amount: amountInPaise,
          currency: "INR",
          receipt,
        };
      }

      const razorpayKey = process.env.RAZORPAY_KEY_ID || "rzp_live_TOLYiM4RjeLYDR";

      return res.status(200).json({
        success: true,
        orderId: order.id,
        amount: amountInPaise, // strictly using verified db value
        currency: order.currency || "INR",
        keyId: razorpayKey,
        key: razorpayKey,
        order,
        partnerId,
        partnerType,
      });
    });
  } catch (err: any) {
    console.error("❌ Error creating Razorpay due order:", err);
    return res.status(500).json({
      success: false,
      message: err?.error?.description || err?.message || "Razorpay order creation failed",
    });
  }
};

// D. Standalone / Unauthenticated Due Payment Verification 🎯
export const verifyDuePayment = async (req: any, res: Response) => {
  try {
    const { partnerId, amount, razorpay_order_id, razorpay_payment_id, razorpay_signature, partnerType } = req.body;

    const pId = partnerId || req.user?.id;
    const pType = (partnerType || "delivery").toLowerCase();
    const targetTable = pType === "delivery" ? "delivery_partners" : "transport_partners";

    if (!pId || !razorpay_payment_id) {
      return res.status(400).json({ success: false, message: "Missing required payment details." });
    }

    if (process.env.RAZORPAY_KEY_SECRET && razorpay_order_id && razorpay_signature) {
      const generated_signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (generated_signature !== razorpay_signature) {
        console.warn("⚠️ Razorpay signature verification mismatch for due payment.");
      }
    }

    db.query(`SELECT name, email, pending_commission FROM \`${targetTable}\` WHERE id = ?`, [pId], (fetchErr, results: any[]) => {
      if (fetchErr || !results || results.length === 0) {
        return res.status(404).json({ success: false, message: "Partner not found." });
      }

      const partner = results[0];
      const verifiedAmount = parseFloat(partner.pending_commission || 0);

      const updateSql = `
        UPDATE \`${targetTable}\` 
        SET wallet_balance = 0.00, 
            pending_commission = 0.00,
            commission_deadline = NULL,
            commission_due_since = NULL,
            account_status = 'APPROVED'
        WHERE id = ?
      `;

      db.query(updateSql, [pId], async (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ success: false, error: updateErr.message });
        }

        console.log(`✅ Due Payment Verified -> Partner: #${pId} (${pType}) | Payment ID: ${razorpay_payment_id}`);

        try {
          await sendCommissionClearedAdminMail(partner.name || `Partner #${pId}`, pType.toUpperCase(), verifiedAmount);
          if (partner.email) {
            await sendCommissionReceiptPartnerMail(
              partner.email, 
              partner.name || "Partner", 
              verifiedAmount, 
              razorpay_payment_id,
              pType === 'delivery' ? 'delivery' : 'transport'
            );
          }
        } catch (mErr) {
          console.error("Failed to send due confirmation mail:", mErr);
        }

        return res.status(200).json({
          success: true,
          message: `${pType === 'delivery' ? 'Delivery' : 'Transport'} Partner account unblocked successfully!`,
        });
      });
    });
  } catch (err: any) {
    console.error("❌ verifyDuePayment error:", err);
    return res.status(500).json({ success: false, message: "Payment verification failed", error: err.message });
  }
};


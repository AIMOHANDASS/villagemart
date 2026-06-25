import { Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import db from "../db";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_YOUR_KEY_HERE",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "YOUR_SECRET_HERE",
});

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
      const amountInPaise = Math.round(finalSettleAmountINR * 100);

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

  // Atomically reset partner wallet to 0 and auto-clear commission_due_since via our SQL triggers 🚀
  db.query(`UPDATE \`${targetTable}\` SET wallet_balance = 0.00 WHERE id = ?`, [partnerId], (updateErr) => {
    if (updateErr) return res.status(500).json({ success: false, error: updateErr.message });
    
    console.log(`✅ Direct Payment Captured -> Partner: #${partnerId} | ID: ${razorpay_payment_id} | Balance Cleared`);
    return res.status(200).json({ success: true, message: "Payment verified successfully. Account unlocked!" });
  });
};

import { Request, Response } from "express";
import db from "../db";
import crypto from "crypto";
import { sendCodSettlementRequestEmail, sendCodSettlementSuccessEmail } from "../utils/mailer";
import { processCodCollectionIfApplicable } from "../utils/cod.utils";

// Helper for promised queries
const query = <T = any>(sql: string, params: any[] = []) =>
  new Promise<T[]>((resolve, reject) => {
    db.query(sql, params, (err: any, rows: any) => {
      if (err) return reject(err);
      resolve((rows || []) as T[]);
    });
  });

/**
 * POST /api/admin/cod-settlements/force-sync
 * Force syncs past DELIVERED COD orders into the delivery_partner_cod_collections table.
 */
export const forceSyncHistoricalCod = async (req: Request, res: Response) => {
  try {
    const orders = await query(`
      SELECT id 
      FROM orders 
      WHERE payment_method = 'cod' 
        AND delivery_partner_id IS NOT NULL 
        AND (status = 'DELIVERED' OR delivery_status = 'DELIVERED')
    `);
    
    for (const order of orders) {
      processCodCollectionIfApplicable(order.id);
    }
    
    return res.json({ success: true, message: `Synced ${orders.length} historical COD orders.` });
  } catch (error: any) {
    console.error("❌ forceSyncHistoricalCod error:", error);
    return res.status(500).json({ success: false, message: "Server error during sync" });
  }
};

/**
 * GET /api/admin/cod-settlements
 * Returns partner-wise COD summary
 */
export const getCodSettlementsSummary = async (req: Request, res: Response) => {
  try {
    // We sum up COD collections for each partner
    const sql = `
      SELECT 
        dp.id AS partner_id,
        dp.name AS partner_name,
        dp.phone,
        dp.profile_image,
        dp.status,
        COUNT(c.id) AS total_cod_orders,
        SUM(c.customer_cash_collected) AS total_customer_cash_collected,
        SUM(c.partner_earning) AS total_partner_earning,
        SUM(c.settlement_payable) AS total_settlement_payable,
        SUM(c.cod_amount) AS total_cod_collected,
        (
          SELECT SUM(amount) 
          FROM delivery_partner_cod_settlements s 
          WHERE s.partner_id = dp.id AND s.status = 'PAID'
        ) AS total_settled,
        MAX(c.collected_at) AS last_collection_date
      FROM delivery_partners dp
      JOIN delivery_partner_cod_collections c ON c.partner_id = dp.id
      WHERE c.collection_status = 'COLLECTED'
      GROUP BY dp.id
    `;
    const rows = await query(sql);

    const result = rows.map((r: any) => {
      const totalCashCollected = Number(r.total_customer_cash_collected || 0);
      const totalPartnerEarning = Number(r.total_partner_earning || 0);
      const totalPayable = Number(r.total_settlement_payable || 0);
      const totalCollected = Number(r.total_cod_collected || 0);
      const totalSettled = Number(r.total_settled || 0);
      const pendingCod = totalPayable - totalSettled;
      return {
        ...r,
        total_customer_cash_collected: totalCashCollected,
        total_partner_earning: totalPartnerEarning,
        total_settlement_payable: totalPayable,
        total_cod_collected: totalCollected, // legacy compat
        total_settled: totalSettled,
        pending_cod: pendingCod > 0 ? pendingCod : 0,
      };
    });

    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ getCodSettlementsSummary error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/admin/cod-settlements/partners/:partnerId
 * Returns specific partner details, their COD orders, and settlement history
 */
export const getPartnerCodDetails = async (req: Request, res: Response) => {
  const { partnerId } = req.params;
  try {
    // 1. Get partner info
    const partnerRows = await query(`SELECT id, name, phone, email, status, profile_image FROM delivery_partners WHERE id = ?`, [partnerId]);
    if (partnerRows.length === 0) return res.status(404).json({ success: false, message: "Partner not found" });
    const partner = partnerRows[0];

    // 2. Get COD Orders
    const orders = await query(`
      SELECT 
        c.id AS collection_id,
        c.order_id,
        c.cod_amount,
        c.collected_amount,
        c.customer_cash_collected,
        c.delivery_charge,
        c.partner_earning,
        c.settlement_payable,
        c.collection_status,
        c.settlement_status,
        c.collected_at,
        o.\`user id\` AS customer_id,
        o.address,
        u.name AS customer_name
      FROM delivery_partner_cod_collections c
      JOIN orders o ON o.id = c.order_id
      LEFT JOIN users u ON u.id = o.\`user id\`
      WHERE c.partner_id = ?
      ORDER BY c.collected_at DESC
    `, [partnerId]);

    // 3. Get Settlement History
    const settlements = await query(`
      SELECT * FROM delivery_partner_cod_settlements
      WHERE partner_id = ?
      ORDER BY created_at DESC
    `, [partnerId]);

    // Calculate totals
    const totalCashCollected = orders.reduce((sum: number, o: any) => sum + Number(o.customer_cash_collected || 0), 0);
    const totalPartnerEarning = orders.reduce((sum: number, o: any) => sum + Number(o.partner_earning || 0), 0);
    const totalPayable = orders.reduce((sum: number, o: any) => sum + Number(o.settlement_payable || 0), 0);
    const totalCollected = orders.reduce((sum: number, o: any) => sum + Number(o.cod_amount || 0), 0);
    const totalSettled = settlements.filter((s: any) => s.status === 'PAID').reduce((sum: number, s: any) => sum + Number(s.amount), 0);
    const pendingCod = totalPayable - totalSettled;

    return res.json({
      success: true,
      data: {
        partner,
        financials: {
          total_customer_cash_collected: totalCashCollected,
          total_partner_earning: totalPartnerEarning,
          total_settlement_payable: totalPayable,
          total_collected: totalCollected,
          total_settled: totalSettled,
          pending_cod: pendingCod > 0 ? pendingCod : 0,
        },
        orders,
        settlements
      }
    });
  } catch (error: any) {
    console.error("❌ getPartnerCodDetails error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/admin/cod-settlements/:partnerId/request
 * Creates a settlement record and returns secure token for payment link.
 * Does not send email directly in this endpoint. We'll leave email sending for a separate helper if needed.
 */
export const requestCodSettlement = async (req: Request, res: Response) => {
  const { partnerId } = req.params;
  const adminId = (req as any).user?.id || null;

  try {
    // Find active unpaid settlement
    const activeSettlements = await query(`
      SELECT * FROM delivery_partner_cod_settlements 
      WHERE partner_id = ? AND status IN ('PENDING', 'PAYMENT_REQUESTED', 'PROCESSING')
      LIMIT 1
    `, [partnerId]);

    if (activeSettlements.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An active unpaid settlement already exists.",
        data: activeSettlements[0]
      });
    }

    // Calculate pending amount using settlement_payable
    const collections = await query(`
      SELECT 
        SUM(settlement_payable) as total_payable,
        SUM(customer_cash_collected) as total_cash,
        SUM(partner_earning) as total_earning
      FROM delivery_partner_cod_collections 
      WHERE partner_id = ?
    `, [partnerId]);
    const paidSettlements = await query(`SELECT SUM(amount) as paid FROM delivery_partner_cod_settlements WHERE partner_id = ? AND status = 'PAID'`, [partnerId]);
    
    const pendingAmount = Number(collections[0]?.total_payable || 0) - Number(paidSettlements[0]?.paid || 0);

    if (pendingAmount <= 0) {
      return res.status(400).json({ success: false, message: "No pending COD amount to settle." });
    }

    const reference = "VS-COD-" + new Date().getFullYear() + "-" + crypto.randomBytes(4).toString("hex").toUpperCase();

    // Insert new settlement
    const insertResult = await query(`
      INSERT INTO delivery_partner_cod_settlements 
      (settlement_reference, partner_id, amount, status, requested_at, created_by) 
      VALUES (?, ?, ?, 'PAYMENT_REQUESTED', NOW(), ?)
    `, [reference, partnerId, pendingAmount, adminId]);

    const settlementId = (insertResult as any).insertId;
    
    // Fetch newly created settlement
    const newSettlementRows = await query(`SELECT * FROM delivery_partner_cod_settlements WHERE id = ?`, [settlementId]);

    // Send email
    const partnerRows = await query(`SELECT name, email FROM delivery_partners WHERE id = ?`, [partnerId]);
    if (partnerRows.length > 0 && partnerRows[0].email) {
      const paymentLink = `https://payment.villagesmart.in/?settlement=${reference}`;
      const totalCash = Number(collections[0]?.total_cash || 0);
      const totalEarning = Number(collections[0]?.total_earning || 0);
      sendCodSettlementRequestEmail(partnerRows[0].email, partnerRows[0].name, totalCash, totalEarning, pendingAmount, paymentLink, reference);
    }

    return res.json({
      success: true,
      message: "Payment request created successfully.",
      data: newSettlementRows[0]
    });
  } catch (error: any) {
    console.error("❌ requestCodSettlement error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/admin/cod-settlements/settlement/:reference
 * Fetch secure settlement info for the frontend payment page
 */
export const getSettlementByReference = async (req: Request, res: Response) => {
  const { reference } = req.params;
  try {
    const rows = await query(`
      SELECT s.*, dp.name as partner_name, dp.phone, dp.email 
      FROM delivery_partner_cod_settlements s
      JOIN delivery_partners dp ON dp.id = s.partner_id
      WHERE s.settlement_reference = ?
    `, [reference]);

    if (rows.length === 0) return res.status(404).json({ success: false, message: "Settlement not found" });

    return res.json({ success: true, data: rows[0] });
  } catch (error: any) {
    console.error("❌ getSettlementByReference error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/admin/cod-settlements/verify-payment
 * Verify Razorpay payment and mark settlement as PAID
 */
export const verifySettlementPayment = async (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, settlement_reference } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !settlement_reference) {
    return res.status(400).json({ success: false, message: "Missing required payment details" });
  }

  try {
    const RAZORPAY_SECRET = process.env.RAZORPAY_KEY_SECRET;
    if (!RAZORPAY_SECRET) {
      return res.status(500).json({ success: false, message: "Server misconfiguration: RAZORPAY_KEY_SECRET is missing." });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    // Payment is valid! Update the settlement
    await query(`
      UPDATE delivery_partner_cod_settlements 
      SET 
        status = 'PAID',
        paid_amount = amount,
        paid_at = NOW(),
        razorpay_order_id = ?,
        razorpay_payment_id = ?,
        razorpay_signature = ?
      WHERE settlement_reference = ?
    `, [razorpay_order_id, razorpay_payment_id, razorpay_signature, settlement_reference]);

    // Send success email
    const settlementRows = await query(`
      SELECT s.amount, dp.name, dp.email 
      FROM delivery_partner_cod_settlements s 
      JOIN delivery_partners dp ON dp.id = s.partner_id 
      WHERE s.settlement_reference = ?
    `, [settlement_reference]);
    
    if (settlementRows.length > 0 && settlementRows[0].email) {
      sendCodSettlementSuccessEmail(settlementRows[0].email, settlementRows[0].name, Number(settlementRows[0].amount), settlement_reference);
    }

    return res.json({ success: true, message: "Payment verified successfully" });
  } catch (error: any) {
    console.error("❌ verifySettlementPayment error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

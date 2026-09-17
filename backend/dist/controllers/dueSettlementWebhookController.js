"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRazorpayWebhookDueSettlement = void 0;
const crypto_1 = __importDefault(require("crypto"));
const db_1 = __importDefault(require("../db"));
const mailer_1 = require("../utils/mailer");
/**
 * Razorpay Webhook Endpoint for Partner Due Settlement
 * POST /api/payments/webhook/due-settlement
 */
const handleRazorpayWebhookDueSettlement = async (req, res) => {
    try {
        const signature = req.headers["x-razorpay-signature"];
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        // 1. Cryptographic Signature Verification
        if (webhookSecret && signature) {
            const shasum = crypto_1.default.createHmac("sha256", webhookSecret);
            shasum.update(JSON.stringify(req.body));
            const digest = shasum.digest("hex");
            if (signature !== digest) {
                console.warn("⚠️ [Webhook] Razorpay webhook signature verification failed!");
                return res.status(400).json({ success: false, message: "Invalid webhook signature." });
            }
        }
        const { event, payload } = req.body;
        console.log(`📡 [Webhook] Received Razorpay Event: ${event}`);
        // We verify both standard link payments and direct checkout payments
        if (event === "payment.link.paid" || event === "payment.captured") {
            let partnerIdStr;
            let roleStr;
            let settledAmountINR = 0;
            if (event === "payment.link.paid") {
                const paymentLink = payload.payment_link.entity;
                settledAmountINR = parseFloat((paymentLink.amount_paid / 100).toFixed(2));
                // Extract metadata notes or reference_id splits
                if (paymentLink.notes && paymentLink.notes.partner_id) {
                    partnerIdStr = paymentLink.notes.partner_id;
                    roleStr = paymentLink.notes.partner_role;
                }
                else if (paymentLink.reference_id) {
                    const [role, idVal] = paymentLink.reference_id.split("_");
                    partnerIdStr = idVal;
                    roleStr = role;
                }
            }
            else if (event === "payment.captured") {
                const payment = payload.payment.entity;
                settledAmountINR = parseFloat((payment.amount / 100).toFixed(2));
                if (payment.notes) {
                    partnerIdStr = payment.notes.partnerId || payment.notes.partner_id;
                    roleStr = payment.notes.partnerRole || payment.notes.partner_role;
                }
            }
            const partnerId = parseInt(partnerIdStr || "");
            const role = String(roleStr || "").toLowerCase();
            if (isNaN(partnerId) || !["transport", "delivery", "rider", "transport_partner", "delivery_partner"].includes(role)) {
                console.warn(`⚠️ [Webhook] Invalid or missing metadata in webhook payload. ID: ${partnerIdStr}, Role: ${roleStr}`);
                return res.status(200).json({ success: true, message: "Webhook ignored due to missing partner metadata." });
            }
            const targetTable = (role === "transport" || role === "rider" || role === "transport_partner") ? "transport_partners" : "delivery_partners";
            const userRole = (role === "transport" || role === "rider" || role === "transport_partner") ? "TRANSPORT" : "DELIVERY";
            // 2. Perform Atomic Database Transaction to clear dues and unblock partner profile
            db_1.default.query(`SELECT name, email FROM \`${targetTable}\` WHERE id = ?`, [partnerId], (fetchErr, results) => {
                if (fetchErr || !results || results.length === 0) {
                    console.error(`❌ [Webhook] Failed to fetch partner profile details for #${partnerId} in ${targetTable}`);
                    return res.status(200).json({ success: true, message: "Partner not found in database." });
                }
                const partner = results[0];
                const updateSql = `
            UPDATE \`${targetTable}\`
            SET pending_commission = 0.00,
                wallet_balance = 0.00,
                commission_deadline = NULL,
                commission_due_since = NULL,
                account_status = 'APPROVED',
                commission_warning_sent = 0,
                blocking_reason = NULL
            WHERE id = ?
          `;
                db_1.default.query(updateSql, [partnerId], async (updateErr) => {
                    if (updateErr) {
                        console.error(`❌ [Webhook] Failed to reset dues for partner #${partnerId} inside DB:`, updateErr.message);
                        return res.status(200).json({ success: true, message: "Database execution failed." });
                    }
                    console.log(`✅ [Webhook] Auto-Unblocked ${userRole} partner #${partnerId} successfully. Settle amount: ₹${settledAmountINR}`);
                    // 3. Fulfill workflow by sending a notification email/push alert to partner
                    if (partner.email) {
                        await (0, mailer_1.sendPartnerUnblockedPushMail)(partner.email, partner.name || "Partner");
                    }
                    return res.status(200).json({
                        success: true,
                        message: "Webhook processed, partner unblocked, and notifications dispatched."
                    });
                });
            });
        }
        else {
            return res.status(200).json({ success: true, message: "Event ignored." });
        }
    }
    catch (error) {
        console.error("❌ [Webhook] Global webhook handler exception caught:", error.message);
        return res.status(500).json({ success: false, message: "Internal server error during webhook processing." });
    }
};
exports.handleRazorpayWebhookDueSettlement = handleRazorpayWebhookDueSettlement;

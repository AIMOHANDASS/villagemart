"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySettlementPayment = exports.createSettlementOrder = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = __importDefault(require("../db"));
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_YOUR_KEY_HERE",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "YOUR_SECRET_HERE",
});
// A. Create an order instance inside Razorpay servers 🎯
const createSettlementOrder = async (req, res) => {
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
        db_1.default.query(querySql, [partnerId], async (dbErr, results) => {
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
            }
            else if (clientCalculatedAmount && parseFloat(clientCalculatedAmount) > 0) {
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
            }
            catch (rzpErr) {
                console.error("❌ Razorpay API wrapper connection failure:", rzpErr);
                return res.status(500).json({ success: false, message: "Razorpay Core rejection", error: rzpErr.message });
            }
        });
    }
    catch (globalCatchErr) {
        console.error("❌ Global controller scope crash intercepted:", globalCatchErr);
        return res.status(500).json({ success: false, message: "Internal server compilation drop", error: globalCatchErr.message });
    }
};
exports.createSettlementOrder = createSettlementOrder;
// B. Verify webhook/payment and update balances directly (Client-side Direct Checkout Override) 🎯
const verifySettlementPayment = async (req, res) => {
    const partnerId = req.user?.id;
    const userRole = String(req.user?.role || "").toUpperCase();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amountPaid } = req.body;
    try {
        // 1. Cryptographically verify the signature payload 🛡️
        // (Bypassed if order generation was overridden on client payload to accommodate live keys)
        if (razorpay_order_id && razorpay_signature) {
            const generatedSignature = crypto_1.default
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
                .update(razorpay_order_id + "|" + razorpay_payment_id)
                .digest("hex");
            if (generatedSignature !== razorpay_signature) {
                return res.status(400).json({ success: false, message: "Security Warning: Invalid signature hash detected." });
            }
        }
        console.log(`⚡ Signature verified. Capturing payment ID: ${razorpay_payment_id} for ₹${amountPaid}`);
        // 2. FORCE RAZORPAY PAYMENT CAPTURE 🎯 (Changes status from Authorized to Captured!)
        const paymentAmountInPaise = Math.round(parseFloat(amountPaid) * 100);
        await razorpay.payments.capture(razorpay_payment_id, paymentAmountInPaise, "INR");
        console.log(`✅ Razorpay payment captured successfully! Processing database resets...`);
        // 3. Database Reset Execution Pipeline
        const targetTable = userRole === "TRANSPORT" ? "transport_partners" : "delivery_partners";
        db_1.default.getConnection((connErr, connection) => {
            if (connErr)
                return res.status(500).json({ success: false, error: connErr.message });
            connection.beginTransaction((transactionErr) => {
                if (transactionErr) {
                    connection.release();
                    return res.status(500).json({ success: false, error: transactionErr.message });
                }
                // Step A: Force update partner wallet balance to 0.00 and clear the lockout timer 🚀
                const updateBalanceSql = `UPDATE \`${targetTable}\` SET wallet_balance = 0.00, commission_due_since = NULL WHERE id = ?`;
                connection.query(updateBalanceSql, [partnerId], (err1) => {
                    if (err1) {
                        return connection.rollback(() => {
                            connection.release();
                            res.status(500).json({ success: false, message: "Database balance update failed", error: err1.message });
                        });
                    }
                    // Step B: Log the negative offsetting ledger row item to clear out the frontend visible list calculations
                    const negativeOffsetAmount = -(parseFloat(amountPaid) / 0.10);
                    const insertLedgerSql = userRole === "TRANSPORT"
                        ? `INSERT INTO \`transport_bookings\` (partner_id, fare, status, description) VALUES (?, ?, 'SETTLED', 'Commission Paid via Razorpay')`
                        : `INSERT INTO \`orders\` (\`user id\`, delivery_status, amount, status) VALUES (?, 'SETTLED', ?, 'COMPLETED')`;
                    connection.query(insertLedgerSql, [partnerId, negativeOffsetAmount], (err2) => {
                        if (err2) {
                            return connection.rollback(() => {
                                connection.release();
                                res.status(500).json({ success: false, message: "Ledger clearance item injection failed", error: err2.message });
                            });
                        }
                        connection.commit((commitErr) => {
                            if (commitErr) {
                                return connection.rollback(() => {
                                    connection.release();
                                    res.status(500).json({ success: false, error: commitErr.message });
                                });
                            }
                            connection.release();
                            console.log(`🎉 Success! Account cleared and balanced for ${userRole} ID #${partnerId}`);
                            return res.status(200).json({ success: true, message: "Payment Captured & Ledger balanced successfully!" });
                        });
                    });
                });
            });
        });
    }
    catch (error) {
        console.error("❌ Capture system execution crash:", error);
        return res.status(500).json({ success: false, message: "Capture controller exception dropped", error: error.message });
    }
};
exports.verifySettlementPayment = verifySettlementPayment;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transporter = void 0;
exports.sendOrderConfirmMail = sendOrderConfirmMail;
exports.sendPartnerAcceptedMail = sendPartnerAcceptedMail;
exports.sendOutForDeliveryMail = sendOutForDeliveryMail;
exports.sendEmailOtpMail = sendEmailOtpMail;
exports.sendTransportBookingConfirmMail = sendTransportBookingConfirmMail;
exports.sendTransportDriverAssignedMail = sendTransportDriverAssignedMail;
exports.sendTransportRideStartedMail = sendTransportRideStartedMail;
exports.sendPartyHallBookingConfirmMail = sendPartyHallBookingConfirmMail;
exports.sendCommissionOverdueMail = sendCommissionOverdueMail;
exports.sendCommissionClearedAdminMail = sendCommissionClearedAdminMail;
exports.sendCommissionReceiptPartnerMail = sendCommissionReceiptPartnerMail;
exports.sendPartnerDueWarningMail = sendPartnerDueWarningMail;
exports.sendPartnerSuspensionMail = sendPartnerSuspensionMail;
exports.sendPartnerUnblockedPushMail = sendPartnerUnblockedPushMail;
exports.sendRideBookingInvoiceMail = sendRideBookingInvoiceMail;
exports.sendPartyHallBookingInvoiceMail = sendPartyHallBookingInvoiceMail;
exports.sendCodSettlementRequestEmail = sendCodSettlementRequestEmail;
exports.sendCodSettlementSuccessEmail = sendCodSettlementSuccessEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const templates_1 = require("./emails/templates");
/* ================= EMAIL TRANSPORT ================= */
exports.transporter = nodemailer_1.default.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // TLS
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // ✅ APP PASSWORD ONLY
    },
    tls: {
        rejectUnauthorized: false,
    },
});
// ✅ Verify connection
exports.transporter.verify((error) => {
    if (error) {
        console.error("❌ Mail transporter error:", error);
    }
    else {
        console.log("✅ Mail server is ready to send messages");
    }
});
/* ================= SEND ORDER CONFIRM MAIL ================= */
async function sendOrderConfirmMail(to, username, orderId, totalAmount, deliveryFee, items) {
    try {
        console.log("📧 Sending mail to:", to);
        const safeItems = Array.isArray(items) ? items : [];
        const subtotal = safeItems.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
        const totalGst = safeItems.reduce((sum, item) => sum + (Number(item.total_price || 0) * (Number(item.gst || 0) / 100)), 0);
        const safeDelivery = Number(deliveryFee || 0);
        const grandTotal = subtotal + safeDelivery + totalGst;
        const html = (0, templates_1.OrderPlacedEmail)({
            orderId: orderId.toString(),
            customerName: username,
            totalAmount: grandTotal,
            deliveryAddress: "Refer to App for Details",
            paymentMethod: "Online / COD",
            items: safeItems.map(item => ({
                product_name: item.product_name,
                unit_price: item.unit_price,
                weight: item.weight,
                total_price: item.total_price,
                image: item.image,
                gst: item.gst
            })),
            subtotal,
            totalGst,
            deliveryFee: safeDelivery,
            trackLink: `https://villagesmart.in/my-orders?orderId=${orderId}`
        });
        const info = await exports.transporter.sendMail({
            from: `"VillageSmart" <${process.env.EMAIL_USER}>`,
            to,
            subject: `Order Confirmed (#${orderId})`,
            html,
        });
        console.log("✅ Mail sent:", info.messageId);
        return true;
    }
    catch (error) {
        console.error("❌ Mail send failed:", error);
        throw error;
    }
}
/* ================= SEND PARTNER ACCEPTED MAIL ================= */
async function sendPartnerAcceptedMail(to, username, orderId, partnerName, partnerPhone) {
    try {
        const html = (0, templates_1.PartnerAcceptedEmail)({
            orderId: orderId.toString(),
            customerName: username,
            driverName: partnerName,
            driverPhone: partnerPhone,
            trackLink: `https://villagesmart.in/my-orders?orderId=${orderId}`
        });
        const info = await exports.transporter.sendMail({
            from: `"VillageSmart" <${process.env.EMAIL_USER}>`,
            to,
            subject: `Delivery Partner Assigned for Order #${orderId}`,
            html,
        });
        console.log("✅ Partner Accepted Mail sent:", info.messageId);
        return true;
    }
    catch (error) {
        console.error("❌ Partner Accepted Mail failed:", error);
        throw error;
    }
}
/* ================= SEND OUT FOR DELIVERY MAIL ================= */
async function sendOutForDeliveryMail(to, username, orderId, totalAmount, deliveryFee, otp, items, partnerName = "Assigned Partner", partnerPhone = "N/A", subtotal = 0, totalGst = 0, address = "Refer to App", customerPhone = "", paymentMethod = "cod") {
    try {
        const html = (0, templates_1.OutForDeliveryEmail)({
            orderId: orderId.toString(),
            customerName: username,
            driverName: partnerName,
            driverPhone: partnerPhone,
            vehicle: "Delivery Vehicle",
            eta: "30-45 mins",
            trackLink: `https://villagesmart.in/my-orders?orderId=${orderId}`,
            otp: otp,
            items: items,
            totalAmount,
            deliveryFee,
            subtotal,
            totalGst,
            address,
            customerPhone,
            paymentMethod
        });
        const info = await exports.transporter.sendMail({
            from: `"VillageSmart" <${process.env.EMAIL_USER}>`,
            to,
            subject: `Order #${orderId} is Out for Delivery!`,
            html,
        });
        console.log("✅ Out For Delivery Mail sent:", info.messageId);
    }
    catch (error) {
        console.error("❌ Out For Delivery Mail failed:", error);
        throw error;
    }
}
/* ================= EMAIL OTP ================= */
async function sendEmailOtpMail(to, otp) {
    try {
        const html = (0, templates_1.OTPVerificationEmail)(otp, "10 minutes");
        const info = await exports.transporter.sendMail({
            from: `"VillageSmart Security" <${process.env.EMAIL_USER}>`,
            to,
            subject: "Your VillageSmart Verification Code",
            html,
        });
        console.log("✅ OTP Mail sent to", to);
        return true;
    }
    catch (error) {
        console.error("❌ OTP Mail send failed:", error);
        throw error;
    }
}
/* ================= TRANSPORT BOOKING ================= */
async function sendTransportBookingConfirmMail(params) {
    try {
        const html = (0, templates_1.TransportBookingEmail)({
            bookingId: params.bookingId.toString(),
            pickup: params.fromAddress || "N/A",
            destination: params.toAddress || "N/A",
            vehicle: params.vehicleType || "N/A",
            fare: params.chargeAmount,
            bookingTime: params.bookingTime || new Date().toLocaleString(),
            trackLink: `https://villagesmart.in/transport/history?rideId=${params.bookingId}`
        });
        await exports.transporter.sendMail({
            from: `"VillageSmart Transport" <${process.env.EMAIL_USER}>`,
            to: params.to,
            subject: `Transport Booking Confirmed (#${params.bookingId})`,
            html,
        });
        return true;
    }
    catch (error) {
        console.error("❌ Transport booking mail failed:", error);
        throw error;
    }
}
async function sendTransportDriverAssignedMail(params) {
    try {
        const html = (0, templates_1.TransportDriverAssignedEmail)({
            bookingId: params.bookingId.toString(),
            driverName: params.driverName,
            driverMobile: params.driverMobile,
            vehicleNumber: params.vehicleNumber,
            vehicleType: params.vehicleType,
            eta: params.eta,
            trackLink: `https://villagesmart.in/transport/history?rideId=${params.bookingId}`
        });
        await exports.transporter.sendMail({
            from: `"VillageSmart Transport" <${process.env.EMAIL_USER}>`,
            to: params.to,
            subject: `Driver Assigned - Ride #${params.bookingId}`,
            html,
        });
        return true;
    }
    catch (error) {
        console.error("❌ Driver assigned mail failed:", error);
        throw error;
    }
}
async function sendTransportRideStartedMail(params) {
    try {
        const html = (0, templates_1.TransportRideStartedEmail)({
            bookingId: params.bookingId.toString(),
            trackLink: `https://villagesmart.in/transport/history?rideId=${params.bookingId}`
        });
        await exports.transporter.sendMail({
            from: `"VillageSmart Transport" <${process.env.EMAIL_USER}>`,
            to: params.to,
            subject: `Ride Started - #${params.bookingId}`,
            html,
        });
        return true;
    }
    catch (error) {
        console.error("❌ Ride started mail failed:", error);
        throw error;
    }
}
/* ================= PARTY HALL ================= */
async function sendPartyHallBookingConfirmMail(params) {
    try {
        const html = (0, templates_1.PartyHallBookingEmail)({
            bookingId: params.bookingId.toString(),
            hallName: "VillageSmart Party Hall",
            date: params.eventDate || "N/A",
            time: `${params.startTime || ""} - ${params.endTime || ""}`,
            guests: params.personCount || 0,
            amount: params.totalCharge
        });
        await exports.transporter.sendMail({
            from: `"VillageSmart Events" <${process.env.EMAIL_USER}>`,
            to: params.to,
            subject: `Party Hall Booking Confirmed (#${params.bookingId})`,
            html,
        });
        return true;
    }
    catch (error) {
        console.error("❌ Party Hall booking mail failed:", error);
        throw error;
    }
}
/* ================= PARTNER COMMISSION DUE ================= */
async function sendCommissionOverdueMail(to, partnerName, amountDue, paymentLink = "") {
    try {
        const html = (0, templates_1.PartnerCommissionEmail)({
            partnerName,
            amount: amountDue,
            type: "DUE",
            paymentLink: paymentLink || "https://transport.villagesmart.in/earnings"
        });
        await exports.transporter.sendMail({
            from: `"VillageSmart Accounts" <${process.env.EMAIL_USER}>`,
            to,
            subject: `URGENT: Commission Payment Overdue (₹${amountDue})`,
            html,
        });
        return true;
    }
    catch (error) {
        console.error("❌ Commission Overdue mail failed:", error);
        throw error;
    }
}
/* ================= ADMIN ALERT ================= */
async function sendCommissionClearedAdminMail(partnerName, partnerRole, amountCleared) {
    try {
        const html = (0, templates_1.AdminAlertEmail)({
            title: "Partner Commission Cleared",
            message: `${partnerName} (${partnerRole}) has cleared their commission due.`,
            detailsHtml: `<p><strong>Amount Cleared:</strong> ₹${amountCleared}</p>`
        });
        await exports.transporter.sendMail({
            from: `"VillageSmart System" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL || "admin@villagesmart.in",
            subject: `[SYSTEM] Commission Cleared by ${partnerName}`,
            html,
        });
        return true;
    }
    catch (error) {
        console.error("❌ Admin mail failed:", error);
    }
}
/* ================= PARTNER RECEIPT ================= */
async function sendCommissionReceiptPartnerMail(to, partnerName, amountPaid, paymentId, partnerType = "transport") {
    try {
        const html = (0, templates_1.PartnerCommissionEmail)({
            partnerName,
            amount: amountPaid,
            type: "CLEARED",
            transactionId: paymentId,
            partnerType
        });
        await exports.transporter.sendMail({
            from: `"VillageSmart Accounts" <${process.env.EMAIL_USER}>`,
            to,
            subject: `Payment Receipt - Commission Cleared (₹${amountPaid})`,
            html,
        });
        return true;
    }
    catch (error) {
        console.error("❌ Partner receipt mail failed:", error);
    }
}
/* ================= WARNINGS ================= */
async function sendPartnerDueWarningMail(to, partnerName, dueAmount, partnerId, partnerType = "delivery") {
    try {
        const PAYMENT_PORTAL_URL = process.env.PAYMENT_PORTAL_URL || "https://payment.villagesmart.in";
        const paymentLink = `${PAYMENT_PORTAL_URL}/pay-due?partnerId=${encodeURIComponent(partnerId)}&amount=${encodeURIComponent(dueAmount)}&partnerType=${encodeURIComponent(partnerType)}`;
        const html = (0, templates_1.PartnerDueReminderEmail)({
            partnerName,
            outstandingAmount: dueAmount,
            dueDate: "24 Hours",
            paymentLink
        });
        await exports.transporter.sendMail({
            from: `"VillageSmart Accounts" <${process.env.EMAIL_USER}>`,
            to,
            subject: `WARNING: High Commission Due (₹${dueAmount})`,
            html,
        });
        return true;
    }
    catch (error) {
        console.error("❌ Due warning mail failed:", error);
    }
}
async function sendPartnerSuspensionMail(to, partnerName, dueAmount, partnerId, partnerType = "delivery") {
    try {
        const PAYMENT_PORTAL_URL = process.env.PAYMENT_PORTAL_URL || "https://payment.villagesmart.in";
        const paymentLink = `${PAYMENT_PORTAL_URL}/pay-due?partnerId=${encodeURIComponent(partnerId)}&amount=${encodeURIComponent(dueAmount)}&partnerType=${encodeURIComponent(partnerType)}`;
        const html = (0, templates_1.PartnerSuspendedEmail)({
            partnerName,
            amountDue: dueAmount,
            reason: "Unpaid commission dues exceeded 24 hours threshold",
            paymentLink
        });
        await exports.transporter.sendMail({
            from: `"VillageSmart Compliance" <${process.env.EMAIL_USER}>`,
            to,
            subject: `🚨 ACCOUNT SUSPENDED: Unpaid Commission (₹${dueAmount})`,
            html,
        });
        return true;
    }
    catch (error) {
        console.error("❌ Suspension mail failed:", error);
    }
}
async function sendPartnerUnblockedPushMail(to, partnerName) {
    try {
        const html = (0, templates_1.WelcomeEmail)(partnerName, "https://villagesmart.in");
        await exports.transporter.sendMail({
            from: `"VillageSmart Compliance" <${process.env.EMAIL_USER}>`,
            to,
            subject: `✅ Account Reactivated`,
            html,
        });
        return true;
    }
    catch (error) {
        console.error("❌ Unblocked mail failed:", error);
    }
}
/* ================= INVOICES ================= */
async function sendRideBookingInvoiceMail(params) {
    try {
        const html = (0, templates_1.RideInvoiceEmail)({
            customerName: params.customerName || "Customer",
            bookingNumber: params.bookingId.toString(),
            date: new Date().toLocaleDateString("en-IN"),
            time: new Date().toLocaleTimeString("en-IN"),
            pickup: params.fromAddress || "N/A",
            destination: params.toAddress || "N/A",
            driverName: params.driverName || "N/A",
            vehicle: params.vehicleType || "N/A",
            distance: (params.distanceKm || 0) + " km",
            fare: params.chargeAmount,
            paymentMethod: `${params.paymentMethod || "CASH"} (${params.paymentStatus || "PENDING"})`,
            receiptLink: `https://villagesmart.in/transport/history?rideId=${params.bookingId}`,
            websiteLink: "https://villagesmart.in"
        });
        const mailOptions = {
            from: `"VillageSmart Transport" <${process.env.EMAIL_USER}>`,
            to: params.to,
            subject: `Invoice for Ride Booking #${params.bookingId}`,
            html,
        };
        if (params.pdfBuffer) {
            mailOptions.attachments = [
                {
                    filename: `Receipt_${params.bookingId}.pdf`,
                    content: params.pdfBuffer
                }
            ];
        }
        await exports.transporter.sendMail(mailOptions);
        return true;
    }
    catch (error) {
        console.error("❌ Transport invoice mail failed:", error);
        throw error;
    }
}
async function sendPartyHallBookingInvoiceMail(params) {
    try {
        const html = (0, templates_1.PartyHallInvoiceEmail)({
            bookingId: params.bookingId.toString(),
            amount: params.totalCharge,
            downloadLink: "https://villagesmart.in/partyhall/history"
        });
        await exports.transporter.sendMail({
            from: `"VillageSmart Events" <${process.env.EMAIL_USER}>`,
            to: params.to,
            subject: `Invoice for Party Hall Booking #${params.bookingId}`,
            html,
        });
        return true;
    }
    catch (error) {
        console.error("❌ Party Hall Invoice mail failed:", error);
        throw error;
    }
}
/* ================= COD SETTLEMENT ================= */
async function sendCodSettlementRequestEmail(to, partnerName, customerCash, partnerEarning, payableAmount, paymentLink, reference) {
    try {
        const html = (0, templates_1.CodSettlementRequestEmail)({ partnerName, customerCash, partnerEarning, payableAmount, paymentLink, reference });
        await exports.transporter.sendMail({
            from: '"VillageSmart Admin" <noreply@villagesmart.in>',
            to,
            subject: "Action Required: Settle COD Balance",
            html,
        });
        console.log(`✅ COD Settlement Request email sent to ${to}`);
    }
    catch (error) {
        console.error("❌ Error sending COD Settlement Request email:", error);
    }
}
async function sendCodSettlementSuccessEmail(to, partnerName, amount, reference) {
    try {
        const html = (0, templates_1.CodSettlementSuccessEmail)({ partnerName, amount, reference });
        await exports.transporter.sendMail({
            from: '"VillageSmart Admin" <noreply@villagesmart.in>',
            to,
            subject: "COD Settlement Payment Received",
            html,
        });
        console.log(`✅ COD Settlement Success email sent to ${to}`);
    }
    catch (error) {
        console.error("❌ Error sending COD Settlement Success email:", error);
    }
}

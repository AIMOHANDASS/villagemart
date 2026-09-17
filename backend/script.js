const fs = require('fs');

const fileContent = `import nodemailer from "nodemailer";
import { OrderPlacedEmail, OutForDeliveryEmail } from "./emails/templates/shopping";
import { OTPVerificationEmail } from "./emails/templates/auth";
import { TransportBookingEmail, RideInvoiceEmail } from "./emails/templates/transport";
import { PartyHallBookingEmail, PartyHallInvoiceEmail } from "./emails/templates/partyhall";
import { AdminAlertEmail, PartnerCommissionEmail } from "./emails/templates/admin";

/* ================= EMAIL TRANSPORT ================= */

export const transporter = nodemailer.createTransport({
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
transporter.verify((error) => {
  if (error) {
    console.error("❌ Mail transporter error:", error);
  } else {
    console.log("✅ Mail server is ready to send messages");
  }
});

/* ================= TYPES ================= */

export interface OrderItem {
  product_name: string;
  unit_price: number;
  weight: number;
  total_price: number;
  image: string;
  gst?: number;
}

/* ================= SEND ORDER CONFIRM MAIL ================= */

export async function sendOrderConfirmMail(
  to: string,
  username: string,
  orderId: number,
  totalAmount: number,
  deliveryFee: number,
  items: OrderItem[]
) {
  try {
    console.log("📧 Sending mail to:", to);

    const safeItems = Array.isArray(items) ? items : [];
    const subtotal = safeItems.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
    const totalGst = safeItems.reduce((sum, item) => sum + (Number(item.total_price || 0) * (Number(item.gst || 0) / 100)), 0);
    const safeDelivery = Number(deliveryFee || 0);
    const grandTotal = subtotal + safeDelivery + totalGst;

    const itemsHtml = safeItems.length === 0
      ? \`<tr><td colspan="5" style="text-align:center;color:#999;padding:12px;">No items found</td></tr>\`
      : safeItems.map((item) => \`
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><img src="\${item.image}" width="40" style="border-radius:4px;" /></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size:14px;">\${item.product_name} (\${item.weight})</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size:14px; text-align:right;">₹\${item.total_price}</td>
          </tr>
        \`).join("");

    const html = OrderPlacedEmail({
      orderId: orderId.toString(),
      totalAmount: grandTotal,
      deliveryAddress: "Refer to App for Address", // Address isn't passed in params in this function
      paymentMethod: "Online / COD",
      itemsHtml: itemsHtml + \`
        <tr><td colspan="2" style="padding: 8px 0; font-size:14px; text-align:right; color:#6b7280;">Subtotal:</td><td style="padding: 8px 0; font-size:14px; text-align:right;">₹\${subtotal.toFixed(2)}</td></tr>
        <tr><td colspan="2" style="padding: 8px 0; font-size:14px; text-align:right; color:#6b7280;">GST:</td><td style="padding: 8px 0; font-size:14px; text-align:right;">₹\${totalGst.toFixed(2)}</td></tr>
        <tr><td colspan="2" style="padding: 8px 0; font-size:14px; text-align:right; color:#6b7280;">Delivery:</td><td style="padding: 8px 0; font-size:14px; text-align:right;">₹\${safeDelivery.toFixed(2)}</td></tr>
      \`,
      trackLink: \`https://villagesmart.in/orders/\${orderId}\`
    });

    const info = await transporter.sendMail({
      from: \`"VillageSmart" <\${process.env.EMAIL_USER}>\`,
      to,
      subject: \`Order Confirmed (#\${orderId})\`,
      html,
    });
    console.log("✅ Mail sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Mail send failed:", error);
    throw error;
  }
}

/* ================= SEND DELIVERY PARTNER ASSIGNED MAIL ================= */

export async function sendDeliveryPartnerAssignedMail(
  to: string,
  username: string,
  orderId: number,
  totalAmount: number,
  deliveryFee: number,
  items: OrderItem[],
  partnerName: string,
  partnerPhone: string
) {
  try {
    const html = OutForDeliveryEmail({
      orderId: orderId.toString(),
      driverName: partnerName,
      driverPhone: partnerPhone,
      vehicle: "Delivery Vehicle",
      eta: "30-45 mins",
      trackLink: \`https://villagesmart.in/orders/\${orderId}\`
    });

    const info = await transporter.sendMail({
      from: \`"VillageSmart" <\${process.env.EMAIL_USER}>\`,
      to,
      subject: \`Delivery Partner Assigned for Order #\${orderId}\`,
      html,
    });
    console.log("✅ Delivery Partner Mail sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Delivery Partner Mail failed:", error);
    throw error;
  }
}

/* ================= EMAIL OTP ================= */

export async function sendEmailOtpMail(to: string, otp: string) {
  try {
    const html = OTPVerificationEmail(otp, "10 minutes");
    const info = await transporter.sendMail({
      from: \`"VillageSmart Security" <\${process.env.EMAIL_USER}>\`,
      to,
      subject: "Your VillageSmart Verification Code",
      html,
    });
    console.log("✅ OTP Mail sent to", to);
    return true;
  } catch (error) {
    console.error("❌ OTP Mail send failed:", error);
    throw error;
  }
}

/* ================= TRANSPORT BOOKING ================= */

export async function sendTransportBookingConfirmMail(params: {
  to: string;
  username: string;
  bookingId: number;
  fromAddress?: string;
  toAddress?: string;
  distanceKm?: number;
  vehicleType?: string;
  chargeAmount: number;
  otpCode?: string;
}) {
  try {
    const html = TransportBookingEmail({
      bookingId: params.bookingId.toString(),
      pickup: params.fromAddress || "N/A",
      destination: params.toAddress || "N/A",
      vehicle: params.vehicleType || "N/A",
      fare: params.chargeAmount,
      trackLink: \`https://villagesmart.in/transport/\${params.bookingId}\`
    });

    const info = await transporter.sendMail({
      from: \`"VillageSmart Transport" <\${process.env.EMAIL_USER}>\`,
      to: params.to,
      subject: \`Transport Booking Confirmed (#\${params.bookingId})\`,
      html,
    });
    return true;
  } catch (error) {
    console.error("❌ Transport booking mail failed:", error);
    throw error;
  }
}

/* ================= PARTY HALL ================= */

export async function sendPartyHallBookingConfirmMail(params: {
  to: string;
  username: string;
  bookingId: number;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  personCount?: number;
  baseCharge?: number;
  addOnCharge?: number;
  totalCharge: number;
  supportNumber?: string;
}) {
  try {
    const html = PartyHallBookingEmail({
      bookingId: params.bookingId.toString(),
      hallName: "VillageSmart Party Hall",
      date: params.eventDate || "N/A",
      time: \`\${params.startTime || ""} - \${params.endTime || ""}\`,
      guests: params.personCount || 0,
      amount: params.totalCharge
    });

    const info = await transporter.sendMail({
      from: \`"VillageSmart Events" <\${process.env.EMAIL_USER}>\`,
      to: params.to,
      subject: \`Party Hall Booking Confirmed (#\${params.bookingId})\`,
      html,
    });
    return true;
  } catch (error) {
    console.error("❌ Party Hall booking mail failed:", error);
    throw error;
  }
}

/* ================= PARTNER COMMISSION DUE ================= */

export async function sendCommissionOverdueMail(to: string, partnerName: string, amountDue: number, paymentLink: string = "") {
  try {
    const html = PartnerCommissionEmail({
      partnerName,
      amount: amountDue,
      type: "DUE",
      paymentLink
    });

    const info = await transporter.sendMail({
      from: \`"VillageSmart Accounts" <\${process.env.EMAIL_USER}>\`,
      to,
      subject: \`URGENT: Commission Payment Overdue (₹\${amountDue})\`,
      html,
    });
    return true;
  } catch (error) {
    console.error("❌ Commission Overdue mail failed:", error);
    throw error;
  }
}

/* ================= ADMIN ALERT ================= */

export async function sendCommissionClearedAdminMail(partnerName: string, partnerRole: string, amountCleared: number) {
  try {
    const html = AdminAlertEmail({
      title: "Partner Commission Cleared",
      message: \`\${partnerName} (\${partnerRole}) has cleared their commission due.\`,
      detailsHtml: \`<p><strong>Amount Cleared:</strong> ₹\${amountCleared}</p>\`
    });

    const info = await transporter.sendMail({
      from: \`"VillageSmart System" <\${process.env.EMAIL_USER}>\`,
      to: process.env.ADMIN_EMAIL || "admin@villagesmart.in",
      subject: \`[SYSTEM] Commission Cleared by \${partnerName}\`,
      html,
    });
    return true;
  } catch (error) {
    console.error("❌ Admin mail failed:", error);
  }
}

/* ================= PARTNER RECEIPT ================= */

export async function sendCommissionReceiptPartnerMail(to: string, partnerName: string, amountPaid: number, paymentId: string) {
  try {
    const html = PartnerCommissionEmail({
      partnerName,
      amount: amountPaid,
      type: "CLEARED"
    });

    const info = await transporter.sendMail({
      from: \`"VillageSmart Accounts" <\${process.env.EMAIL_USER}>\`,
      to,
      subject: \`Payment Receipt - Commission Cleared (₹\${amountPaid})\`,
      html,
    });
    return true;
  } catch (error) {
    console.error("❌ Partner receipt mail failed:", error);
  }
}

/* ================= WARNINGS ================= */

export async function sendPartnerDueWarningMail(to: string, partnerName: string, dueAmount: number, partnerId: number, partnerType: string = "delivery") {
  try {
    const html = AdminAlertEmail({
      title: "Action Required: High Commission Due",
      message: \`Hello \${partnerName}, your commission due has reached ₹\${dueAmount}. Please clear it immediately to prevent suspension.\`
    });

    const info = await transporter.sendMail({
      from: \`"VillageSmart Accounts" <\${process.env.EMAIL_USER}>\`,
      to,
      subject: \`WARNING: High Commission Due (₹\${dueAmount})\`,
      html,
    });
    return true;
  } catch (error) {
    console.error("❌ Due warning mail failed:", error);
  }
}

export async function sendPartnerSuspensionMail(to: string, partnerName: string, dueAmount: number, partnerId: number, partnerType: string = "delivery") {
  try {
    const html = AdminAlertEmail({
      title: "Account Suspended",
      message: \`Hello \${partnerName}, your account has been temporarily suspended due to unpaid commissions of ₹\${dueAmount}. Please pay the dues to reactivate your account.\`
    });

    const info = await transporter.sendMail({
      from: \`"VillageSmart Compliance" <\${process.env.EMAIL_USER}>\`,
      to,
      subject: \`🚨 ACCOUNT SUSPENDED: Unpaid Commission (₹\${dueAmount})\`,
      html,
    });
    return true;
  } catch (error) {
    console.error("❌ Suspension mail failed:", error);
  }
}

export async function sendPartnerUnblockedPushMail(to: string, partnerName: string) {
  try {
    const html = AdminAlertEmail({
      title: "Account Reactivated",
      message: \`Hello \${partnerName}, your account has been reactivated. You can now receive new requests.\`
    });

    const info = await transporter.sendMail({
      from: \`"VillageSmart Compliance" <\${process.env.EMAIL_USER}>\`,
      to,
      subject: \`✅ Account Reactivated\`,
      html,
    });
    return true;
  } catch (error) {
    console.error("❌ Unblocked mail failed:", error);
  }
}

/* ================= INVOICES ================= */

export async function sendRideBookingInvoiceMail(params: {
  to: string;
  username: string;
  bookingId: number;
  fromAddress?: string;
  toAddress?: string;
  distanceKm?: number;
  vehicleType?: string;
  chargeAmount: number;
  otpCode?: string;
}) {
  try {
    const html = RideInvoiceEmail({
      rideId: params.bookingId.toString(),
      amount: params.chargeAmount,
      downloadLink: "https://villagesmart.in/transport/history"
    });

    const info = await transporter.sendMail({
      from: \`"VillageSmart Transport" <\${process.env.EMAIL_USER}>\`,
      to: params.to,
      subject: \`Invoice for Ride Booking #\${params.bookingId}\`,
      html,
      // Note: Assuming the controller generates pdfBuffer somehow, if not we ignore attachments.
      // Or maybe the controller didn't pass pdfBuffer in the old version! 
      // The grep earlier didn't show pdfBuffer in params. Let's omit it for safety.
    });
    return true;
  } catch (error) {
    console.error("❌ Ride Invoice mail failed:", error);
    throw error;
  }
}

export async function sendPartyHallBookingInvoiceMail(params: {
  to: string;
  username: string;
  bookingId: number;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  personCount?: number;
  baseCharge?: number;
  addOnCharge?: number;
  totalCharge: number;
  supportNumber?: string;
}) {
  try {
    const html = PartyHallInvoiceEmail({
      bookingId: params.bookingId.toString(),
      amount: params.totalCharge,
      downloadLink: "https://villagesmart.in/partyhall/history"
    });

    const info = await transporter.sendMail({
      from: \`"VillageSmart Events" <\${process.env.EMAIL_USER}>\`,
      to: params.to,
      subject: \`Invoice for Party Hall Booking #\${params.bookingId}\`,
      html,
    });
    return true;
  } catch (error) {
    console.error("❌ Party Hall Invoice mail failed:", error);
    throw error;
  }
}
`;

fs.writeFileSync('d:/villagemart-mainuichages - Copy/backend/src/utils/mailer.ts', fileContent);
console.log("mailer.ts successfully rewritten!");

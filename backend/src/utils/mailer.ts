import nodemailer from "nodemailer";
import { 
  WelcomeEmail, 
  OTPVerificationEmail, 
  PasswordResetEmail,
  OrderPlacedEmail, 
  OrderConfirmedEmail,
  OutForDeliveryEmail, 
  PartnerAcceptedEmail,
  OrderDeliveredEmail,
  TransportBookingEmail, 
  TransportDriverAssignedEmail, 
  TransportRideStartedEmail, 
  RideInvoiceEmail,
  RideCancelledEmail,
  PartyHallBookingEmail, 
  PartyHallInvoiceEmail,
  AdminAlertEmail, 
  PartnerCommissionEmail,
  PartnerApprovedEmail,
  PartnerRejectedEmail,
  PartnerSuspendedEmail,
  PartnerDueReminderEmail,
  PaymentSuccessfulEmail,
  CodSettlementRequestEmail,
  CodSettlementSuccessEmail
} from "./emails/templates";

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

    const html = OrderPlacedEmail({
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

    const info = await transporter.sendMail({
      from: `"VillageSmart" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Order Confirmed (#${orderId})`,
      html,
    });
    console.log("✅ Mail sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Mail send failed:", error);
    throw error;
  }
}

/* ================= SEND PARTNER ACCEPTED MAIL ================= */

export async function sendPartnerAcceptedMail(
  to: string,
  username: string,
  orderId: number,
  partnerName: string,
  partnerPhone: string,
) {
  try {
    const html = PartnerAcceptedEmail({
      orderId: orderId.toString(),
      customerName: username,
      driverName: partnerName,
      driverPhone: partnerPhone,
      trackLink: `https://villagesmart.in/my-orders?orderId=${orderId}`
    });

    const info = await transporter.sendMail({
      from: `"VillageSmart" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Delivery Partner Assigned for Order #${orderId}`,
      html,
    });
    console.log("✅ Partner Accepted Mail sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Partner Accepted Mail failed:", error);
    throw error;
  }
}

/* ================= SEND OUT FOR DELIVERY MAIL ================= */

export async function sendOutForDeliveryMail(
  to: string,
  username: string,
  orderId: number,
  totalAmount: number,
  deliveryFee: number,
  otp: string,
  items: OrderItem[],
  partnerName: string = "Assigned Partner",
  partnerPhone: string = "N/A",
  subtotal: number = 0,
  totalGst: number = 0,
  address: string = "Refer to App",
  customerPhone: string = "",
  paymentMethod: string = "cod"
) {
  try {
    const html = OutForDeliveryEmail({
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

    const info = await transporter.sendMail({
      from: `"VillageSmart" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Order #${orderId} is Out for Delivery!`,
      html,
    });
    console.log("✅ Out For Delivery Mail sent:", info.messageId);
  } catch (error) {
    console.error("❌ Out For Delivery Mail failed:", error);
    throw error;
  }
}

/* ================= EMAIL OTP ================= */

export async function sendEmailOtpMail(to: string, otp: string) {
  try {
    const html = OTPVerificationEmail(otp, "10 minutes");
    const info = await transporter.sendMail({
      from: `"VillageSmart Security" <${process.env.EMAIL_USER}>`,
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
  vehicleType?: string;
  chargeAmount: number;
  bookingTime?: string;
}) {
  try {
    const html = TransportBookingEmail({
      bookingId: params.bookingId.toString(),
      pickup: params.fromAddress || "N/A",
      destination: params.toAddress || "N/A",
      vehicle: params.vehicleType || "N/A",
      fare: params.chargeAmount,
      bookingTime: params.bookingTime || new Date().toLocaleString(),
      trackLink: `https://villagesmart.in/transport/history?rideId=${params.bookingId}`
    });

    await transporter.sendMail({
      from: `"VillageSmart Transport" <${process.env.EMAIL_USER}>`,
      to: params.to,
      subject: `Transport Booking Confirmed (#${params.bookingId})`,
      html,
    });
    return true;
  } catch (error) {
    console.error("❌ Transport booking mail failed:", error);
    throw error;
  }
}

export async function sendTransportDriverAssignedMail(params: {
  to: string;
  bookingId: number;
  driverName: string;
  driverMobile: string;
  vehicleNumber: string;
  vehicleType: string;
  eta: string;
}) {
  try {
    const html = TransportDriverAssignedEmail({
      bookingId: params.bookingId.toString(),
      driverName: params.driverName,
      driverMobile: params.driverMobile,
      vehicleNumber: params.vehicleNumber,
      vehicleType: params.vehicleType,
      eta: params.eta,
      trackLink: `https://villagesmart.in/transport/history?rideId=${params.bookingId}`
    });

    await transporter.sendMail({
      from: `"VillageSmart Transport" <${process.env.EMAIL_USER}>`,
      to: params.to,
      subject: `Driver Assigned - Ride #${params.bookingId}`,
      html,
    });
    return true;
  } catch (error) {
    console.error("❌ Driver assigned mail failed:", error);
    throw error;
  }
}

export async function sendTransportRideStartedMail(params: {
  to: string;
  bookingId: number;
}) {
  try {
    const html = TransportRideStartedEmail({
      bookingId: params.bookingId.toString(),
      trackLink: `https://villagesmart.in/transport/history?rideId=${params.bookingId}`
    });

    await transporter.sendMail({
      from: `"VillageSmart Transport" <${process.env.EMAIL_USER}>`,
      to: params.to,
      subject: `Ride Started - #${params.bookingId}`,
      html,
    });
    return true;
  } catch (error) {
    console.error("❌ Ride started mail failed:", error);
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
      time: `${params.startTime || ""} - ${params.endTime || ""}`,
      guests: params.personCount || 0,
      amount: params.totalCharge
    });

    await transporter.sendMail({
      from: `"VillageSmart Events" <${process.env.EMAIL_USER}>`,
      to: params.to,
      subject: `Party Hall Booking Confirmed (#${params.bookingId})`,
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
      paymentLink: paymentLink || "https://transport.villagesmart.in/earnings"
    });

    await transporter.sendMail({
      from: `"VillageSmart Accounts" <${process.env.EMAIL_USER}>`,
      to,
      subject: `URGENT: Commission Payment Overdue (₹${amountDue})`,
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
      message: `${partnerName} (${partnerRole}) has cleared their commission due.`,
      detailsHtml: `<p><strong>Amount Cleared:</strong> ₹${amountCleared}</p>`
    });

    await transporter.sendMail({
      from: `"VillageSmart System" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || "admin@villagesmart.in",
      subject: `[SYSTEM] Commission Cleared by ${partnerName}`,
      html,
    });
    return true;
  } catch (error) {
    console.error("❌ Admin mail failed:", error);
  }
}

/* ================= PARTNER RECEIPT ================= */

export async function sendCommissionReceiptPartnerMail(to: string, partnerName: string, amountPaid: number, paymentId: string, partnerType: "transport" | "delivery" = "transport") {
  try {
    const html = PartnerCommissionEmail({
      partnerName,
      amount: amountPaid,
      type: "CLEARED",
      transactionId: paymentId,
      partnerType
    });

    await transporter.sendMail({
      from: `"VillageSmart Accounts" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Payment Receipt - Commission Cleared (₹${amountPaid})`,
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
    const PAYMENT_PORTAL_URL = process.env.PAYMENT_PORTAL_URL || "https://payment.villagesmart.in";
    const paymentLink = `${PAYMENT_PORTAL_URL}/pay-due?partnerId=${encodeURIComponent(partnerId)}&amount=${encodeURIComponent(dueAmount)}&partnerType=${encodeURIComponent(partnerType)}`;

    const html = PartnerDueReminderEmail({
      partnerName,
      outstandingAmount: dueAmount,
      dueDate: "24 Hours",
      paymentLink
    });

    await transporter.sendMail({
      from: `"VillageSmart Accounts" <${process.env.EMAIL_USER}>`,
      to,
      subject: `WARNING: High Commission Due (₹${dueAmount})`,
      html,
    });
    return true;
  } catch (error) {
    console.error("❌ Due warning mail failed:", error);
  }
}

export async function sendPartnerSuspensionMail(to: string, partnerName: string, dueAmount: number, partnerId: number, partnerType: string = "delivery") {
  try {
    const PAYMENT_PORTAL_URL = process.env.PAYMENT_PORTAL_URL || "https://payment.villagesmart.in";
    const paymentLink = `${PAYMENT_PORTAL_URL}/pay-due?partnerId=${encodeURIComponent(partnerId)}&amount=${encodeURIComponent(dueAmount)}&partnerType=${encodeURIComponent(partnerType)}`;

    const html = PartnerSuspendedEmail({
      partnerName,
      amountDue: dueAmount,
      reason: "Unpaid commission dues exceeded 24 hours threshold",
      paymentLink
    });

    await transporter.sendMail({
      from: `"VillageSmart Compliance" <${process.env.EMAIL_USER}>`,
      to,
      subject: `🚨 ACCOUNT SUSPENDED: Unpaid Commission (₹${dueAmount})`,
      html,
    });
    return true;
  } catch (error) {
    console.error("❌ Suspension mail failed:", error);
  }
}

export async function sendPartnerUnblockedPushMail(to: string, partnerName: string) {
  try {
    const html = WelcomeEmail(partnerName, "https://villagesmart.in");

    await transporter.sendMail({
      from: `"VillageSmart Compliance" <${process.env.EMAIL_USER}>`,
      to,
      subject: `✅ Account Reactivated`,
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
  customerName: string;
  bookingId: number;
  fromAddress?: string;
  toAddress?: string;
  distanceKm?: number;
  vehicleType?: string;
  driverName?: string;
  chargeAmount: number;
  paymentMethod?: string;
  paymentStatus?: string;
  pdfBuffer?: Buffer;
}) {
  try {
    const html = RideInvoiceEmail({
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

    const mailOptions: any = {
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

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("❌ Transport invoice mail failed:", error);
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

    await transporter.sendMail({
      from: `"VillageSmart Events" <${process.env.EMAIL_USER}>`,
      to: params.to,
      subject: `Invoice for Party Hall Booking #${params.bookingId}`,
      html,
    });
    return true;
  } catch (error) {
    console.error("❌ Party Hall Invoice mail failed:", error);
    throw error;
  }
}

/* ================= COD SETTLEMENT ================= */

export async function sendCodSettlementRequestEmail(to: string, partnerName: string, customerCash: number, partnerEarning: number, payableAmount: number, paymentLink: string, reference: string) {
  try {
    const html = CodSettlementRequestEmail({ partnerName, customerCash, partnerEarning, payableAmount, paymentLink, reference });
    await transporter.sendMail({
      from: '"VillageSmart Admin" <noreply@villagesmart.in>',
      to,
      subject: "Action Required: Settle COD Balance",
      html,
    });
    console.log(`✅ COD Settlement Request email sent to ${to}`);
  } catch (error) {
    console.error("❌ Error sending COD Settlement Request email:", error);
  }
}

export async function sendCodSettlementSuccessEmail(to: string, partnerName: string, amount: number, reference: string) {
  try {
    const html = CodSettlementSuccessEmail({ partnerName, amount, reference });
    await transporter.sendMail({
      from: '"VillageSmart Admin" <noreply@villagesmart.in>',
      to,
      subject: "COD Settlement Payment Received",
      html,
    });
    console.log(`✅ COD Settlement Success email sent to ${to}`);
  } catch (error) {
    console.error("❌ Error sending COD Settlement Success email:", error);
  }
}

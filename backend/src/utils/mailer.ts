import nodemailer from "nodemailer";

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

    const subtotal = safeItems.reduce(
      (sum, item) => sum + Number(item.total_price || 0),
      0
    );

    const safeDelivery = Number(deliveryFee || 0);
    const grandTotal = subtotal + safeDelivery;

    const itemsHtml =
      safeItems.length === 0
        ? `
        <tr>
          <td colspan="5" style="text-align:center;color:#999;padding:12px;">
            No items found
          </td>
        </tr>`
        : safeItems
            .map(
              (item) => `
        <tr>
          <td><img src="${item.image}" width="60"/></td>
          <td>${item.product_name}</td>
          <td>₹${item.unit_price}</td>
          <td>${item.weight} kg</td>
          <td>₹${item.total_price}</td>
        </tr>`
            )
            .join("");

    const html = `
      <h2>✅ Order Confirmed - VillageMart</h2>
      <p>Hello ${username},</p>
      <p>Your order <b>#${orderId}</b> is confirmed.</p>

      <table border="1" cellpadding="6" cellspacing="0">
        <tr>
          <th>Image</th>
          <th>Product</th>
          <th>Unit Price</th>
          <th>Weight</th>
          <th>Total</th>
        </tr>
        ${itemsHtml}
      </table>

      <p>Subtotal: ₹${subtotal}</p>
      <p>Delivery Fee: ₹${safeDelivery}</p>
      <h3>Grand Total: ₹${grandTotal}</h3>

      <p>Thank you for shopping with VillageMart.</p>
    `;

    const info = await transporter.sendMail({
      from: `"VillageMart" <${process.env.EMAIL_USER}>`,
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
    const safeItems = Array.isArray(items) ? items : [];

    const subtotal = safeItems.reduce(
      (sum, item) => sum + Number(item.total_price || 0),
      0
    );

    const safeDelivery = Number(deliveryFee || 0);
    const grandTotal = subtotal + safeDelivery;

    const itemsHtml =
      safeItems.length === 0
        ? `
        <tr>
          <td colspan="5" style="text-align:center;color:#999;padding:12px;">
            No items found
          </td>
        </tr>`
        : safeItems
            .map(
              (item) => `
        <tr>
          <td><img src="${item.image}" width="60"/></td>
          <td>${item.product_name}</td>
          <td>₹${item.unit_price}</td>
          <td>${item.weight} kg</td>
          <td>₹${item.total_price}</td>
        </tr>`
            )
            .join("");

    const html = `
      <h2>🚚 Delivery Partner Assigned - VillageMart</h2>
      <p>Hello ${username},</p>
      <p>Great news! A delivery partner has accepted your order <b>#${orderId}</b> and is preparing for pickup.</p>
      
      <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #bbf7d0;">
        <h3 style="margin-top: 0; color: #166534;">Delivery Partner Details</h3>
        <p style="margin: 5px 0;"><b>Name:</b> ${partnerName}</p>
        <p style="margin: 5px 0;"><b>Mobile:</b> ${partnerPhone}</p>
      </div>

      <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse;">
        <tr style="background-color: #f8fafc;">
          <th>Image</th>
          <th>Product</th>
          <th>Unit Price</th>
          <th>Weight</th>
          <th>Total</th>
        </tr>
        ${itemsHtml}
      </table>

      <p>Subtotal: ₹${subtotal}</p>
      <p>Delivery Fee: ₹${safeDelivery}</p>
      <h3>Grand Total: ₹${grandTotal}</h3>

      <p>You can track your order status in the app.</p>
      <p>Thank you for shopping with VillageMart.</p>
    `;

    const info = await transporter.sendMail({
      from: `"VillageMart" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Delivery Partner Assigned for Order #${orderId}`,
      html,
    });

    console.log("✅ Delivery Partner Assigned Mail sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Delivery Partner Assigned Mail send failed:", error);
    // Don't throw to prevent blocking the main flow
  }
}

/* ================= SEND EMAIL OTP (✅ ADDED) ================= */

export async function sendEmailOtpMail(
  to: string,
  otp: string
) {
  try {
    console.log("📧 Sending Email OTP to:", to);

    const html = `
      <div style="font-family:Arial;padding:20px;">
        <h2 style="color:#2563eb;">VillageMart Email Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing:4px;">${otp}</h1>
        <p>This OTP is valid for 5 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr/>
        <small>VillageMart Security System</small>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"VillageMart" <${process.env.EMAIL_USER}>`,
      to,
      subject: "VillageMart Email Verification OTP",
      html,
    });

    console.log("✅ Email OTP sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Email OTP send failed:", error);
    throw error;
  }
}


export async function sendTransportBookingConfirmMail(params: {
  to: string;
  username: string;
  bookingId: number;
  fromAddress: string;
  toAddress: string;
  distanceKm: number;
  chargeAmount: number;
}) {
  const html = `
    <h2>✅ Transport Booking Confirmed - VillageMart</h2>
    <p>Hello ${params.username},</p>
    <p>Your transport booking <b>#${params.bookingId}</b> has been confirmed by admin.</p>
    <p><b>From:</b> ${params.fromAddress}</p>
    <p><b>To:</b> ${params.toAddress}</p>
    <p><b>Distance:</b> ${Number(params.distanceKm || 0).toFixed(2)} km</p>
    <p><b>Charge:</b> ₹${Number(params.chargeAmount || 0).toFixed(2)}</p>
    <p>Thank you for using VillageMart Transport.</p>
  `;

  return transporter.sendMail({
    from: `"VillageMart" <${process.env.EMAIL_USER}>`,
    to: params.to,
    subject: `Transport Booking Confirmed (#${params.bookingId})`,
    html,
  });
}

export async function sendPartyHallBookingConfirmMail(params: {
  to: string;
  username: string;
  bookingId: number;
  eventDate: string;
  startTime: string;
  endTime: string;
  personCount: number;
  totalCharge: number;
  supportNumber: string;
}) {
  const html = `
    <h2>✅ Party Hall Booking Confirmed - VillageMart</h2>
    <p>Hello ${params.username},</p>
    <p>Your party hall booking <b>#${params.bookingId}</b> has been confirmed by admin.</p>
    <p><b>Date:</b> ${params.eventDate}</p>
    <p><b>Time:</b> ${params.startTime} - ${params.endTime}</p>
    <p><b>Persons:</b> ${Number(params.personCount || 0)}</p>
    <p><b>Total Charge:</b> ₹${Number(params.totalCharge || 0).toFixed(2)}</p>
    <p>For clarification: ${params.supportNumber}</p>
    <p>Thank you for choosing VillageMart.</p>
  `;

  return transporter.sendMail({
    from: `"VillageMart" <${process.env.EMAIL_USER}>`,
    to: params.to,
    subject: `Party Hall Booking Confirmed (#${params.bookingId})`,
    html,
  });
}

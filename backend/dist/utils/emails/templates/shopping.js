"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderDeliveredEmail = exports.OutForDeliveryEmail = exports.PartnerAcceptedEmail = exports.OrderConfirmedEmail = exports.OrderPlacedEmail = void 0;
const components_1 = require("../components");
const OrderPlacedEmail = (params) => {
    const formattedDate = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
    const detailsRows = [
        { key: "Order Number", value: `#${params.orderId}` },
        { key: "Order Date", value: formattedDate },
        { key: "Customer Name", value: params.customerName },
        { key: "Payment Method", value: params.paymentMethod },
        { key: "Delivery Address", value: params.deliveryAddress },
        { key: "Estimated Delivery", value: params.estimatedDelivery || "Within 24-48 Hours" }
    ];
    const content = `
        ${(0, components_1.EmailHeader)("Order Placed")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${(0, components_1.StatusBanner)("success", "Order Placed Successfully", "We have received your order and are preparing it")}
                
                ${(0, components_1.Heading)("Order Information", 3, "left")}
                ${(0, components_1.KeyValueTable)(detailsRows)}

                <div style="margin: 24px 0; border-top: 1px solid #e2e8f0; padding-top: 24px;" class="border-divider">
                    ${(0, components_1.Heading)("Items Ordered", 3, "left")}
                    ${(0, components_1.OrderTable)(params.items, params.deliveryFee, params.subtotal, params.totalGst, params.totalAmount)}
                </div>

                <div style="margin-top: 32px; text-align: center;">
                    ${(0, components_1.PrimaryButton)("Track Order Status", params.trackLink, "center")}
                </div>
            </td>
        </tr>
        ${(0, components_1.EmailFooter)()}
    `;
    return (0, components_1.EmailLayout)(content, `Order Confirmed - #${params.orderId}`);
};
exports.OrderPlacedEmail = OrderPlacedEmail;
const OrderConfirmedEmail = (params) => {
    const details = [
        { key: "Order ID", value: `#${params.orderId}` },
        { key: "Payment Status", value: params.paymentStatus },
        { key: "Expected Delivery", value: params.expectedDelivery }
    ];
    const invoiceBtn = params.invoiceUrl ? `
        <div style="margin-top: 16px; text-align: center;">
            <a href="${params.invoiceUrl}" target="_blank" style="font-size: 14px; font-weight: 700; color: #16a34a; text-decoration: underline;">
                Download Invoice PDF
            </a>
        </div>
    ` : '';
    const content = `
        ${(0, components_1.EmailHeader)("Order Confirmed")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${(0, components_1.StatusBanner)("success", "Order Confirmed by Store", "Your payment is processed and order is being packed")}
                
                ${(0, components_1.Heading)("Confirmation Details", 3, "left")}
                ${(0, components_1.KeyValueTable)(details)}
                
                ${invoiceBtn}

                <div style="margin-top: 32px; text-align: center;">
                    ${(0, components_1.PrimaryButton)("View Order Dashboard", "https://villagesmart.in/my-orders", "center")}
                </div>
            </td>
        </tr>
        ${(0, components_1.EmailFooter)()}
    `;
    return (0, components_1.EmailLayout)(content, `Order Confirmed - #${params.orderId}`);
};
exports.OrderConfirmedEmail = OrderConfirmedEmail;
const PartnerAcceptedEmail = (params) => {
    const details = [
        { key: "Order ID", value: `#${params.orderId}` },
        { key: "Assigned To", value: params.driverName },
        { key: "Partner Contact", value: params.driverPhone }
    ];
    const content = `
        ${(0, components_1.EmailHeader)("Delivery Partner Assigned")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${(0, components_1.StatusBanner)("info", "Partner Assigned", "Your order has been accepted by a delivery partner and is being prepared for pickup.")}
                
                ${(0, components_1.Heading)("Assignment Details", 3, "left")}
                ${(0, components_1.KeyValueTable)(details)}
                
                <div style="margin-top: 32px; text-align: center;">
                    ${(0, components_1.PrimaryButton)("Track Order Status", params.trackLink, "center")}
                </div>
            </td>
        </tr>
        ${(0, components_1.EmailFooter)()}
    `;
    return (0, components_1.EmailLayout)(content, `Delivery Partner Assigned - #${params.orderId}`);
};
exports.PartnerAcceptedEmail = PartnerAcceptedEmail;
const OutForDeliveryEmail = (params) => {
    const otpSection = params.otp ? `
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
            <tr>
                <td align="center" style="background-color: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 20px;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #1e3a8a; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        Delivery Verification OTP
                    </p>
                    <p style="margin: 0; font-size: 32px; font-weight: 800; color: #1e3050; letter-spacing: 6px; font-family: 'Courier New', Courier, monospace;">
                        ${params.otp}
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #1e40af; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        Provide this OTP to the delivery partner upon arrival.
                    </p>
                </td>
            </tr>
        </table>
    ` : '';
    const content = `
        ${(0, components_1.EmailHeader)("Out For Delivery")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${(0, components_1.StatusBanner)("info", "📦 Order Out for Delivery", "Your delivery partner is bringing your fresh order.")}
                
                ${(0, components_1.DriverCard)({
        name: params.driverName,
        phone: `+91 ${params.driverPhone.replace(/^\+91\s*/, '')}`,
        vehicle: params.vehicle,
        eta: params.eta
    })}
                
                ${otpSection}
                
                ${(0, components_1.Heading)("Order Details", 3, "left")}
                ${(0, components_1.OrderTable)(params.items, params.deliveryFee, params.subtotal, params.totalGst, params.totalAmount)}
                
                <div style="margin-top: 24px; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Delivery Details</h4>
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"><strong>${params.customerName}</strong></p>
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${params.customerPhone}</p>
                    <p style="margin: 0 0 12px 0; font-size: 13px; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${params.address}</p>
                    
                    <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Payment Method</h4>
                    <p style="margin: 0; font-size: 13px; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase;">${params.paymentMethod}</p>
                </div>
                
                <div style="margin-top: 32px; text-align: center;">
                    ${(0, components_1.PrimaryButton)("Track Live Order", params.trackLink, "center")}
                </div>
            </td>
        </tr>
        ${(0, components_1.EmailFooter)()}
    `;
    return (0, components_1.EmailLayout)(content, `Order #${params.orderId} is Out for Delivery!`);
};
exports.OutForDeliveryEmail = OutForDeliveryEmail;
const OrderDeliveredEmail = (params) => {
    const details = [
        { key: "Order ID", value: `#${params.orderId}` },
        { key: "Delivered Time", value: params.deliveredTime },
        { key: "Amount Paid", value: `₹${params.grandTotal.toFixed(2)}` }
    ];
    const content = `
        ${(0, components_1.EmailHeader)("Order Delivered")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${(0, components_1.StatusBanner)("success", "Package Delivered!", "Your VillageSmart products have been successfully delivered")}
                
                ${(0, components_1.Heading)("Delivery Details", 3, "left")}
                ${(0, components_1.KeyValueTable)(details)}

                <div style="margin: 24px 0; background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; text-align: center;" class="card">
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-dark">
                        How was your experience?
                    </p>
                    <p style="margin: 4px 0 16px 0; font-size: 13px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">
                        Please take a moment to rate our service.
                    </p>
                    <table align="center" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <td align="center" style="border-radius: 8px; background-color: #16a34a;">
                                <a href="https://villagesmart.in/my-orders" target="_blank" style="font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 10px 20px; display: inline-block;">
                                    Rate Experience
                                </a>
                            </td>
                        </tr>
                    </table>
                </div>

                ${params.invoiceUrl ? `
                <div style="margin-top: 24px; text-align: center;">
                    ${(0, components_1.PrimaryButton)("Download Invoice PDF", params.invoiceUrl, "center")}
                </div>
                ` : ''}
            </td>
        </tr>
        ${(0, components_1.EmailFooter)()}
    `;
    return (0, components_1.EmailLayout)(content, `Order #${params.orderId} successfully delivered!`);
};
exports.OrderDeliveredEmail = OrderDeliveredEmail;

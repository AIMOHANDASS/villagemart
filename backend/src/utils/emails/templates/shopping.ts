import { 
    EmailLayout, 
    EmailHeader, 
    EmailFooter, 
    Heading, 
    Text, 
    PrimaryButton, 
    StatusBanner, 
    OrderTable,
    EmailProductItem,
    DriverCard,
    KeyValueTable
} from "../components";

export const OrderPlacedEmail = (params: {
    orderId: string;
    customerName: string;
    totalAmount: number;
    deliveryAddress: string;
    paymentMethod: string;
    items: EmailProductItem[];
    subtotal: number;
    totalGst: number;
    deliveryFee: number;
    estimatedDelivery?: string;
    trackLink: string;
}) => {
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
        ${EmailHeader("Order Placed")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${StatusBanner("success", "Order Placed Successfully", "We have received your order and are preparing it")}
                
                ${Heading("Order Information", 3, "left")}
                ${KeyValueTable(detailsRows)}

                <div style="margin: 24px 0; border-top: 1px solid #e2e8f0; padding-top: 24px;" class="border-divider">
                    ${Heading("Items Ordered", 3, "left")}
                    ${OrderTable(params.items, params.deliveryFee, params.subtotal, params.totalGst, params.totalAmount)}
                </div>

                <div style="margin-top: 32px; text-align: center;">
                    ${PrimaryButton("Track Order Status", params.trackLink, "center")}
                </div>
            </td>
        </tr>
        ${EmailFooter()}
    `;
    return EmailLayout(content, `Order Confirmed - #${params.orderId}`);
};

export const OrderConfirmedEmail = (params: {
    orderId: string;
    customerName: string;
    totalAmount: number;
    paymentStatus: string;
    expectedDelivery: string;
    invoiceUrl?: string;
}) => {
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
        ${EmailHeader("Order Confirmed")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${StatusBanner("success", "Order Confirmed by Store", "Your payment is processed and order is being packed")}
                
                ${Heading("Confirmation Details", 3, "left")}
                ${KeyValueTable(details)}
                
                ${invoiceBtn}

                <div style="margin-top: 32px; text-align: center;">
                    ${PrimaryButton("View Order Dashboard", "https://villagesmart.in/my-orders", "center")}
                </div>
            </td>
        </tr>
        ${EmailFooter()}
    `;
    return EmailLayout(content, `Order Confirmed - #${params.orderId}`);
};

export const PartnerAcceptedEmail = (params: {
    orderId: string;
    customerName: string;
    driverName: string;
    driverPhone: string;
    trackLink: string;
}) => {
    const details = [
        { key: "Order ID", value: `#${params.orderId}` },
        { key: "Assigned To", value: params.driverName },
        { key: "Partner Contact", value: params.driverPhone }
    ];

    const content = `
        ${EmailHeader("Delivery Partner Assigned")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${StatusBanner("info", "Partner Assigned", "Your order has been accepted by a delivery partner and is being prepared for pickup.")}
                
                ${Heading("Assignment Details", 3, "left")}
                ${KeyValueTable(details)}
                
                <div style="margin-top: 32px; text-align: center;">
                    ${PrimaryButton("Track Order Status", params.trackLink, "center")}
                </div>
            </td>
        </tr>
        ${EmailFooter()}
    `;
    return EmailLayout(content, `Delivery Partner Assigned - #${params.orderId}`);
};

export const OutForDeliveryEmail = (params: {
    orderId: string;
    customerName: string;
    driverName: string;
    driverPhone: string;
    vehicle: string;
    vehicleNumber?: string;
    eta: string;
    trackLink: string;
    otp?: string;
    items: EmailProductItem[];
    totalAmount: number;
    deliveryFee: number;
    subtotal: number;
    totalGst: number;
    address: string;
    customerPhone: string;
    paymentMethod: string;
}) => {
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
        ${EmailHeader("Out For Delivery")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${StatusBanner("info", "📦 Order Out for Delivery", "Your delivery partner is bringing your fresh order.")}
                
                ${DriverCard({
                    name: params.driverName,
                    phone: `+91 ${params.driverPhone.replace(/^\+91\s*/, '')}`,
                    vehicle: params.vehicle,
                    eta: params.eta
                })}
                
                ${otpSection}
                
                ${Heading("Order Details", 3, "left")}
                ${OrderTable(params.items, params.deliveryFee, params.subtotal, params.totalGst, params.totalAmount)}
                
                <div style="margin-top: 24px; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Delivery Details</h4>
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"><strong>${params.customerName}</strong></p>
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${params.customerPhone}</p>
                    <p style="margin: 0 0 12px 0; font-size: 13px; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${params.address}</p>
                    
                    <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Payment Method</h4>
                    <p style="margin: 0; font-size: 13px; color: #475569; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-transform: uppercase;">${params.paymentMethod}</p>
                </div>
                
                <div style="margin-top: 32px; text-align: center;">
                    ${PrimaryButton("Track Live Order", params.trackLink, "center")}
                </div>
            </td>
        </tr>
        ${EmailFooter()}
    `;
    return EmailLayout(content, `Order #${params.orderId} is Out for Delivery!`);
};

export const OrderDeliveredEmail = (params: {
    orderId: string;
    customerName: string;
    deliveredTime: string;
    grandTotal: number;
    invoiceUrl?: string;
}) => {
    const details = [
        { key: "Order ID", value: `#${params.orderId}` },
        { key: "Delivered Time", value: params.deliveredTime },
        { key: "Amount Paid", value: `₹${params.grandTotal.toFixed(2)}` }
    ];

    const content = `
        ${EmailHeader("Order Delivered")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${StatusBanner("success", "Package Delivered!", "Your VillageSmart products have been successfully delivered")}
                
                ${Heading("Delivery Details", 3, "left")}
                ${KeyValueTable(details)}

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
                    ${PrimaryButton("Download Invoice PDF", params.invoiceUrl, "center")}
                </div>
                ` : ''}
            </td>
        </tr>
        ${EmailFooter()}
    `;
    return EmailLayout(content, `Order #${params.orderId} successfully delivered!`);
};

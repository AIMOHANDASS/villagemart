export interface EmailProductItem {
    product_name: string;
    unit_price: number;
    weight?: string | number;
    total_price: number;
    image: string;
    quantity?: number;
    gst?: number;
}

export const OrderTable = (
    items: EmailProductItem[], 
    deliveryCharge: number = 0, 
    subtotal: number, 
    totalGst: number, 
    grandTotal: number
) => {
    const itemsHtml = items.map(item => {
        // Fallback for image
        const imgUrl = item.image && item.image !== '' ? item.image : 'https://villagesmart.in/logo.png';
        const weightLabel = item.weight ? ` (${item.weight})` : '';
        const qtyLabel = item.quantity ? ` x${item.quantity}` : '';

        return `
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; width: 64px;" align="left" valign="middle">
                <img src="${imgUrl}" width="48" height="48" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover; display: block;" onerror="this.onerror=null; this.src='https://villagesmart.in/logo.png';" />
            </td>
            <td style="padding: 12px 12px; border-bottom: 1px solid #f1f5f9;" align="left" valign="middle">
                <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-dark">
                    ${item.product_name}
                </p>
                <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">
                    Unit Price: ₹${Number(item.unit_price).toFixed(2)}${weightLabel}${qtyLabel}
                </p>
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; font-weight: 700; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: right;" align="right" valign="middle" class="text-dark">
                ₹${Number(item.total_price).toFixed(2)}
            </td>
        </tr>
        `;
    }).join('');

    return `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 16px 0;">
        <thead>
            <tr>
                <th style="padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; text-align: left; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" align="left" class="text-muted">Item</th>
                <th style="padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; text-align: left; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding-left: 12px;" align="left" class="text-muted">Description</th>
                <th style="padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; text-align: right; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" align="right" class="text-muted">Total</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
            <!-- Subtotal & Summary Rows -->
            <tr>
                <td colspan="2" style="padding: 12px 0 6px 0; font-size: 14px; font-weight: 600; color: #64748b; text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" align="right" class="text-muted">Subtotal:</td>
                <td style="padding: 12px 0 6px 0; font-size: 14px; font-weight: 600; color: #1e293b; text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" align="right" class="text-dark">₹${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
                <td colspan="2" style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #64748b; text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" align="right" class="text-muted">GST Total:</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 600; color: #1e293b; text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" align="right" class="text-dark">₹${totalGst.toFixed(2)}</td>
            </tr>
            <tr>
                <td colspan="2" style="padding: 6px 0 12px 0; font-size: 14px; font-weight: 600; color: #64748b; text-align: right; border-bottom: 1px solid #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" align="right" class="border-divider text-muted">Delivery Charge:</td>
                <td style="padding: 6px 0 12px 0; font-size: 14px; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" align="right" class="border-divider text-dark">₹${deliveryCharge.toFixed(2)}</td>
            </tr>
            <tr>
                <td colspan="2" style="padding: 16px 0 0 0; font-size: 16px; font-weight: 800; color: #16a34a; text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" align="right">Grand Total:</td>
                <td style="padding: 16px 0 0 0; font-size: 18px; font-weight: 800; color: #16a34a; text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" align="right">₹${grandTotal.toFixed(2)}</td>
            </tr>
        </tbody>
    </table>
    `;
};

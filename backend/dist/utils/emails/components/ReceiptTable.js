"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptTable = void 0;
const ReceiptTable = (items, paymentMethod = "Paid Online") => {
    const rowsHtml = items.map(item => {
        let style = "padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;";
        let labelColor = item.isHighlight ? "#16a34a" : "#64748b";
        let valColor = item.isHighlight ? "#16a34a" : "#1e293b";
        let weight = item.isBold || item.isHighlight ? "font-weight: 700;" : "font-weight: 500;";
        return `
        <tr>
            <td style="${style} color: ${labelColor}; ${weight}" class="text-muted">
                ${item.label}
            </td>
            <td style="${style} color: ${valColor}; ${weight} text-align: right;" align="right" class="text-dark">
                ${typeof item.value === 'number' ? `₹${item.value.toFixed(2)}` : item.value}
            </td>
        </tr>
        `;
    }).join('');
    return `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 16px 0; background-color: #ffffff; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 12px;" class="card">
        ${rowsHtml}
        <tr>
            <td style="padding: 12px 0 0 0; font-size: 12px; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">
                Payment Method
            </td>
            <td style="padding: 12px 0 0 0; font-size: 12px; font-weight: 700; color: #475569; text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" align="right" class="text-dark">
                ${paymentMethod}
            </td>
        </tr>
    </table>
    `;
};
exports.ReceiptTable = ReceiptTable;

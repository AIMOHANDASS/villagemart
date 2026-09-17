"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceCard = void 0;
const InvoiceCard = (params) => {
    const gstNo = params.gstin || "33AABCV8038Q1Z4";
    const downloadButton = params.downloadUrl ? `
    <tr>
        <td align="center" style="padding-top: 20px;">
            <table border="0" cellspacing="0" cellpadding="0" align="center">
                <tr>
                    <td align="center" style="border-radius: 8px; background-color: #16a34a;">
                        <a href="${params.downloadUrl}" target="_blank" style="font-size: 14px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block;">
                            Download Invoice PDF
                        </a>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    ` : '';
    return `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;" class="card">
        <tr>
            <td style="padding: 24px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <!-- Invoice Details Header -->
                    <tr>
                        <td style="padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;" class="border-divider">
                            <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-dark">TAX INVOICE</h4>
                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">Invoice #: ${params.invoiceNumber}</p>
                        </td>
                        <td align="right" style="padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;" valign="top" class="border-divider">
                            <p style="margin: 0; font-size: 13px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">Date: ${params.invoiceDate}</p>
                        </td>
                    </tr>

                    <!-- Bill To & Bill From -->
                    <tr>
                        <td style="padding-top: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; width: 50%;" valign="top" class="border-divider">
                            <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">Billed To</p>
                            <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-dark">${params.customerName}</p>
                        </td>
                        <td style="padding-top: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; width: 50%; padding-left: 20px;" valign="top" align="right" class="border-divider">
                            <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">Seller Details</p>
                            <p style="margin: 0; font-size: 13px; font-weight: 700; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-dark">VillageSmart Inc.</p>
                            <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">Karur, Tamil Nadu, India</p>
                            <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">GSTIN: ${gstNo}</p>
                        </td>
                    </tr>

                    <!-- Total Row -->
                    <tr>
                        <td style="padding-top: 16px;">
                            <span style="font-size: 13px; font-weight: 600; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">Payment Amount</span>
                        </td>
                        <td align="right" style="padding-top: 16px;">
                            <span style="font-size: 20px; font-weight: 800; color: #16a34a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">₹${params.totalAmount.toFixed(2)}</span>
                        </td>
                    </tr>

                    <!-- Download Trigger -->
                    ${downloadButton}
                </table>
            </td>
        </tr>
    </table>
    `;
};
exports.InvoiceCard = InvoiceCard;

import { SUPPORT_PHONE, SUPPORT_EMAIL, SUPPORT_HOURS } from "../../../config/support";

// Helper to format phone for display (e.g. +91 90250 03808)
const formatPhoneForDisplay = (phone: string) => {
    if (phone.startsWith("+91") && phone.length === 13) {
        return `+91 ${phone.substring(3, 8)} ${phone.substring(8)}`;
    }
    return phone;
};

export const SupportCard = () => `
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 16px 0;">
    <tr>
        <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;" class="card">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                    <td style="padding-bottom: 8px;">
                        <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-dark">
                            Need Immediate Assistance?
                        </h4>
                        <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">
                            Our team is available from ${SUPPORT_HOURS} to help you.
                        </p>
                    </td>
                </tr>
                <tr>
                    <td>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                                <td style="padding-top: 8px; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                    <span style="color: #64748b; font-weight: 600;" class="text-muted">Phone Support:</span> <a href="tel:${SUPPORT_PHONE}" style="color: #16a34a; text-decoration: none; font-weight: 700;">${formatPhoneForDisplay(SUPPORT_PHONE)}</a>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding-top: 4px; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                    <span style="color: #64748b; font-weight: 600;" class="text-muted">Email Support:</span> <a href="mailto:${SUPPORT_EMAIL}" style="color: #16a34a; text-decoration: none; font-weight: 700;">${SUPPORT_EMAIL}</a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
`;

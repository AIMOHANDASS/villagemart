import { SUPPORT_PHONE, SUPPORT_EMAIL, SUPPORT_WEBSITE, SUPPORT_HOURS } from "../../../config/support";

// Helper to format phone for display (e.g. +91 90250 03808)
const formatPhoneForDisplay = (phone: string) => {
    if (phone.startsWith("+91") && phone.length === 13) {
        return `+91 ${phone.substring(3, 8)} ${phone.substring(8)}`;
    }
    return phone;
};

export const EmailFooter = () => `
<tr>
    <td align="center" style="background-color: #f8fafc; padding: 40px 24px; border-top: 1px solid #e2e8f0;" class="border-divider">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; margin: 0 auto;">
            <!-- Help Section Heading -->
            <tr>
                <td align="center" style="padding-bottom: 8px;">
                    <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-dark">
                        Need Help?
                    </h4>
                </td>
            </tr>
            <!-- Support Contacts -->
            <tr>
                <td align="center" style="padding-bottom: 24px;">
                    <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin-top: 8px;">
                        <tr>
                            <td align="center" style="padding: 4px 0; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">
                                <span style="display: inline-block; vertical-align: middle; margin-right: 6px; font-size: 14px;">✉</span>
                                <a href="mailto:${SUPPORT_EMAIL}" style="color: #16a34a; text-decoration: none; font-weight: 600; vertical-align: middle;">
                                    ${SUPPORT_EMAIL}
                                </a>
                            </td>
                        </tr>
                        <tr>
                            <td align="center" style="padding: 4px 0; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">
                                <span style="display: inline-block; vertical-align: middle; margin-right: 6px; font-size: 14px;">📞</span>
                                <a href="tel:${SUPPORT_PHONE}" style="color: #16a34a; text-decoration: none; font-weight: 600; vertical-align: middle;">
                                    ${formatPhoneForDisplay(SUPPORT_PHONE)}
                                </a>
                            </td>
                        </tr>
                        <tr>
                            <td align="center" style="padding: 4px 0; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">
                                <span style="display: inline-block; vertical-align: middle; margin-right: 6px; font-size: 14px;">🌐</span>
                                <a href="${SUPPORT_WEBSITE}" style="color: #16a34a; text-decoration: none; font-weight: 600; vertical-align: middle;">
                                    ${SUPPORT_WEBSITE}
                                </a>
                            </td>
                        </tr>
                    </table>
                    
                    <p style="margin: 12px 0 0 0; font-size: 13px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">
                        Support Hours: <strong style="color: #475569;" class="text-dark">${SUPPORT_HOURS}</strong>
                    </p>
                </td>
            </tr>
            <!-- Divider -->
            <tr>
                <td style="border-top: 1px solid #e2e8f0; padding-top: 24px;" class="border-divider">
                    <!-- Copyright & Footnotes -->
                    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">
                        &copy; 2026 <strong>VillageSmart</strong>. Fresh from Villages. All Rights Reserved.
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">
                        <a href="${SUPPORT_WEBSITE}/privacy" style="color: #94a3b8; text-decoration: underline;">Privacy Policy</a> &nbsp;|&nbsp; 
                        <a href="${SUPPORT_WEBSITE}/terms" style="color: #94a3b8; text-decoration: underline;">Terms of Service</a>
                    </p>
                </td>
            </tr>
        </table>
    </td>
</tr>
`;

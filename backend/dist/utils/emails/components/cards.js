"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPCard = exports.InfoCard = void 0;
const InfoCard = (content) => `
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 16px 0;">
    <tr>
        <td style="background-color: #f9fafb; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb;" class="card">
            ${content}
        </td>
    </tr>
</table>
`;
exports.InfoCard = InfoCard;
const OTPCard = (otp, label = "OTP Verification") => `
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
    <tr>
        <td align="center" style="background-color: #f0fdf4; border: 2px dashed #86efac; border-radius: 16px; padding: 32px 20px;">
            <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #16a34a; text-transform: uppercase; letter-spacing: 1px; font-family: 'Inter', sans-serif;">
                ${label}
            </p>
            <p style="margin: 0; font-size: 40px; font-weight: 800; color: #15803d; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace;">
                ${otp}
            </p>
            <p style="margin: 12px 0 0 0; font-size: 13px; color: #166534; font-family: 'Inter', sans-serif;">
                Do not share this code with anyone.
            </p>
        </td>
    </tr>
</table>
`;
exports.OTPCard = OTPCard;

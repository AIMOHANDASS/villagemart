export const PrimaryButton = (label: string, url: string, align: "left" | "center" | "right" = "center") => `
<table border="0" cellspacing="0" cellpadding="0" align="${align}" style="margin: 16px 0;">
    <tr>
        <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, #16a34a, #15803d);">
            <a href="${url}" target="_blank" style="font-size: 15px; font-weight: 700; font-family: 'Inter', sans-serif; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; border: 1px solid #15803d; display: inline-block; box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.3);">
                ${label}
            </a>
        </td>
    </tr>
</table>
`;

export const SecondaryButton = (label: string, url: string, align: "left" | "center" | "right" = "center") => `
<table border="0" cellspacing="0" cellpadding="0" align="${align}" style="margin: 16px 0;">
    <tr>
        <td align="center" style="border-radius: 8px; background-color: #ffffff; border: 2px solid #e5e7eb;" class="card">
            <a href="${url}" target="_blank" style="font-size: 15px; font-weight: 700; font-family: 'Inter', sans-serif; color: #374151; text-decoration: none; padding: 12px 32px; border-radius: 8px; display: inline-block;" class="text-dark">
                ${label}
            </a>
        </td>
    </tr>
</table>
`;

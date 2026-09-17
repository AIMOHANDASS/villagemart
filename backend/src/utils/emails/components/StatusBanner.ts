export const StatusBanner = (type: "success" | "error" | "warning" | "info", title: string, subtitle?: string) => {
    let bgColor = "#f0fdf4";
    let borderColor = "#bbf7d0";
    let textColor = "#15803d";
    let iconHtml = `
        <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; background-color: #16a34a; color: #ffffff; font-size: 22px; font-weight: bold; text-align: center;">✔</div>
    `;

    if (type === "error") {
        bgColor = "#fef2f2";
        borderColor = "#fecaca";
        textColor = "#991b1b";
        iconHtml = `
            <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; background-color: #dc2626; color: #ffffff; font-size: 22px; font-weight: bold; text-align: center;">✖</div>
        `;
    } else if (type === "warning") {
        bgColor = "#fffbeb";
        borderColor = "#fef3c7";
        textColor = "#92400e";
        iconHtml = `
            <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; background-color: #d97706; color: #ffffff; font-size: 22px; font-weight: bold; text-align: center;">⚠</div>
        `;
    } else if (type === "info") {
        bgColor = "#eff6ff";
        borderColor = "#bfdbfe";
        textColor = "#1e40af";
        iconHtml = `
            <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; background-color: #2563eb; color: #ffffff; font-size: 22px; font-weight: bold; text-align: center;">ℹ</div>
        `;
    }

    return `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 16px 0;" class="card">
        <tr>
            <td style="background-color: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 24px; text-align: center;">
                <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto;">
                    <tr>
                        <td align="center" style="padding-bottom: 12px;">
                            ${iconHtml}
                        </td>
                    </tr>
                    <tr>
                        <td align="center">
                            <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: ${textColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                ${title}
                            </h3>
                            ${subtitle ? `
                            <p style="margin: 4px 0 0 0; font-size: 14px; color: ${textColor}; opacity: 0.9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                ${subtitle}
                            </p>
                            ` : ''}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    `;
};

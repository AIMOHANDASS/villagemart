export const DriverCard = (params: {
    name: string;
    phone: string;
    vehicle: string;
    vehicleNumber?: string;
    rating?: string | number;
    avatarUrl?: string;
    eta?: string;
    trackLink?: string;
}) => {
    const avatar = params.avatarUrl && params.avatarUrl !== '' 
        ? params.avatarUrl 
        : 'https://unpkg.com/lucide-static@latest/icons/user.svg';
    const ratingStars = params.rating 
        ? `<span style="color: #eab308; font-weight: 700; font-size: 14px;">★ ${params.rating}</span>`
        : '';
    const plateNumber = params.vehicleNumber 
        ? `<span style="background-color: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; font-weight: 700; border: 1px solid #cbd5e1; margin-left: 8px;">${params.vehicleNumber}</span>`
        : '';

    const actions = (params.trackLink || params.phone) ? `
    <tr>
        <td style="padding-top: 16px; border-top: 1px solid #f1f5f9;" class="border-divider">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                    ${params.phone ? `
                    <td align="left">
                        <table border="0" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center" style="border-radius: 6px; background-color: #ffffff; border: 1px solid #cbd5e1;">
                                    <a href="tel:${params.phone}" style="font-size: 13px; font-weight: 700; color: #475569; text-decoration: none; padding: 10px 16px; display: inline-block;">
                                        Call Driver
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                    ` : ''}
                    ${params.trackLink ? `
                    <td align="right">
                        <table border="0" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center" style="border-radius: 6px; background-color: #16a34a;">
                                    <a href="${params.trackLink}" style="font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 10px 16px; display: inline-block;">
                                        Live Tracking
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                    ` : ''}
                </tr>
            </table>
        </td>
    </tr>
    ` : '';

    return `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;" class="card">
        <tr>
            <td style="padding: 20px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td style="padding-bottom: 16px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <!-- Driver Avatar -->
                                    <td width="60" valign="top">
                                        <img src="${avatar}" width="48" height="48" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; background-color: #f1f5f9; display: block;" onerror="this.onerror=null; this.src='https://unpkg.com/lucide-static@latest/icons/user.svg';" />
                                    </td>
                                    <!-- Driver Meta -->
                                    <td valign="middle" style="padding-left: 12px;">
                                        <p style="margin: 0; font-size: 15px; font-weight: 700; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-dark">
                                            ${params.name} &bull; ${ratingStars}
                                        </p>
                                        <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">
                                            ${params.vehicle} ${plateNumber}
                                        </p>
                                    </td>
                                    ${params.eta ? `
                                    <td align="right" valign="middle">
                                        <div style="background-color: #dcfce7; color: #16a34a; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: inline-block;">
                                            ${params.eta}
                                        </div>
                                    </td>
                                    ` : ''}
                                </tr>
                            </table>
                        </td>
                    </tr>
                    ${actions}
                </table>
            </td>
        </tr>
    </table>
    `;
};

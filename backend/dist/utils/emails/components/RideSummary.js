"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideSummary = void 0;
const RideSummary = (params) => {
    const formattedFare = typeof params.fare === 'number' ? `₹${params.fare.toFixed(2)}` : params.fare;
    const distanceText = params.distance ? `${params.distance}` : 'N/A';
    return `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 16px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;" class="card">
        <tr>
            <td style="padding: 24px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <!-- Ride Header -->
                    <tr>
                        <td style="padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;" class="border-divider">
                            <span style="font-size: 13px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                Ride #${params.bookingId}
                            </span>
                        </td>
                        <td align="right" style="padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;" class="border-divider">
                            <span style="font-size: 14px; font-weight: 700; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-dark">
                                ${params.vehicle}
                            </span>
                        </td>
                    </tr>

                    <!-- Pickup Route Row -->
                    <tr>
                        <td colspan="2" style="padding-top: 16px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td width="24" valign="top" style="padding-top: 2px;">
                                        <img src="https://unpkg.com/lucide-static@latest/icons/map-pin.svg" width="16" height="16" style="width: 16px; height: 16px; display: block;" />
                                    </td>
                                    <td valign="top" style="font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding-left: 8px;">
                                        <strong style="color: #64748b;" class="text-muted">Pickup Address</strong><br/>
                                        <span style="color: #1e293b; display: inline-block; margin-top: 4px;" class="text-dark">${params.pickup}</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Destination Route Row -->
                    <tr>
                        <td colspan="2" style="padding-top: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;" class="border-divider">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td width="24" valign="top" style="padding-top: 2px;">
                                        <img src="https://unpkg.com/lucide-static@latest/icons/map-pin.svg" width="16" height="16" style="width: 16px; height: 16px; display: block;" />
                                    </td>
                                    <td valign="top" style="font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding-left: 8px;">
                                        <strong style="color: #64748b;" class="text-muted">Destination Address</strong><br/>
                                        <span style="color: #1e293b; display: inline-block; margin-top: 4px;" class="text-dark">${params.destination}</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Stats Row -->
                    <tr>
                        <td style="padding-top: 16px;">
                            <span style="font-size: 13px; font-weight: 600; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">
                                Distance
                            </span><br/>
                            <strong style="font-size: 16px; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-dark">
                                ${distanceText}
                            </strong>
                        </td>
                        <td align="right" style="padding-top: 16px;">
                            <span style="font-size: 13px; font-weight: 600; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">
                                Total Fare
                            </span><br/>
                            <strong style="font-size: 18px; color: #16a34a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                ${formattedFare}
                            </strong>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    `;
};
exports.RideSummary = RideSummary;

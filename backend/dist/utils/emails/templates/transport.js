"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideCancelledEmail = exports.RideInvoiceEmail = exports.TransportRideStartedEmail = exports.TransportDriverAssignedEmail = exports.TransportBookingEmail = void 0;
const components_1 = require("../components");
const TransportBookingEmail = (params) => {
    const content = `
        ${(0, components_1.EmailHeader)("Ride Booked")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${(0, components_1.StatusBanner)("info", "Ride Request Registered", "We are searching for the nearest available driver")}
                
                ${(0, components_1.Heading)("Trip Booking Info", 3, "left")}
                ${(0, components_1.RideSummary)({
        bookingId: params.bookingId,
        pickup: params.pickup,
        destination: params.destination,
        vehicle: params.vehicle,
        fare: params.fare
    })}

                <div style="margin-top: 32px; text-align: center;">
                    ${(0, components_1.PrimaryButton)("Track Ride Status", params.trackLink, "center")}
                </div>
            </td>
        </tr>
        ${(0, components_1.EmailFooter)()}
    `;
    return (0, components_1.EmailLayout)(content, `Ride Request Registered - #${params.bookingId}`);
};
exports.TransportBookingEmail = TransportBookingEmail;
const TransportDriverAssignedEmail = (params) => {
    const otpSection = params.otp ? `
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
            <tr>
                <td align="center" style="background-color: #f0fdf4; border: 2px dashed #16a34a; border-radius: 12px; padding: 20px;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        Start Ride Verification OTP
                    </p>
                    <p style="margin: 0; font-size: 32px; font-weight: 800; color: #14532d; letter-spacing: 6px; font-family: 'Courier New', Courier, monospace;">
                        ${params.otp}
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #166534; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        Share this code with your driver to start the trip.
                    </p>
                </td>
            </tr>
        </table>
    ` : '';
    const content = `
        ${(0, components_1.EmailHeader)("Driver Assigned")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${(0, components_1.StatusBanner)("success", "Driver is on the way", "A driver has accepted your ride request and is approaching")}
                
                ${otpSection}

                ${(0, components_1.Heading)("Driver Details", 3, "left")}
                ${(0, components_1.DriverCard)({
        name: params.driverName,
        phone: `+91 ${params.driverMobile.replace(/^\+91\s*/, '')}`,
        vehicle: params.vehicleType,
        vehicleNumber: params.vehicleNumber,
        rating: params.rating || "4.8",
        eta: params.eta,
        trackLink: params.trackLink
    })}
            </td>
        </tr>
        ${(0, components_1.EmailFooter)()}
    `;
    return (0, components_1.EmailLayout)(content, `Driver Assigned - Ride #${params.bookingId}`);
};
exports.TransportDriverAssignedEmail = TransportDriverAssignedEmail;
const TransportRideStartedEmail = (params) => {
    const content = `
        ${(0, components_1.EmailHeader)("Ride Started")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${(0, components_1.StatusBanner)("success", "Trip Started Successfully", "You are now on your way to your destination")}
                
                ${(0, components_1.Heading)("Trip In Progress", 3, "left")}
                ${(0, components_1.Text)("Your verification OTP was confirmed and your ride is active. Track your route in real-time below.", "left")}
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 16px 0;" class="card">
                    <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-dark">Safety Tips</h4>
                    <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">
                        • Verify your driver matches the profile.<br/>
                        • Keep track of the route via live tracking.<br/>
                        • Share your trip details with family.
                    </p>
                </div>

                <div style="margin-top: 32px; text-align: center;">
                    ${(0, components_1.PrimaryButton)("Track Route Map", params.trackLink, "center")}
                </div>
            </td>
        </tr>
        ${(0, components_1.EmailFooter)()}
    `;
    return (0, components_1.EmailLayout)(content, `Your Ride #${params.bookingId} has Started!`);
};
exports.TransportRideStartedEmail = TransportRideStartedEmail;
const RideInvoiceEmail = (params) => {
    const subtotal = Number(params.fare) * 0.95;
    const tax = Number(params.fare) * 0.05;
    const receiptLines = [
        { label: "Base Ride Fare", value: subtotal },
        { label: "GST (5%)", value: tax },
        { label: "Distance Traveled", value: params.distance },
        { label: "Ride Duration", value: params.duration || "N/A" },
        { label: "Grand Total Paid", value: Number(params.fare), isHighlight: true }
    ];
    const content = `
        ${(0, components_1.EmailHeader)("Ride Invoice")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${(0, components_1.StatusBanner)("success", "Trip Completed Successfully", "Thank you for choosing VillageSmart")}
                
                ${(0, components_1.Heading)(`Hi ${params.customerName},`, 3, "left")}
                ${(0, components_1.Text)("Here is your digital transaction invoice summary for your completed transport ride.", "left")}

                ${(0, components_1.Heading)("Ride Details", 3, "left")}
                ${(0, components_1.RideSummary)({
        bookingId: params.bookingNumber,
        pickup: params.pickup,
        destination: params.destination,
        vehicle: params.vehicle,
        fare: params.fare,
        distance: params.distance
    })}

                ${(0, components_1.Heading)("Invoice Ledger Summary", 3, "left")}
                ${(0, components_1.ReceiptTable)(receiptLines, params.paymentMethod)}

                <div style="margin-top: 24px; background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; text-align: center;" class="card">
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-dark">
                        Rate Your Driver
                    </p>
                    <p style="margin: 4px 0 16px 0; font-size: 13px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="text-muted">
                        Help us maintain premium partner quality.
                    </p>
                    <table align="center" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                            <td align="center" style="border-radius: 8px; background-color: #16a34a;">
                                <a href="https://villagesmart.in/transport/history" target="_blank" style="font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 10px 20px; display: inline-block;">
                                    Rate Ride Experience
                                </a>
                            </td>
                        </tr>
                    </table>
                </div>

                <div style="margin-top: 32px; text-align: center;">
                    ${(0, components_1.PrimaryButton)("Download PDF Receipt", params.receiptLink, "center")}
                </div>
            </td>
        </tr>
        ${(0, components_1.EmailFooter)()}
    `;
    return (0, components_1.EmailLayout)(content, `Invoice for Ride Booking #${params.bookingNumber}`);
};
exports.RideInvoiceEmail = RideInvoiceEmail;
const RideCancelledEmail = (params) => {
    const refundInfo = params.refundAmount && params.refundAmount > 0
        ? `${(0, components_1.Text)(`A refund of <strong>₹${params.refundAmount.toFixed(2)}</strong> has been initiated and will be credited to your account in 3-5 business days.`, "left")}`
        : '';
    const content = `
        ${(0, components_1.EmailHeader)("Ride Cancelled")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${(0, components_1.StatusBanner)("error", "Ride Request Cancelled", "Your booking has been cancelled")}
                
                ${(0, components_1.Heading)(`Trip #${params.bookingId} Cancelled`, 3, "left")}
                ${(0, components_1.Text)(`We regret to inform you that your ride booking has been cancelled.`, "left")}
                ${(0, components_1.Text)(`<strong>Cancellation Reason:</strong> ${params.reason}`, "left")}
                
                ${refundInfo}
                
                ${(0, components_1.Text)("If you did not initiate this cancellation or need assistance, please feel free to reach out to our support team.", "left")}
            </td>
        </tr>
        ${(0, components_1.EmailFooter)()}
    `;
    return (0, components_1.EmailLayout)(content, `Ride Cancelled - #${params.bookingId}`);
};
exports.RideCancelledEmail = RideCancelledEmail;

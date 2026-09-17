"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartyHallInvoiceEmail = exports.PartyHallBookingEmail = void 0;
const components_1 = require("../components");
const PartyHallBookingEmail = (params) => {
    const details = [
        { key: "Booking ID", value: `#${params.bookingId}` },
        { key: "Hall Name", value: params.hallName },
        { key: "Event Date", value: params.date },
        { key: "Event Slot", value: params.time },
        { key: "Guest Count", value: `${params.guests} guests` },
        { key: "Total Rent Fee", value: `₹${params.amount.toFixed(2)}` }
    ];
    const content = `
        ${(0, components_1.EmailHeader)("Event Confirmed")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${(0, components_1.StatusBanner)("success", "Party Hall Reserved!", "Your booking has been successfully confirmed")}
                
                ${(0, components_1.Heading)("Reservation Summary", 3, "left")}
                ${(0, components_1.KeyValueTable)(details)}
            </td>
        </tr>
        ${(0, components_1.EmailFooter)()}
    `;
    return (0, components_1.EmailLayout)(content, `Party Hall Reserved - #${params.bookingId}`);
};
exports.PartyHallBookingEmail = PartyHallBookingEmail;
const PartyHallInvoiceEmail = (params) => {
    const content = `
        ${(0, components_1.EmailHeader)("Booking Invoice")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${(0, components_1.StatusBanner)("success", "Invoice Generated", `Tax invoice ready for download`)}
                
                ${(0, components_1.Heading)("Invoice Summary", 3, "left")}
                ${(0, components_1.InvoiceCard)({
        invoiceNumber: `PH-${params.bookingId}`,
        invoiceDate: new Date().toLocaleDateString("en-IN"),
        customerName: "Valued Customer",
        totalAmount: params.amount,
        downloadUrl: params.downloadLink
    })}
            </td>
        </tr>
        ${(0, components_1.EmailFooter)()}
    `;
    return (0, components_1.EmailLayout)(content, `Invoice for Party Hall Booking #${params.bookingId}`);
};
exports.PartyHallInvoiceEmail = PartyHallInvoiceEmail;

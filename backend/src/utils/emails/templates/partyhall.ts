import { 
    EmailLayout, 
    EmailHeader, 
    EmailFooter, 
    Heading, 
    Text, 
    StatusBanner,
    KeyValueTable,
    InvoiceCard
} from "../components";

export const PartyHallBookingEmail = (params: {
    bookingId: string;
    hallName: string;
    date: string;
    time: string;
    guests: number;
    amount: number;
}) => {
    const details = [
        { key: "Booking ID", value: `#${params.bookingId}` },
        { key: "Hall Name", value: params.hallName },
        { key: "Event Date", value: params.date },
        { key: "Event Slot", value: params.time },
        { key: "Guest Count", value: `${params.guests} guests` },
        { key: "Total Rent Fee", value: `₹${params.amount.toFixed(2)}` }
    ];

    const content = `
        ${EmailHeader("Event Confirmed")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${StatusBanner("success", "Party Hall Reserved!", "Your booking has been successfully confirmed")}
                
                ${Heading("Reservation Summary", 3, "left")}
                ${KeyValueTable(details)}
            </td>
        </tr>
        ${EmailFooter()}
    `;
    return EmailLayout(content, `Party Hall Reserved - #${params.bookingId}`);
};

export const PartyHallInvoiceEmail = (params: {
    bookingId: string;
    amount: number;
    downloadLink: string;
}) => {
    const content = `
        ${EmailHeader("Booking Invoice")}
        <tr>
            <td class="inner-content" style="padding: 32px 24px; background-color: #ffffff;">
                ${StatusBanner("success", "Invoice Generated", `Tax invoice ready for download`)}
                
                ${Heading("Invoice Summary", 3, "left")}
                ${InvoiceCard({
                    invoiceNumber: `PH-${params.bookingId}`,
                    invoiceDate: new Date().toLocaleDateString("en-IN"),
                    customerName: "Valued Customer",
                    totalAmount: params.amount,
                    downloadUrl: params.downloadLink
                })}
            </td>
        </tr>
        ${EmailFooter()}
    `;
    return EmailLayout(content, `Invoice for Party Hall Booking #${params.bookingId}`);
};

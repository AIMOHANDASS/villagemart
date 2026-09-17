import db from "./src/db";

db.query(`
UPDATE orders
SET
    status = 'ACCEPTED',
    tracking_status = 'ACCEPTED',
    delivery_partner_id = NULL,
    delivery_status = 'PENDING',
    delivery_otp = NULL,
    \`picked at\` = NULL,
    out_for_delivery_at = NULL,
    \`delivered at\` = NULL
WHERE id = 32;
`, [], (err) => {
  if (err) console.error(err);
  else console.log("Order 32 has been reset to ACCEPTED successfully.");
  process.exit(0);
});

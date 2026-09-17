import db from "./src/db";

db.query('SELECT id, status, delivery_status, delivery_partner_id, delivery_otp FROM orders WHERE id = 32', [], (err, rows) => {
  if (err) console.error(err);
  console.log("Order 32:", rows);
  
  db.query(`
    SELECT o.id, o.status, o.delivery_status, o.delivery_partner_id
      FROM \`orders\` o
      WHERE o.\`status\` IN ('ACCEPTED', 'CONFIRMED')
        AND o.delivery_partner_id IS NULL
        AND (o.\`delivery_status\` IS NULL OR o.\`delivery_status\` NOT IN ('OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'))
  `, [], (err2, rows2) => {
    if (err2) console.error(err2);
    console.log("Eligible Delivery Orders (no category/distance filter):", rows2?.map((r: any) => r.id));
    process.exit(0);
  });
});

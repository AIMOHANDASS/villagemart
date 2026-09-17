const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'villagemart_new'
  });

  console.log("--- ORDERS 32 ---");
  const [orders] = await connection.execute('SELECT * FROM orders WHERE id = 32');
  console.log(orders);
  
  if (orders.length > 0) {
    const order = orders[0];
    const customerLat = order.delivery_latitude || 'null';
    const customerLng = order.delivery_longitude || 'null';
    console.log(`\nDelivery Coords: Lat: ${customerLat}, Lng: ${customerLng}`);
    
    console.log("\n--- QUERY TEST ---");
    const [nearbyOrders] = await connection.execute(`
      SELECT o.id, o.status, o.delivery_status, o.delivery_partner_id
      FROM \`orders\` o
      WHERE o.\`status\` IN ('ACCEPTED', 'CONFIRMED')
        AND o.delivery_partner_id IS NULL
        AND (o.\`delivery_status\` IS NULL OR o.\`delivery_status\` NOT IN ('OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'))
    `);
    console.log("Nearby orders (without distance/items filter):", nearbyOrders.map(o => o.id));
  }
  
  connection.end();
}

run().catch(console.error);

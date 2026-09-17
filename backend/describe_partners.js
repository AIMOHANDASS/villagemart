const mysql = require('mysql2');
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'villagemart_db' // guessing name based on standard
};

const conn = mysql.createConnection(dbConfig);

conn.connect(err => {
  if (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
  
  const tables = ['delivery_partners', 'transport_partners', 'partner_documents', 'product_images', 'products'];
  
  let pending = tables.length;
  
  tables.forEach(table => {
    conn.query(`DESCRIBE ${table}`, (err, results) => {
      if (err) {
        console.log(`Error describing ${table}:`, err.message);
      } else {
        console.log(`\n--- ${table} ---`);
        console.table(results);
      }
      pending--;
      if (pending === 0) {
        conn.end();
      }
    });
  });
});

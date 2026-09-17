const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  ssl: { rejectUnauthorized: false }
});

const queries = [
  "ALTER TABLE users ADD COLUMN fcm_token VARCHAR(255) NULL;",
  "ALTER TABLE admins ADD COLUMN fcm_token VARCHAR(255) NULL;",
  "ALTER TABLE delivery_partners ADD COLUMN fcm_token VARCHAR(255) NULL;",
  "ALTER TABLE transport_partners ADD COLUMN fcm_token VARCHAR(255) NULL;"
];

const runQueries = async () => {
  for (const q of queries) {
    try {
      await db.promise().query(q);
      console.log("Success:", q);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log("Already exists:", q);
      } else {
        console.error("Error running:", q, err.message);
      }
    }
  }
  process.exit();
};

runQueries();

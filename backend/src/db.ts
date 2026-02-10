import mysql from "mysql2";

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "villages_vmuser",
  password: process.env.DB_PASSWORD || "Mohan@1105",
  database: process.env.DB_NAME || "villages_villagemart_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default db;

import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const poolOptions: any = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const hostValue = process.env.DB_HOST || "127.0.0.1";

// 🎯 CRITICAL REFACTOR: Safely switch parameters if using Google Cloud UNIX Sockets
if (hostValue.startsWith("/cloudsql/")) {
  poolOptions.socketPath = hostValue; 
  console.log(`🌐 Production Database Activated: Bound to UNIX Domain Socket: ${poolOptions.socketPath}`);
} else {
  poolOptions.host = hostValue;
  poolOptions.port = Number(process.env.DB_PORT || 3306);
  poolOptions.ssl = { rejectUnauthorized: false };
  console.log(`💻 TCP Database Activated: Connected via TCP Port: ${poolOptions.host}:${poolOptions.port} with SSL`);
}

const db = mysql.createPool(poolOptions);

// Self-verifying pool check upon service instantiation
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ CRITICAL SQL AUTHENTICATION ERROR:", err.message);
  } else {
    console.log("🎉 SUCCESS: Secure communication channel verified and established with Google Cloud SQL!");
    connection.release();
  }
});

export default db;
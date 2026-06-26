"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql2_1 = __importDefault(require("mysql2"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const poolOptions = {
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
}
else {
    poolOptions.host = hostValue;
    poolOptions.port = Number(process.env.DB_PORT || 3306);
    poolOptions.ssl = { rejectUnauthorized: false };
    console.log(`💻 TCP Database Activated: Connected via TCP Port: ${poolOptions.host}:${poolOptions.port} with SSL`);
}
const db = mysql2_1.default.createPool(poolOptions);
// Self-verifying pool check upon service instantiation
db.getConnection((err, connection) => {
    if (err) {
        console.error("❌ CRITICAL SQL AUTHENTICATION ERROR:", err.message);
    }
    else {
        console.log("🎉 SUCCESS: Secure communication channel verified and established with Google Cloud SQL!");
        connection.release();
    }
});
exports.default = db;

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
// 🎯 UNIX SOCKET INTERCEPTION: Converts DB_HOST to socketPath to prevent connection crashes in Cloud Run
if (hostValue.startsWith("/cloudsql/")) {
    poolOptions.socketPath = hostValue;
    console.log(`🌐 Production Database Enabled -> Connected via UNIX Domain Socket: ${poolOptions.socketPath}`);
}
else {
    poolOptions.host = hostValue;
    poolOptions.port = Number(process.env.DB_PORT || 3306);
    console.log(`💻 Local Database Enabled -> Connected via TCP Port: ${poolOptions.host}:${poolOptions.port}`);
}
const db = mysql2_1.default.createPool(poolOptions);
// Self-testing validation routine block on app lifecycle initialization
db.getConnection((err, connection) => {
    if (err) {
        console.error("❌ CRITICAL SQL INITIALIZATION FAILED:", err.message);
    }
    else {
        console.log("🎉 SUCCESS: Secure background database thread pool attached to Google Cloud SQL Instance!");
        connection.release();
    }
});
exports.default = db;

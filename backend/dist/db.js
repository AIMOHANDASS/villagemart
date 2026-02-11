"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql2_1 = __importDefault(require("mysql2"));
const db = mysql2_1.default.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "villages_vmuser",
    password: process.env.DB_PASSWORD || "Mohan@1105",
    database: process.env.DB_NAME || "villages_villagemart_db",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});
exports.default = db;

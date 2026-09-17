"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("./db"));
db_1.default.query("SELECT * FROM transport_bookings LIMIT 3", (err, rows) => {
    if (err) {
        console.error(err);
    }
    else {
        console.log(JSON.stringify(rows, null, 2));
    }
    process.exit();
});

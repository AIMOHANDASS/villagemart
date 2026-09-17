"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../db"));
const cod_utils_1 = require("./cod.utils");
const runBackfill = async () => {
    console.log("Starting COD backfill process...");
    const query = `
    SELECT id 
    FROM orders 
    WHERE payment_method = 'cod' 
      AND delivery_partner_id IS NOT NULL 
      AND (status = 'DELIVERED' OR delivery_status = 'DELIVERED')
  `;
    db_1.default.query(query, async (err, rows) => {
        if (err) {
            console.error("❌ Failed to fetch delivered COD orders:", err);
            process.exit(1);
        }
        console.log(`Found ${rows.length} delivered COD orders. Processing...`);
        for (const row of rows) {
            try {
                (0, cod_utils_1.processCodCollectionIfApplicable)(row.id);
            }
            catch (e) {
                console.error(`❌ Failed to process order ${row.id}:`, e);
            }
        }
        console.log("COD backfill initiated. Note: It executes asynchronously via DB queries.");
        setTimeout(() => {
            console.log("Backfill completed.");
            process.exit(0);
        }, 5000); // give it time to run the queries
    });
};
runBackfill();

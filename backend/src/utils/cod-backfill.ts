import db from "../db";
import { processCodCollectionIfApplicable } from "./cod.utils";

const runBackfill = async () => {
  console.log("Starting COD backfill process...");
  
  const query = `
    SELECT id 
    FROM orders 
    WHERE payment_method = 'cod' 
      AND delivery_partner_id IS NOT NULL 
      AND (status = 'DELIVERED' OR delivery_status = 'DELIVERED')
  `;

  db.query(query, async (err: any, rows: any[]) => {
    if (err) {
      console.error("❌ Failed to fetch delivered COD orders:", err);
      process.exit(1);
    }
    
    console.log(`Found ${rows.length} delivered COD orders. Processing...`);
    
    for (const row of rows) {
      try {
        processCodCollectionIfApplicable(row.id);
      } catch (e) {
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

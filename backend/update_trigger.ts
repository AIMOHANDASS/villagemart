// @ts-nocheck
import "dotenv/config";
import db from "./src/db";

async function updateTrigger() {
  try {
    console.log("Dropping old trigger if exists...");
    await db.promise().query("DROP TRIGGER IF EXISTS after_order_item_insert");
    
    console.log("Creating new trigger...");
    const createTriggerSql = `
      CREATE TRIGGER after_order_item_insert
      AFTER INSERT ON \`order_items\`
      FOR EACH ROW
      BEGIN
        UPDATE \`products\` 
        SET \`inStock\` = \`inStock\` - CAST(NEW.weight AS SIGNED), 
            \`outStock\` = \`outStock\` + CAST(NEW.weight AS SIGNED)
        WHERE \`id\` = NEW.product_id;
      END;
    `;
    await db.promise().query(createTriggerSql);
    
    console.log("Trigger created successfully.");
  } catch (err) {
    console.error("Error updating trigger:", err);
  } finally {
    process.exit();
  }
}

updateTrigger();

// @ts-nocheck
import db from "./src/db";

async function checkSchema() {
  try {
    const [result] = await db.promise().query("DESCRIBE orders");
    console.log(result);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkSchema();

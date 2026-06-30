// @ts-nocheck
import db from "./src/db";

async function checkSchema() {
  try {
    const [result] = await db.promise().query("DESCRIBE products");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkSchema();

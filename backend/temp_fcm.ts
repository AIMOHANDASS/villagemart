import db from "./src/db";

const queries = [
  "ALTER TABLE users ADD COLUMN fcm_token VARCHAR(255) NULL;",
  "ALTER TABLE admins ADD COLUMN fcm_token VARCHAR(255) NULL;",
  "ALTER TABLE delivery_partners ADD COLUMN fcm_token VARCHAR(255) NULL;",
  "ALTER TABLE transport_partners ADD COLUMN fcm_token VARCHAR(255) NULL;"
];

const runQueries = async () => {
  for (const q of queries) {
    try {
      await db.promise().query(q);
      console.log("Success:", q);
    } catch (err: any) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log("Already exists:", q);
      } else {
        console.error("Error running:", q, err.message);
      }
    }
  }
  process.exit();
};

runQueries();

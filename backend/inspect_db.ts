import db from "./src/db";

async function inspect() {
  db.query("SHOW TABLES", (err: any, results: any[]) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log("TABLES:");
    console.log(results);
    
    const tablesToDescribe = ['orders', 'users', 'partners', 'delivery_partners', 'payments', 'order_items', 'delivery'];
    
    for (const row of results) {
      const tableName = Object.values(row)[0] as string;
      if (tablesToDescribe.some(t => tableName.includes(t))) {
        db.query(`DESCRIBE \`${tableName}\``, (err: any, desc: any) => {
          if (err) console.error(err);
          console.log(`\nSCHEMA FOR ${tableName}:`);
          console.log(desc);
        });
      }
    }
    setTimeout(() => process.exit(0), 3000);
  });
}

inspect();

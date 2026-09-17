const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "villagemart_db",
});

db.query("DESCRIBE orders", (err, results) => {
  if (err) throw err;
  console.table(results);
  db.end();
});

import db from "./src/db";

db.query("DESCRIBE orders", (err, results) => {
  if (err) console.error(err);
  else console.log(results);
  process.exit();
});

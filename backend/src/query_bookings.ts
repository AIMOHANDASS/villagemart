import db from "./db";

db.query("SELECT * FROM transport_bookings LIMIT 3", (err: any, rows: any[]) => {
  if (err) {
    console.error(err);
  } else {
    console.log(JSON.stringify(rows, null, 2));
  }
  process.exit();
});

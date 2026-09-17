import db from "./src/db";

db.query("DESCRIBE transport_bookings", (err, results) => {
  if (err) {
    console.error(err);
  } else {
    console.log(results);
  }
  process.exit();
});

import db from "./src/db";

const columns = [
  "tb.ride_completed_at",
  "tb.payment_method",
  "tb.payment_status",
  "tb.vehicle_type",
  "tp.vehicle_model"
];

const checkColumn = (col: string) => {
  return new Promise((resolve) => {
    let sql = `SELECT ${col} FROM transport_bookings tb LIMIT 1`;
    if (col.startsWith("tp.")) {
      sql = `SELECT ${col} FROM transport_partners tp LIMIT 1`;
    }
    db.query(sql, (err) => {
      if (err) {
        resolve(`${col} -> MISSING: ${err.message}`);
      } else {
        resolve(`${col} -> OK`);
      }
    });
  });
};

const run = async () => {
  for (const col of columns) {
    const res = await checkColumn(col);
    console.log(res);
  }
  process.exit(0);
};

run();

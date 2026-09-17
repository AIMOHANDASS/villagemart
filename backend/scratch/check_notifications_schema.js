const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'villagemart'
});

db.query('DESCRIBE notifications', (err, results) => {
  if (err) {
    console.error("Error describing notifications:", err);
  } else {
    console.log("Notifications Table Schema:");
    console.table(results);
  }
  process.exit();
});

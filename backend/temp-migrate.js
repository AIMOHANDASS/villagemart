const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "village_mart"
});

const sql1 = `
CREATE TABLE IF NOT EXISTS user_addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  address_label VARCHAR(50) DEFAULT 'Home',
  full_address TEXT NOT NULL,
  landmark VARCHAR(255) DEFAULT NULL,
  latitude DOUBLE DEFAULT NULL,
  longitude DOUBLE DEFAULT NULL,
  is_selected TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const sql2 = `
CREATE INDEX idx_user_addresses_active ON user_addresses (user_id, is_selected);
`;

connection.connect((err) => {
  if (err) throw err;
  console.log("Connected to DB.");

  connection.query(sql1, (err) => {
    if (err) {
      console.error("Error creating table:", err);
      process.exit(1);
    }
    console.log("Table 'user_addresses' created or exists.");

    connection.query(sql2, (err) => {
      if (err) {
        if (err.code === 'ER_DUP_KEYNAME') {
            console.log("Index already exists.");
        } else {
            console.error("Error creating index:", err);
            process.exit(1);
        }
      } else {
        console.log("Index 'idx_user_addresses_active' created.");
      }
      
      connection.end();
      process.exit(0);
    });
  });
});

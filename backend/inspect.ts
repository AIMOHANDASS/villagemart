import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const poolOptions: any = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: '127.0.0.1',
  port: 3306
};

async function inspectDB() {
    try {
        const connection = await mysql.createConnection(poolOptions);
        console.log("Connected to database");
        
        const [tables] = await connection.query('SHOW TABLES');
        console.log("=== TABLES ===");
        console.log(tables);

        const [columns] = await connection.query('DESCRIBE products');
        console.log("\n=== PRODUCTS TABLE SCHEMA ===");
        console.log(columns);

        const [sampleProducts] = await connection.query('SELECT id, E_name, category FROM products LIMIT 5');
        console.log("\n=== SAMPLE PRODUCTS ===");
        console.log(sampleProducts);

        await connection.end();
    } catch (error) {
        console.error("Database connection failed:", error);
    }
}

inspectDB();

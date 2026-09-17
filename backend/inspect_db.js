const mysql = require('mysql2/promise');

async function inspectDB() {
    try {
        const connection = await mysql.createConnection({
            host: '127.0.0.1', // Assuming there's a proxy or it can be accessed locally? Wait, it says /cloudsql/villagemart-c7f3d...
            user: 'villagesmart',
            password: 'Mohan@115',
            database: 'villagemart',
            // if socketPath is needed: socketPath: '/cloudsql/villagemart-c7f3d:asia-south1:villagesmart'
        });

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

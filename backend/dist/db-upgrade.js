"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upgradeDatabase = void 0;
const db_1 = __importDefault(require("./db"));
const upgradeDatabase = () => {
    console.log("🛠 Starting database upgrade...");
    // 1. Add OTP column to bookings for ride start verification
    db_1.default.query("ALTER TABLE transport_bookings ADD COLUMN IF NOT EXISTS ride_otp VARCHAR(6)", (err) => {
        if (!err)
            console.log("✅ Column 'ride_otp' ensured in transport_bookings");
    });
    // 2. Add driver_id to bookings to track assignments
    db_1.default.query("ALTER TABLE transport_bookings ADD COLUMN IF NOT EXISTS driver_id INT", (err) => {
        if (!err)
            console.log("✅ Column 'driver_id' ensured in transport_bookings");
    });
    // 3. Ensure partners table has necessary fields
    db_1.default.query("ALTER TABLE transport_partners ADD COLUMN IF NOT EXISTS status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'", (err) => {
        if (!err)
            console.log("✅ Column 'status' ensured in transport_partners");
    });
    // 4. Add delivery OTP column to orders for secure delivery handshake
    db_1.default.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(6) NULL", (err) => {
        if (!err)
            console.log("✅ Column 'delivery_otp' ensured in orders");
    });
    // 5. Add vehicle_type column to transport_bookings for vehicle class pricing
    db_1.default.query("ALTER TABLE transport_bookings ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(30) DEFAULT 'auto'", (err) => {
        if (!err)
            console.log("✅ Column 'vehicle_type' ensured in transport_bookings");
    });
    // 6. Ensure orders table columns for delivery flow
    db_1.default.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'PENDING'", (err) => {
        if (!err)
            console.log("✅ Column 'delivery_status' ensured in orders");
    });
    // 6.b FORCE modify delivery_status to VARCHAR(50) to fix Data Truncated error for ENUM
    db_1.default.query("ALTER TABLE orders MODIFY delivery_status VARCHAR(50) DEFAULT 'PENDING'", (err) => {
        if (!err)
            console.log("✅ Column 'delivery_status' widened to VARCHAR(50)");
    });
    db_1.default.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_partner_id INT NULL", (err) => {
        if (!err)
            console.log("✅ Column 'delivery_partner_id' ensured in orders");
    });
    db_1.default.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS `picked at` DATETIME NULL", (err) => {
        if (!err)
            console.log("✅ Column 'picked at' ensured in orders");
    });
    db_1.default.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS out_for_delivery_at DATETIME NULL", (err) => {
        if (!err)
            console.log("✅ Column 'out_for_delivery_at' ensured in orders");
    });
    db_1.default.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS `delivered at` DATETIME NULL", (err) => {
        if (!err)
            console.log("✅ Column 'delivered at' ensured in orders");
    });
    // 7. ✅ NEW: Ensure tracking_status column exists on orders
    db_1.default.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_status VARCHAR(50) DEFAULT 'PENDING'", (err) => {
        if (!err)
            console.log("✅ Column 'tracking_status' ensured in orders");
    });
    // 7.b FORCE modify tracking_status to VARCHAR(50)
    db_1.default.query("ALTER TABLE orders MODIFY tracking_status VARCHAR(50) DEFAULT 'PENDING'", (err) => {
        if (!err)
            console.log("✅ Column 'tracking_status' widened to VARCHAR(50)");
    });
    // 7.c FORCE modify status to VARCHAR(50)
    db_1.default.query("ALTER TABLE orders MODIFY status VARCHAR(50) DEFAULT 'PENDING'", (err) => {
        if (!err)
            console.log("✅ Column 'status' widened to VARCHAR(50)");
    });
    // 8. ✅ NEW: Ensure delivery_fee column exists on orders
    db_1.default.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0", (err) => {
        if (!err)
            console.log("✅ Column 'delivery_fee' ensured in orders");
    });
    // 9. ✅ NEW: Ensure ride_status ENUM column exists on transport_bookings
    db_1.default.query("ALTER TABLE transport_bookings ADD COLUMN IF NOT EXISTS ride_status ENUM('BOOKED', 'ACCEPTED', 'STARTED', 'COMPLETED') DEFAULT 'BOOKED'", (err) => {
        if (!err)
            console.log("✅ Column 'ride_status' ensured in transport_bookings");
    });
    // 10. ✅ NEW: Ensure driver_id column exists on transport_bookings
    db_1.default.query("ALTER TABLE transport_bookings ADD COLUMN IF NOT EXISTS driver_id INT NULL", (err) => {
        if (!err)
            console.log("✅ Column 'driver_id' ensured in transport_bookings");
    });
    // 11. ✅ NEW: Ensure `cancel reason` column exists on orders
    db_1.default.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS `cancel reason` TEXT NULL", (err) => {
        if (!err)
            console.log("✅ Column 'cancel reason' ensured in orders");
    });
    // 12. ✅ FIX: Widen products.category from ENUM to VARCHAR(100) to prevent "Data truncated" errors
    db_1.default.query("ALTER TABLE products MODIFY category VARCHAR(100) NOT NULL", (err) => {
        if (!err)
            console.log("✅ Column 'category' widened to VARCHAR(100) in products");
    });
    // 13. ✅ FIX: Widen products.product_type to prevent "Data truncated" errors when inserting 'other'
    db_1.default.query("ALTER TABLE products MODIFY product_type VARCHAR(50) DEFAULT 'other'", (err) => {
        if (!err)
            console.log("✅ Column 'product_type' widened to VARCHAR(50) in products");
    });
    // 14. ✅ NEW: Create system_settings table for global configuration flags (vehicle availability, etc.)
    db_1.default.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            setting_key VARCHAR(100) NOT NULL UNIQUE,
            setting_value VARCHAR(255) NOT NULL DEFAULT 'true',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_setting_key (setting_key)
        )
    `, (err) => {
        if (err) {
            console.error("❌ Failed to create system_settings table:", err.message);
        }
        else {
            console.log("✅ Table 'system_settings' ensured");
            // Seed default vehicle service availability flags (all enabled)
            const seedSql = `
                INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES
                ('service_active_scooter', 'true'),
                ('service_active_bike', 'true'),
                ('service_active_auto', 'true'),
                ('service_active_car', 'true')
            `;
            db_1.default.query(seedSql, (seedErr) => {
                if (!seedErr)
                    console.log("✅ Default vehicle service flags seeded in system_settings");
            });
        }
    });
    // 15. ✅ NEW: Commission Deadline & Account Blocking (Transport)
    db_1.default.query(`
        ALTER TABLE transport_partners 
        ADD COLUMN IF NOT EXISTS pending_commission DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS commission_deadline DATETIME DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS account_status ENUM('APPROVED', 'PENDING', 'BLOCKED') DEFAULT 'APPROVED'
    `, (err) => {
        if (!err)
            console.log("✅ Commission tracking columns ensured in transport_partners");
    });
    // 16. ✅ NEW: Commission Deadline & Account Blocking (Delivery)
    db_1.default.query(`
        ALTER TABLE delivery_partners 
        ADD COLUMN IF NOT EXISTS pending_commission DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS commission_deadline DATETIME DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS account_status ENUM('APPROVED', 'PENDING', 'BLOCKED') DEFAULT 'APPROVED'
    `, (err) => {
        if (!err)
            console.log("✅ Commission tracking columns ensured in delivery_partners");
    });
    // 17. ✅ NEW: Cron Optimization Indexes
    db_1.default.query(`CREATE INDEX IF NOT EXISTS idx_transport_commission ON transport_partners (account_status, commission_deadline)`, (err) => {
        if (!err)
            console.log("✅ Index 'idx_transport_commission' ensured");
    });
    db_1.default.query(`CREATE INDEX IF NOT EXISTS idx_delivery_commission ON delivery_partners (account_status, commission_deadline)`, (err) => {
        if (!err)
            console.log("✅ Index 'idx_delivery_commission' ensured");
    });
};
exports.upgradeDatabase = upgradeDatabase;
// Auto-run on import (server.ts uses side-effect import)
(0, exports.upgradeDatabase)();

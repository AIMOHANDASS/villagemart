import db from "./db";

// Safe column addition helper (avoids syntax errors on MySQL < 8.0.19)
const ensureColumn = (table: string, column: string, definition: string) => {
    db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`, (err: any) => {
        if (!err) {
            console.log(`✅ Column '${column}' ensured/added in ${table}`);
        } else if (err.code === 'ER_DUP_FIELDNAME' || err.errno === 1060) {
            console.log(`✅ Column '${column}' already exists in ${table}`);
        } else {
            console.error(`❌ Failed to add column '${column}' to ${table}:`, err.message);
        }
    });
};

// Safe index creation helper (avoids syntax errors on all MySQL versions)
const ensureIndex = (table: string, indexName: string, columns: string) => {
    db.query(`ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (${columns})`, (err: any) => {
        if (!err) {
            console.log(`✅ Index '${indexName}' ensured/created on ${table}`);
        } else if (err.code === 'ER_DUP_KEYNAME' || err.errno === 1061) {
            console.log(`✅ Index '${indexName}' already exists on ${table}`);
        } else {
            console.error(`❌ Failed to create index '${indexName}' on ${table}:`, err.message);
        }
    });
};

// Safe FULLTEXT index creation helper (requires separate DDL from regular indexes)
const ensureFulltextIndex = (table: string, indexName: string, columns: string) => {
    db.query(`ALTER TABLE \`${table}\` ADD FULLTEXT INDEX \`${indexName}\` (${columns})`, (err: any) => {
        if (!err) {
            console.log(`✅ Fulltext Index '${indexName}' ensured/created on ${table}`);
        } else if (err.code === 'ER_DUP_KEYNAME' || err.errno === 1061) {
            console.log(`✅ Fulltext Index '${indexName}' already exists on ${table}`);
        } else {
            console.error(`❌ Failed to create fulltext index '${indexName}' on ${table}:`, err.message);
        }
    });
};

export const upgradeDatabase = () => {
    console.log("🛠 Starting database upgrade...");

    // 0. Ensure wishlist table exists
    db.query(`
        CREATE TABLE IF NOT EXISTS wishlist (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            product_id INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_product (user_id, product_id)
        )
    `, (err: any) => {
        if (!err) console.log("✅ Table 'wishlist' ensured");
        else console.error("❌ Wishlist table creation error:", err.message);
    });

    // Ensure profile_completed column exists in users table
    ensureColumn("users", "profile_completed", "TINYINT(1) DEFAULT 0");

    // 1. Add OTP column to bookings for ride start verification
    ensureColumn("transport_bookings", "ride_otp", "VARCHAR(6) NULL");

    // 2. Add driver_id to bookings to track assignments
    ensureColumn("transport_bookings", "driver_id", "INT NULL");

    // 3. Ensure partners table has status
    ensureColumn("transport_partners", "status", "ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'");

    // 4. Add delivery OTP column to orders for secure delivery handshake
    ensureColumn("orders", "delivery_otp", "VARCHAR(6) NULL");

    // 5. Add vehicle_type column to transport_bookings for vehicle class pricing
    ensureColumn("transport_bookings", "vehicle_type", "VARCHAR(30) DEFAULT 'auto'");

    // 6. Ensure orders table columns for delivery flow
    ensureColumn("orders", "delivery_status", "VARCHAR(50) DEFAULT 'PENDING'");

    // 6.b FORCE modify delivery_status to VARCHAR(50) to fix Data Truncated error for ENUM
    db.query("ALTER TABLE orders MODIFY delivery_status VARCHAR(50) DEFAULT 'PENDING'", (err) => {
        if (!err) console.log("✅ Column 'delivery_status' widened to VARCHAR(50)");
    });

    ensureColumn("orders", "delivery_partner_id", "INT NULL");
    ensureColumn("orders", "picked at", "DATETIME NULL");

    db.query("ALTER TABLE orders ADD COLUMN out_for_delivery_at DATETIME NULL", (err: any) => {
        if (!err) console.log("✅ Column 'out_for_delivery_at' ensured in orders");
        else if (err.code !== 'ER_DUP_FIELDNAME' && err.errno !== 1060) {
            console.error("❌ out_for_delivery_at error:", err.message);
        }
    });

    db.query("ALTER TABLE orders ADD COLUMN delivery_latitude NUMERIC(10, 7) NULL", (err: any) => {
        if (!err) console.log("✅ Column 'delivery_latitude' ensured in orders");
        else if (err.code !== 'ER_DUP_FIELDNAME' && err.errno !== 1060) {
            console.error("❌ delivery_latitude error:", err.message);
        }
    });

    // Ensure Razorpay columns for Product Orders
    ensureColumn("orders", "razorpay_order_id", "VARCHAR(255) NULL");
    ensureColumn("orders", "razorpay_payment_id", "VARCHAR(255) NULL");
    ensureColumn("orders", "razorpay_signature", "VARCHAR(255) NULL");


    db.query("ALTER TABLE orders ADD COLUMN delivery_longitude NUMERIC(10, 7) NULL", (err: any) => {
        if (!err) console.log("✅ Column 'delivery_longitude' ensured in orders");
        else if (err.code !== 'ER_DUP_FIELDNAME' && err.errno !== 1060) {
            console.error("❌ delivery_longitude error:", err.message);
        }
    });

    db.query("ALTER TABLE orders ADD COLUMN `delivered at` DATETIME NULL", (err: any) => {
        if (!err) console.log("✅ Column 'delivered at' ensured in orders");
        else if (err.code !== 'ER_DUP_FIELDNAME' && err.errno !== 1060) {
            console.error("❌ delivered at error:", err.message);
        }
    });

    // 7. ✅ NEW: Ensure tracking_status column exists on orders
    db.query("ALTER TABLE orders ADD COLUMN tracking_status VARCHAR(50) DEFAULT 'PENDING'", (err: any) => {
        if (!err) console.log("✅ Column 'tracking_status' ensured in orders");
        else if (err.code !== 'ER_DUP_FIELDNAME' && err.errno !== 1060) {
            console.error("❌ tracking_status error:", err.message);
        }
    });
    
    // 7.b FORCE modify tracking_status to VARCHAR(50)
    db.query("ALTER TABLE orders MODIFY tracking_status VARCHAR(50) DEFAULT 'PENDING'", (err) => {
        if (!err) console.log("✅ Column 'tracking_status' widened to VARCHAR(50)");
    });

    // 7.c FORCE modify status to VARCHAR(50)
    db.query("ALTER TABLE orders MODIFY status VARCHAR(50) DEFAULT 'PENDING'", (err) => {
        if (!err) console.log("✅ Column 'status' widened to VARCHAR(50)");
    });

    // 8. ✅ NEW: Ensure delivery_fee column exists on orders
    ensureColumn("orders", "delivery_fee", "DECIMAL(10,2) DEFAULT 0");

    // 9. ✅ NEW: Ensure ride_status ENUM column exists on transport_bookings
    ensureColumn("transport_bookings", "ride_status", "ENUM('BOOKED', 'ACCEPTED', 'STARTED', 'COMPLETED') DEFAULT 'BOOKED'");
    db.query("ALTER TABLE transport_bookings MODIFY COLUMN ride_status ENUM('BOOKED', 'ACCEPTED', 'STARTED', 'COMPLETED') DEFAULT 'BOOKED'", (err) => {
        if (!err) console.log("✅ Column 'ride_status' widened to ENUM('BOOKED', 'ACCEPTED', 'STARTED', 'COMPLETED') in transport_bookings");
    });

    // 10. ✅ NEW: Ensure driver_id column exists on transport_bookings
    ensureColumn("transport_bookings", "driver_id", "INT NULL");

    // 10.a ✅ NEW: Transport Booking Payment Columns
    ensureColumn("transport_bookings", "payment_method", "VARCHAR(20) DEFAULT 'CASH'");
    ensureColumn("transport_bookings", "payment_status", "ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED') DEFAULT 'PENDING'");
    ensureColumn("transport_bookings", "payment_transaction_id", "VARCHAR(100)");
    ensureColumn("transport_bookings", "cash_collected_at", "TIMESTAMP NULL");
    ensureColumn("transport_bookings", "cash_collected_by", "INT NULL");

    // 10.b NEW: Tracking and History columns for transport_bookings
    ensureColumn("transport_bookings", "driver_assigned_at", "DATETIME NULL");
    ensureColumn("transport_bookings", "driver_accepted_at", "DATETIME NULL");
    ensureColumn("transport_bookings", "driver_arrived_at", "DATETIME NULL");
    ensureColumn("transport_bookings", "ride_started_at", "DATETIME NULL");
    ensureColumn("transport_bookings", "ride_completed_at", "DATETIME NULL");
    ensureColumn("transport_bookings", "ride_cancelled_at", "DATETIME NULL");
    ensureColumn("transport_bookings", "driver_rating", "INT NULL");
    ensureColumn("transport_bookings", "driver_rating_comment", "TEXT NULL");
    ensureColumn("transport_bookings", "support_ticket", "VARCHAR(255) NULL");
    ensureColumn("transport_bookings", "payment_method", "VARCHAR(50) DEFAULT 'CASH'");
    db.query("ALTER TABLE transport_bookings MODIFY COLUMN payment_method VARCHAR(50) DEFAULT 'CASH'", (err) => {
        if (!err) console.log("✅ Column 'payment_method' widened to VARCHAR(50) in transport_bookings");
    });
    ensureColumn("transport_bookings", "transaction_id", "VARCHAR(255) NULL");
    ensureColumn("transport_bookings", "payment_status", "VARCHAR(50) DEFAULT 'PENDING'");
    ensureColumn("transport_bookings", "booking_number", "VARCHAR(50) NULL UNIQUE");

    // 10.c ✅ NEW: Backfill transport_bookings missing booking_number
    db.query("UPDATE transport_bookings SET booking_number = CONCAT('TRN-', id) WHERE booking_number IS NULL OR booking_number = ''", (err, result: any) => {
        if (!err && result?.affectedRows > 0) console.log(`✅ Backfilled ${result.affectedRows} booking_numbers in transport_bookings`);
    });

    // 10.d ✅ NEW: Widen ride_status ENUM to include CANCELLED for customer ride cancellation
    db.query("ALTER TABLE transport_bookings MODIFY COLUMN ride_status ENUM('BOOKED', 'ACCEPTED', 'STARTED', 'COMPLETED', 'CANCELLED') DEFAULT 'BOOKED'", (err) => {
        if (!err) console.log("✅ Column 'ride_status' widened to include CANCELLED in transport_bookings");
    });

    // 11. ✅ NEW: Ensure `cancel reason` column exists on orders
    ensureColumn("orders", "cancel reason", "TEXT NULL");

    // 12. ✅ FIX: Widen products.category from ENUM to VARCHAR(100) to prevent "Data truncated" errors
    db.query("ALTER TABLE products MODIFY category VARCHAR(100) NOT NULL", (err) => {
        if (!err) console.log("✅ Column 'category' widened to VARCHAR(100) in products");
    });

    // 13. ✅ FIX: Widen products.product_type to prevent "Data truncated" errors when inserting 'other'
    db.query("ALTER TABLE products MODIFY product_type VARCHAR(50) DEFAULT 'other'", (err) => {
        if (!err) console.log("✅ Column 'product_type' widened to VARCHAR(50) in products");
    });

    // 13.b ✅ NEW: Ensure products table has legacy 'imageurl' column if missing
    db.query("ALTER TABLE products ADD COLUMN imageurl TEXT NULL", (err: any) => {
        if (!err) console.log("✅ Column 'imageurl' ensured in products");
        else if (err.code !== 'ER_DUP_FIELDNAME' && err.errno !== 1060) {
            console.error("❌ Failed to add imageurl column to products:", err.message);
        }
    });

    // 14. ✅ NEW: Create system_settings table for global configuration flags (vehicle availability, etc.)
    db.query(`
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
        } else {
            console.log("✅ Table 'system_settings' ensured");

            // Seed default vehicle service availability flags (all enabled)
            const seedSql = `
                INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES
                ('service_active_scooter', 'true'),
                ('service_active_bike', 'true'),
                ('service_active_auto', 'true'),
                ('service_active_car', 'true'),
                ('party_hall_service_available', 'true')
            `;
            db.query(seedSql, (seedErr) => {
                if (!seedErr) console.log("✅ Default service setting flags seeded in system_settings");
            });
        }
    });

    // 15. ✅ NEW: Commission Deadline & Account Blocking (Transport)
    ensureColumn("transport_partners", "pending_commission", "DECIMAL(10,2) DEFAULT 0.00");
    ensureColumn("transport_partners", "commission_deadline", "DATETIME DEFAULT NULL");
    ensureColumn("transport_partners", "commission_due_since", "DATETIME DEFAULT NULL");
    ensureColumn("transport_partners", "account_status", "ENUM('APPROVED', 'PENDING', 'BLOCKED') DEFAULT 'APPROVED'");
    ensureColumn("transport_partners", "reset_otp", "VARCHAR(6) DEFAULT NULL");
    ensureColumn("transport_partners", "reset_otp_expiry", "DATETIME DEFAULT NULL");
    ensureColumn("transport_partners", "commission_warning_sent", "TINYINT DEFAULT 0");
    ensureColumn("transport_partners", "blocking_reason", "VARCHAR(255) DEFAULT NULL");
    
    // 16. ✅ NEW: Commission Deadline & Account Blocking (Delivery)
    ensureColumn("delivery_partners", "pending_commission", "DECIMAL(10,2) DEFAULT 0.00");
    ensureColumn("delivery_partners", "commission_deadline", "DATETIME DEFAULT NULL");
    ensureColumn("delivery_partners", "commission_due_since", "DATETIME DEFAULT NULL");
    ensureColumn("delivery_partners", "account_status", "ENUM('APPROVED', 'PENDING', 'BLOCKED') DEFAULT 'APPROVED'");
    ensureColumn("delivery_partners", "reset_otp", "VARCHAR(6) DEFAULT NULL");
    ensureColumn("delivery_partners", "reset_otp_expiry", "DATETIME DEFAULT NULL");
    ensureColumn("delivery_partners", "commission_warning_sent", "TINYINT DEFAULT 0");
    ensureColumn("delivery_partners", "blocking_reason", "VARCHAR(255) DEFAULT NULL");

    // 17. ✅ NEW: Cron Optimization Indexes
    ensureIndex("transport_partners", "idx_transport_commission", "`account_status`, `commission_deadline`");
    ensureIndex("delivery_partners", "idx_delivery_commission", "`account_status`, `commission_deadline`");

    // 18. ✅ NEW: product_images table for multi-image product mappings
    db.query(`
        CREATE TABLE IF NOT EXISTS product_images (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL,
            image_url LONGTEXT NOT NULL,
            sort_order INT DEFAULT 0,
            slot_index INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_product_images_product_id (product_id)
        )
    `, (err) => {
        if (err) {
            console.error("❌ Failed to create product_images table:", err.message);
        } else {
            console.log("✅ Table 'product_images' ensured");
            // Widen image_url to LONGTEXT so base64 uploads never get truncated
            db.query("ALTER TABLE `product_images` MODIFY COLUMN `image_url` LONGTEXT NOT NULL", (alterErr) => {
                if (!alterErr) console.log("✅ Column 'image_url' widened to LONGTEXT in product_images");
            });
            ensureColumn("product_images", "slot_index", "INT DEFAULT 1");
        }
    });

    // Widen primary product imageurl to LONGTEXT as well
    db.query("ALTER TABLE `products` MODIFY COLUMN `imageurl` LONGTEXT", (alterErr) => {
        if (!alterErr) console.log("✅ Column 'imageurl' widened to LONGTEXT in products");
    });

    // 19. Ensure users table has pincode column
    ensureColumn("users", "pincode", "VARCHAR(10) NULL");

    // 20. ✅ FIX: Ensure users table has account_status column
    ensureColumn("users", "account_status", "ENUM('APPROVED', 'PENDING', 'BLOCKED') DEFAULT 'APPROVED'");

    // 21.b ✅ NEW: Ensure reviews table schema (id, order_id, product_id, user_id, rating, comment, created_at)
    db.query(`
        CREATE TABLE IF NOT EXISTS reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NULL,
            product_id INT NULL,
            user_id INT NOT NULL,
            rating INT NOT NULL DEFAULT 5,
            comment TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_reviews_product_id (product_id),
            INDEX idx_reviews_user_id (user_id)
        )
    `, (err) => {
        if (!err) console.log("✅ Table 'reviews' ensured");
    });
    ensureColumn("reviews", "order_id", "INT NULL");
    ensureColumn("reviews", "product_id", "INT NULL");
    ensureColumn("reviews", "user_id", "INT NULL");
    ensureColumn("reviews", "rating", "INT DEFAULT 5");
    ensureColumn("reviews", "comment", "TEXT NULL");
    ensureColumn("reviews", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

    // 21.c ✅ NEW: Ensure support_tickets table schema
    db.query(`
        CREATE TABLE IF NOT EXISTS support_tickets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            ride_id INT NOT NULL,
            issue TEXT NOT NULL,
            status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED') DEFAULT 'OPEN',
            priority ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') DEFAULT 'NORMAL',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_support_ride (ride_id),
            INDEX idx_support_user (user_id)
        )
    `, (err) => {
        if (!err) console.log("✅ Table 'support_tickets' ensured");
    });

    // 22. ✅ NEW: Backfill outstanding commissions based on completed rides/deliveries (exactly once)
    db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'commission_backfill_done'", (err, settingRows: any[]) => {
      if (!err && (!settingRows || settingRows.length === 0)) {
        console.log("🛠 Running one-time commission backfill...");
        const transportBackfillSql = `
          SELECT driver_id, SUM(charge_amount * 0.10) as total_comm, MIN(\`created at\`) as first_completed
          FROM transport_bookings
          WHERE status = 'COMPLETED' AND driver_id IS NOT NULL
          GROUP BY driver_id
        `;
        db.query(transportBackfillSql, (err, rows: any[]) => {
          if (!err && rows) {
            rows.forEach((row) => {
              const { driver_id, total_comm, first_completed } = row;
              if (total_comm > 0) {
                const firstCompletedDate = new Date(first_completed);
                const deadlineHours = Number(process.env.COMMISSION_DEADLINE_HOURS) || 24;
                const deadlineDate = new Date(firstCompletedDate.getTime() + (deadlineHours * 60 * 60 * 1000));
                
                db.query(
                  `UPDATE transport_partners 
                   SET pending_commission = ?, 
                       wallet_balance = -?, 
                       commission_due_since = ?, 
                       commission_deadline = ? 
                   WHERE id = ? AND pending_commission = 0.00`,
                  [total_comm, total_comm, firstCompletedDate, deadlineDate, driver_id]
                );
              }
            });
          }
        });

        const deliveryBackfillSql = `
          SELECT delivery_partner_id, SUM(delivery_fee * 0.10) as total_comm, MIN(\`created at\`) as first_completed
          FROM orders
          WHERE tracking_status = 'DELIVERED' AND delivery_partner_id IS NOT NULL
          GROUP BY delivery_partner_id
        `;
        db.query(deliveryBackfillSql, (err, rows: any[]) => {
          if (!err && rows) {
            rows.forEach((row) => {
              const { delivery_partner_id, total_comm, first_completed } = row;
              if (total_comm > 0) {
                const firstCompletedDate = new Date(first_completed);
                const deadlineHours = Number(process.env.COMMISSION_DEADLINE_HOURS) || 24;
                const deadlineDate = new Date(firstCompletedDate.getTime() + (deadlineHours * 60 * 60 * 1000));
                
                db.query(
                  `UPDATE delivery_partners 
                   SET pending_commission = ?, 
                       wallet_balance = -?, 
                       commission_due_since = ?, 
                       commission_deadline = ? 
                   WHERE id = ? AND pending_commission = 0.00`,
                  [total_comm, total_comm, firstCompletedDate, deadlineDate, delivery_partner_id]
                );
              }
            });
          }
        });

        db.query("INSERT INTO system_settings (setting_key, setting_value) VALUES ('commission_backfill_done', 'true')");
      }
    });

    // 23. ✅ NEW: One-time unblock for driver #3 (VM-DR-003) to clear outstanding balances from backfill bug
    db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'unblock_driver_3_done'", (err, settingRows: any[]) => {
      if (!err && (!settingRows || settingRows.length === 0)) {
        db.query(
          `UPDATE transport_partners 
           SET wallet_balance = 0.00, 
               pending_commission = 0.00,
               commission_deadline = NULL,
               commission_due_since = NULL,
               account_status = 'APPROVED'
           WHERE id = 3`,
          (updateErr) => {
            if (!updateErr) {
              console.log("✅ Driver #3 (VM-DR-003) balance cleared and unblocked successfully via upgrade migration!");
              db.query("INSERT INTO system_settings (setting_key, setting_value) VALUES ('unblock_driver_3_done', 'true')");
            }
          }
        );
      }
    });

    // 24. Ensure district and taluk columns exist for partner forms
    ensureColumn("transport_partners", "district", "VARCHAR(100) NULL");
    ensureColumn("transport_partners", "taluk", "VARCHAR(100) NULL");
    ensureColumn("delivery_partners", "district", "VARCHAR(100) NULL");
    ensureColumn("delivery_partners", "taluk", "VARCHAR(100) NULL");

    // ── 25. Performance Indexes for Products Pagination ──────────────────
    // Composite index: category filtering + DESC ordering
    ensureIndex("products", "idx_products_category_id", "category, id");
    // Date-based sorting index
    ensureIndex("products", "idx_products_created_id", "created_at, id");
    // Composite index on product_images for faster JOINs
    ensureIndex("product_images", "idx_product_images_product_slot", "product_id, slot_index");
    // Fulltext index for search across English and Tamil names
    ensureFulltextIndex("products", "idx_products_search", "E_name, T_name");

    // ── 25.b Performance Index for Order Fetching ──────────────────
    ensureIndex("orders", "idx_orders_user_id_id", "`user id`, id");

    // ── 26. Multi-Admin & User Deletion Upgrade ──────────────────
    ensureColumn("users", "is_deleted", "TINYINT(1) DEFAULT 0");

    db.query(`
        CREATE TABLE IF NOT EXISTS admins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            username VARCHAR(255) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            permissions TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (!err) {
            console.log("✅ Table 'admins' ensured");
            ensureColumn("admins", "permissions", "TEXT NULL");
            
            // Seed Super Admin Mohan (password 'mohan123') if empty
            db.query("SELECT id FROM admins WHERE id = 1 LIMIT 1", async (checkErr, rows: any[]) => {
                if (!checkErr && (!rows || rows.length === 0)) {
                    const bcrypt = await import("bcryptjs");
                    const hashedPassword = bcrypt.hashSync("mohan123", 10);
                    const defaultPerms = JSON.stringify([
                        "dashboard",
                        "orders",
                        "products",
                        "users",
                        "partners",
                        "transport",
                        "party-hall"
                    ]);
                    db.query(
                        "INSERT IGNORE INTO admins (id, name, username, email, password, permissions) VALUES (1, 'Admin Mohan', 'Mohan', 'mohan@villagesmart.in', ?, ?)",
                        [hashedPassword, defaultPerms],
                        (insertErr) => {
                            if (!insertErr) console.log("✅ Super Admin 'Mohan' seeded successfully with id = 1");
                            else console.error("❌ Seeding Super Admin failed:", insertErr.message);
                        }
                    );
                }
            });
        } else {
            console.error("❌ Failed to create admins table:", err.message);
        }
    });

    // ── 27. Dynamic Categories Migration ──────────────────
    db.query(`
        CREATE TABLE IF NOT EXISTS categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(120) NOT NULL UNIQUE,
            description TEXT NULL,
            icon VARCHAR(100) NULL,
            image_url VARCHAR(500) NULL,
            sort_order INT NOT NULL DEFAULT 0,
            is_visible BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (!err) {
            console.log("✅ Table 'categories' ensured");
            
            // Seed initial categories
            const initialCategories = [
                { id: 1, name: 'Village Specials', slug: 'village-specials', sort_order: 1, icon: '🌿' },
                { id: 2, name: 'Groceries', slug: 'groceries', sort_order: 2, icon: '🛒' },
                { id: 3, name: 'Dairy', slug: 'dairy', sort_order: 3, icon: '🥛' },
                { id: 4, name: 'Vegetables', slug: 'vegetables', sort_order: 4, icon: '🥕' },
                { id: 5, name: 'Fruits', slug: 'fruits', sort_order: 5, icon: '🍎' },
                { id: 6, name: 'Grains', slug: 'grains', sort_order: 6, icon: '🌾' },
                { id: 7, name: 'Garlands', slug: 'garlands', sort_order: 7, icon: '🌸' }
            ];

            const seedValues = initialCategories.map(c => `(${c.id}, '${c.name}', '${c.slug}', ${c.sort_order}, '${c.icon}')`).join(',');
            const seedSql = `INSERT IGNORE INTO categories (id, name, slug, sort_order, icon) VALUES ${seedValues}`;
            
            db.query(seedSql, (seedErr) => {
                if (!seedErr) {
                    console.log("✅ Initial categories seeded successfully");
                    
                    // Add category_id to products
                    ensureColumn("products", "category_id", "INT NULL");

                    // Backfill category_id for existing products based on string category
                    db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'category_migration_done'", (setErr, setRows: any[]) => {
                        if (!setErr && (!setRows || setRows.length === 0)) {
                            // Run the update
                            const updateSql = `
                                UPDATE products p 
                                JOIN categories c ON LOWER(TRIM(p.category)) = c.slug OR LOWER(TRIM(p.category)) = LOWER(c.name) OR p.category LIKE CONCAT('%', c.name, '%')
                                SET p.category_id = c.id
                                WHERE p.category_id IS NULL
                            `;
                            db.query(updateSql, (updateErr, result: any) => {
                                if (!updateErr) {
                                    console.log(`✅ Backfilled category_id for ${result?.affectedRows || 0} products`);
                                    
                                    // Set the flag
                                    db.query("INSERT INTO system_settings (setting_key, setting_value) VALUES ('category_migration_done', 'true')");
                                } else {
                                    console.error("❌ Failed to backfill category_id:", updateErr.message);
                                }
                            });
                        }
                    });
                } else {
                    console.error("❌ Failed to seed categories:", seedErr.message);
                }
            });
        } else {
            console.error("❌ Failed to create categories table:", err.message);
        }
    });

    // ==========================================
    // DELIVERY PARTNER COD SETTLEMENT TABLES
    // ==========================================

    db.query(`
        CREATE TABLE IF NOT EXISTS delivery_partner_cod_collections (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            order_id INT NOT NULL UNIQUE,
            partner_id INT NOT NULL,
            cod_amount DECIMAL(10,2) NOT NULL,
            collected_amount DECIMAL(10,2) DEFAULT 0.00,
            collection_status ENUM('PENDING', 'COLLECTED', 'CANCELLED') DEFAULT 'PENDING',
            settlement_status ENUM('PENDING', 'PAYMENT_REQUESTED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
            settlement_id BIGINT NULL,
            collected_at DATETIME NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY (partner_id) REFERENCES delivery_partners(id) ON DELETE CASCADE
        )
    `, (err: any) => {
        if (!err) {
            console.log("✅ Table 'delivery_partner_cod_collections' ensured");
            ensureColumn("delivery_partner_cod_collections", "customer_cash_collected", "DECIMAL(10,2) DEFAULT 0.00");
            ensureColumn("delivery_partner_cod_collections", "delivery_charge", "DECIMAL(10,2) DEFAULT 0.00");
            ensureColumn("delivery_partner_cod_collections", "partner_earning", "DECIMAL(10,2) DEFAULT 0.00");
            ensureColumn("delivery_partner_cod_collections", "settlement_payable", "DECIMAL(10,2) DEFAULT 0.00");
        }
        else console.error("❌ delivery_partner_cod_collections error:", err.message);
    });

    db.query(`
        CREATE TABLE IF NOT EXISTS delivery_partner_cod_settlements (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            settlement_reference VARCHAR(50) NOT NULL UNIQUE,
            partner_id INT NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            paid_amount DECIMAL(10,2) DEFAULT 0.00,
            status ENUM('PENDING', 'PAYMENT_REQUESTED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
            requested_at DATETIME NULL,
            paid_at DATETIME NULL,
            razorpay_order_id VARCHAR(100) NULL,
            razorpay_payment_id VARCHAR(100) NULL,
            razorpay_signature VARCHAR(255) NULL,
            payment_reference VARCHAR(100) NULL,
            created_by INT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (partner_id) REFERENCES delivery_partners(id) ON DELETE CASCADE
        )
    `, (err: any) => {
        if (!err) console.log("✅ Table 'delivery_partner_cod_settlements' ensured");
        else console.error("❌ delivery_partner_cod_settlements error:", err.message);
    });

    db.query(`
        CREATE TABLE IF NOT EXISTS delivery_partner_cod_settlement_items (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            settlement_id BIGINT NOT NULL,
            cod_collection_id BIGINT NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (settlement_id) REFERENCES delivery_partner_cod_settlements(id) ON DELETE CASCADE,
            FOREIGN KEY (cod_collection_id) REFERENCES delivery_partner_cod_collections(id) ON DELETE CASCADE,
            UNIQUE KEY unique_settlement_item (settlement_id, cod_collection_id)
        )
    `, (err: any) => {
        if (!err) console.log("✅ Table 'delivery_partner_cod_settlement_items' ensured");
        else console.error("❌ delivery_partner_cod_settlement_items error:", err.message);
    });
};

// Auto-run on import (server.ts uses side-effect import)
upgradeDatabase();

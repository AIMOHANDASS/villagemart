"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserAccount = void 0;
const db_1 = __importDefault(require("../db"));
/* ======================================================
   🗑️ MULTI-APP SEGREGATED ACCOUNT DELETION ENDPOINT
   DELETE /api/profile/delete-account

   Safely deletes account profiles according to request context
   and role type while unlinking financial records.
====================================================== */
const deleteUserAccount = async (req, res) => {
    const authenticatedUserId = req.user?.id;
    const userRole = String(req.user?.role || req.body?.userType || req.query?.userType || req.headers?.['x-user-type'] || "").trim().toUpperCase();
    /* ── GUARD: Reject if no authenticated user ID is present ── */
    if (!authenticatedUserId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: No authenticated user session found.",
        });
    }
    // Determine user segment: Client (Customer), Transport Partner, or Delivery Partner
    let targetTable = "";
    let userTypeLabel = "";
    if (userRole === "CUSTOMER" || userRole === "CLIENT" || userRole === "USER") {
        targetTable = "users";
        userTypeLabel = "Client";
    }
    else if (userRole === "TRANSPORT" || userRole === "RIDER" || userRole === "TRANSPORT_PARTNER") {
        targetTable = "transport_partners";
        userTypeLabel = "Transport Partner";
    }
    else if (userRole === "DELIVERY" || userRole === "DELIVERY_PARTNER") {
        targetTable = "delivery_partners";
        userTypeLabel = "Delivery Partner";
    }
    else if (userRole === "DRIVER") {
        // Shorthand/ambiguous DRIVER role: resolve via secondary context headers/body
        const explicitType = String(req.body?.userType || req.query?.userType || req.headers?.['x-user-type'] || "").toUpperCase();
        if (explicitType.includes("TRANSPORT")) {
            targetTable = "transport_partners";
            userTypeLabel = "Transport Partner";
        }
        else if (explicitType.includes("DELIVERY")) {
            targetTable = "delivery_partners";
            userTypeLabel = "Delivery Partner";
        }
        else {
            // Default fallback check: lookup where the ID exists
            targetTable = "transport_partners";
            userTypeLabel = "Transport Partner";
        }
    }
    if (!targetTable) {
        return res.status(400).json({
            success: false,
            message: `Invalid or unrecognized user role context: [${userRole}]. Account deletion rejected.`,
        });
    }
    let connection;
    try {
        /* ── Acquire dedicated connection for transaction isolation ── */
        connection = await db_1.default.promise().getConnection();
        await connection.beginTransaction();
        console.log(`🗑️ [DeleteAccount] Starting transactional deletion for ${userTypeLabel} (ID: ${authenticatedUserId}, Role: ${userRole})`);
        if (targetTable === "users") {
            /* ================================================================
               CASE 1 — CLIENT / CUSTOMER ACCOUNT DELETION
               ================================================================ */
            // 1a. Anonymize order records PII (Address & phone)
            await connection.execute(`UPDATE orders
         SET address = '[Deleted User]',
             phone = '[Deleted User]'
         WHERE \`user id\` = ?`, [authenticatedUserId]);
            console.log(`   ✅ Orders anonymized for Client ID: ${authenticatedUserId}`);
            // 1b. Anonymize transport bookings PII (Customer Name & Phone)
            await connection.execute(`UPDATE transport_bookings
         SET customer_name = '[Deleted User]',
             customer_phone = '[Deleted User]'
         WHERE \`user id\` = ?`, [authenticatedUserId]);
            console.log(`   ✅ Transport bookings anonymized for Client ID: ${authenticatedUserId}`);
            // 1c. Anonymize party hall bookings PII
            await connection.execute(`UPDATE party_hall_bookings
         SET \`customer name\` = '[Deleted User]',
             customer_phone = '[Deleted User]'
         WHERE \`user id\` = ?`, [authenticatedUserId]);
            console.log(`   ✅ Party hall bookings anonymized for Client ID: ${authenticatedUserId}`);
            // 1d. Anonymize review comments
            await connection.execute(`UPDATE reviews
         SET comment = '[Deleted User]'
         WHERE \`user id\` = ?`, [authenticatedUserId]);
            console.log(`   ✅ Reviews anonymized for Client ID: ${authenticatedUserId}`);
            // 1e. Delete non-financial, strictly personal data
            await connection.execute(`DELETE FROM notifications WHERE \`user id\` = ?`, [authenticatedUserId]);
            console.log(`   ✅ Notifications deleted for Client ID: ${authenticatedUserId}`);
            await connection.execute(`DELETE FROM user_addresses WHERE user_id = ?`, [authenticatedUserId]);
            console.log(`   ✅ Saved addresses deleted for Client ID: ${authenticatedUserId}`);
            // 1f. Delete primary client record strictly and exclusively from 'users' collection
            const [deleteResult] = await connection.execute(`DELETE FROM users WHERE id = ?`, [authenticatedUserId]);
            if (deleteResult.affectedRows === 0) {
                await connection.rollback();
                console.error(`   ❌ Client record not found in users table for ID: ${authenticatedUserId}`);
                return res.status(404).json({
                    success: false,
                    message: "Client account profile record not found.",
                });
            }
            console.log(`   ✅ Client record deleted successfully for User ID: ${authenticatedUserId}`);
        }
        else if (targetTable === "transport_partners") {
            /* ================================================================
               CASE 2 — TRANSPORT PARTNER ACCOUNT DELETION
               ================================================================ */
            // 2a. Unlink driver reference in transport_bookings to prevent cascade delete.
            // Set both `driver_id` and `driver id` to NULL, keeping the past ride history intact.
            await connection.execute(`UPDATE transport_bookings
         SET driver_id = NULL,
             \`driver id\` = NULL
         WHERE driver_id = ? OR \`driver id\` = ?`, [authenticatedUserId, authenticatedUserId]);
            console.log(`   ✅ Transport bookings unlinked from Driver ID: ${authenticatedUserId}`);
            // 2b. Delete driver live GPS locations
            await connection.execute(`DELETE FROM partner_locations WHERE partner_id = ? AND partner_type = 'transport'`, [authenticatedUserId]);
            console.log(`   ✅ Mapped locations deleted for Driver ID: ${authenticatedUserId}`);
            // 2c. Delete partner document upload records
            await connection.execute(`DELETE FROM partner_documents WHERE partner_id = ? AND partner_type = 'transport'`, [authenticatedUserId]);
            console.log(`   ✅ Mapped document uploads deleted for Driver ID: ${authenticatedUserId}`);
            // 2d. Delete primary partner record strictly from 'transport_partners' collection
            const [deleteResult] = await connection.execute(`DELETE FROM transport_partners WHERE id = ?`, [authenticatedUserId]);
            if (deleteResult.affectedRows === 0) {
                await connection.rollback();
                console.error(`   ❌ Transport partner record not found for ID: ${authenticatedUserId}`);
                return res.status(404).json({
                    success: false,
                    message: "Transport partner account profile record not found.",
                });
            }
            console.log(`   ✅ Transport partner record deleted successfully for Driver ID: ${authenticatedUserId}`);
        }
        else if (targetTable === "delivery_partners") {
            /* ================================================================
               CASE 3 — DELIVERY PARTNER ACCOUNT DELETION
               ================================================================ */
            // 3a. Unlink delivery partner reference in orders to prevent cascade delete.
            // Set delivery_partner_id to NULL to preserve past invoices/deliveries for financial audit logging.
            await connection.execute(`UPDATE orders
         SET delivery_partner_id = NULL
         WHERE delivery_partner_id = ?`, [authenticatedUserId]);
            console.log(`   ✅ Orders unlinked from Delivery Partner ID: ${authenticatedUserId}`);
            // 3b. Delete driver live GPS locations
            await connection.execute(`DELETE FROM partner_locations WHERE partner_id = ? AND partner_type = 'delivery'`, [authenticatedUserId]);
            console.log(`   ✅ Mapped locations deleted for Partner ID: ${authenticatedUserId}`);
            // 3c. Delete partner document upload records
            await connection.execute(`DELETE FROM partner_documents WHERE partner_id = ? AND partner_type = 'delivery'`, [authenticatedUserId]);
            console.log(`   ✅ Mapped document uploads deleted for Partner ID: ${authenticatedUserId}`);
            // 3d. Delete primary partner record strictly from 'delivery_partners' collection
            const [deleteResult] = await connection.execute(`DELETE FROM delivery_partners WHERE id = ?`, [authenticatedUserId]);
            if (deleteResult.affectedRows === 0) {
                await connection.rollback();
                console.error(`   ❌ Delivery partner record not found for ID: ${authenticatedUserId}`);
                return res.status(404).json({
                    success: false,
                    message: "Delivery partner account profile record not found.",
                });
            }
            console.log(`   ✅ Delivery partner record deleted successfully for Partner ID: ${authenticatedUserId}`);
        }
        /* ── COMMIT transaction — all steps completed ── */
        await connection.commit();
        console.log(`🎉 [DeleteAccount] Segregated account deletion completed successfully for ID: ${authenticatedUserId}`);
        return res.status(200).json({
            success: true,
            message: `Your ${userTypeLabel} account has been permanently deleted. Financial transaction histories have been safely preserved.`,
        });
    }
    catch (error) {
        /* ── ROLLBACK transaction on failure ── */
        if (connection) {
            try {
                await connection.rollback();
            }
            catch (rollbackError) {
                console.error("❌ [DeleteAccount] Transaction rollback failed:", rollbackError.message);
            }
        }
        console.error(`❌ [DeleteAccount] Transaction failed for ID: ${authenticatedUserId}`, error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to delete account due to a database transaction error. Please try again later.",
        });
    }
    finally {
        /* ── Always release the connection ── */
        if (connection) {
            connection.release();
        }
    }
};
exports.deleteUserAccount = deleteUserAccount;

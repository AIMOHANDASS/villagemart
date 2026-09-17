"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = exports.sendPushToUser = exports.createAndSendNotification = void 0;
const firebaseAdmin_1 = require("./firebaseAdmin");
const db_1 = __importDefault(require("../db"));
// Simple LRU-style cache for idempotency protection (60 seconds)
const notificationCache = new Map();
/**
 * Clean up expired items from the cache
 */
const cleanNotificationCache = () => {
    const now = Date.now();
    for (const [key, timestamp] of notificationCache.entries()) {
        if (now - timestamp > 60000) { // 60 seconds
            notificationCache.delete(key);
        }
    }
};
/**
 * Creates an in-app notification in the database and dispatches an FCM Push Notification.
 * Protects against duplicate notifications within a 60-second window.
 */
const createAndSendNotification = (userId, role, title, body, data) => {
    if (!userId)
        return;
    // 1. Idempotency Check
    cleanNotificationCache();
    const cacheKey = `${userId}:${role}:${title}:${body}`;
    if (notificationCache.has(cacheKey)) {
        console.log(`[NOTIFICATION] Suppressing duplicate notification for user ${userId}: ${title}`);
        return; // Already processed recently
    }
    notificationCache.set(cacheKey, Date.now());
    // 2. Database Insert (In-App Notification)
    // We use `body` as the primary message since the current DB schema has no title column
    const dbMessage = title && title !== body ? `${title}\n${body}` : body;
    const sql = "INSERT INTO notifications (`user id`, message, `is read`) VALUES (?, ?, 0)";
    db_1.default.query(sql, [userId, dbMessage], (err, result) => {
        if (err) {
            console.error("[NOTIFICATION] DB Insert failed:", err);
            // We DO NOT crash or throw here. We just log it.
        }
        else {
            console.log("[NOTIFICATION] DB Insert success");
            // Fire live WebSocket notification
            Promise.resolve().then(() => __importStar(require("./socketEmitter"))).then(({ broadcastNewNotification }) => {
                broadcastNewNotification(userId, {
                    id: result?.insertId,
                    message: dbMessage,
                    is_read: 0,
                    created_at: new Date().toISOString()
                });
            }).catch(e => console.error("Socket emission failed:", e));
        }
        // 3. Trigger FCM Push asynchronously
        (0, exports.sendPushToUser)(userId, role, title, body, data);
    });
};
exports.createAndSendNotification = createAndSendNotification;
/**
 * Sends a push notification to a specific user by querying their FCM token from the database.
 * @param userId - ID of the user
 * @param role - Role (CUSTOMER, ADMIN, DELIVERY, TRANSPORT)
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Optional data payload
 */
const sendPushToUser = (userId, role, title, body, data) => {
    if (!userId)
        return;
    let table = "users";
    const upperRole = role.toUpperCase();
    if (upperRole === "ADMIN")
        table = "admins";
    else if (upperRole === "DELIVERY")
        table = "delivery_partners";
    else if (upperRole === "TRANSPORT")
        table = "transport_partners";
    db_1.default.query(`SELECT fcm_token FROM ${table} WHERE id = ?`, [userId], (err, rows) => {
        if (err || !rows || rows.length === 0)
            return;
        const token = rows[0].fcm_token;
        if (token) {
            (0, exports.sendPushNotification)(token, title, body, data);
        }
    });
};
exports.sendPushToUser = sendPushToUser;
/**
 * Sends a push notification via Firebase Cloud Messaging.
 * @param token string | string[] - A single FCM token or array of tokens
 * @param title string - Notification title
 * @param body string - Notification body
 * @param data object - Optional key-value string pairs for payload data
 * @returns boolean - True if sending was attempted/successful
 */
const sendPushNotification = async (token, title, body, data) => {
    if (!firebaseAdmin_1.firebaseAdminApp) {
        console.warn('[NOTIFICATION] Firebase Admin is not initialized. Skipping push notification.');
        return false;
    }
    if (!token || (Array.isArray(token) && token.length === 0)) {
        console.log('[NOTIFICATION] No FCM tokens provided. Skipping push notification.');
        return false;
    }
    try {
        const payload = {
            notification: {
                title,
                body,
            },
            android: {
                notification: {
                    channelId: data?.channelId || 'villagesmart_general',
                    priority: (data?.priority === 'high' ? 'high' : 'default'),
                },
            },
            data: data || {}, // Capacitor reads this inside notification.data
        };
        if (Array.isArray(token)) {
            // Send to multiple devices
            const response = await (0, firebaseAdmin_1.getMessaging)().sendEachForMulticast({
                tokens: token,
                ...payload,
            });
            console.log(`[NOTIFICATION] Multicast sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);
            // Cleanup invalid tokens
            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success && isInvalidTokenError(resp.error)) {
                        removeInvalidToken(token[idx]);
                    }
                });
            }
        }
        else {
            // Send to single device
            const response = await (0, firebaseAdmin_1.getMessaging)().send({
                token,
                ...payload,
            });
            console.log(`[NOTIFICATION] Successfully sent push to single token. ID: ${response}`);
        }
        return true;
    }
    catch (error) {
        console.error(`[NOTIFICATION] Failed to send push notification:`, error.message);
        if (isInvalidTokenError(error) && typeof token === 'string') {
            removeInvalidToken(token);
        }
        return false;
    }
};
exports.sendPushNotification = sendPushNotification;
/**
 * Checks if the Firebase error indicates an invalid or expired FCM token
 */
const isInvalidTokenError = (error) => {
    if (!error)
        return false;
    const errorCode = error.code || '';
    return (errorCode === 'messaging/invalid-registration-token' ||
        errorCode === 'messaging/registration-token-not-registered' ||
        errorCode === 'messaging/invalid-argument');
};
/**
 * Safely removes an invalid token from the database across all tables
 */
const removeInvalidToken = (token) => {
    console.log(`[NOTIFICATION] Removing invalid FCM token from database: ${token.substring(0, 10)}...`);
    const tables = ['users', 'admins', 'delivery_partners', 'transport_partners'];
    tables.forEach(table => {
        // Suppress errors for tables that might not exist yet during migrations
        db_1.default.query(`UPDATE ${table} SET fcm_token = NULL WHERE fcm_token = ?`, [token], (err) => {
            if (err) {
                // Just log the error quietly, don't crash
                console.debug(`[NOTIFICATION] Failed to clean up token in ${table}: ${err.message}`);
            }
        });
    });
};

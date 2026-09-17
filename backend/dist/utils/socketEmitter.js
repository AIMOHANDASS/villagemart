"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastNewNotification = exports.broadcastOrderUpdate = void 0;
const server_1 = require("../server");
/**
 * Broadcasts an order update event to all relevant clients.
 */
const broadcastOrderUpdate = (order) => {
    const id = order.id || order.orderId;
    if (!id)
        return;
    const payload = {
        type: "order:updated",
        orderId: id,
        status: order.status || order.tracking_status,
        order: order,
        updatedAt: new Date().toISOString(),
    };
    // 1. Notify Admins
    server_1.io.to("admin:orders").emit("order:updated", payload);
    // 2. Notify the specific Customer
    if (order.user_id) {
        server_1.io.to(`customer_${order.user_id}`).emit("order:updated", payload);
    }
    // 3. Notify the assigned Delivery Partner
    if (order.delivery_partner_id) {
        server_1.io.to(`delivery_partner_${order.delivery_partner_id}`).emit("order:updated", payload);
    }
    // 4. Notify Transport Partner (if applicable for this order type)
    if (order.transport_partner_id) {
        server_1.io.to(`transport_partner_${order.transport_partner_id}`).emit("order:updated", payload);
    }
};
exports.broadcastOrderUpdate = broadcastOrderUpdate;
/**
 * Broadcasts a new notification event to a specific user.
 */
const broadcastNewNotification = (userId, notification) => {
    server_1.io.to(`user_${userId}`).emit("notification:new", notification);
};
exports.broadcastNewNotification = broadcastNewNotification;

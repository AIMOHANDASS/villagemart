"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const order_controller_1 = require("../controllers/order.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = express_1.default.Router();
router.post("/", rateLimiter_1.orderLimiter, order_controller_1.createOrder);
router.get("/", rateLimiter_1.orderLimiter, auth_middleware_1.verifyToken, order_controller_1.getAllOrders);
router.get("/admin/panel-data", rateLimiter_1.orderLimiter, auth_middleware_1.verifyToken, order_controller_1.getAdminPanelData);
router.get("/garland", rateLimiter_1.orderLimiter, auth_middleware_1.verifyToken, order_controller_1.getGarlandOrders);
router.post("/garland/reminder/:orderId", rateLimiter_1.orderLimiter, auth_middleware_1.verifyToken, order_controller_1.sendGarlandReminder);
router.get("/user/:userId", rateLimiter_1.orderFetchLimiter, auth_middleware_1.verifyToken, order_controller_1.getUserOrders);
router.get("/details/:orderId", rateLimiter_1.orderFetchLimiter, auth_middleware_1.verifyToken, order_controller_1.getOrderDetails);
router.put("/update-status/:orderId", rateLimiter_1.orderLimiter, auth_middleware_1.verifyToken, order_controller_1.confirmOrder);
router.post("/status/:orderId", rateLimiter_1.orderLimiter, order_controller_1.updateOrderStatus); // ✅ important
router.put("/:id/status", rateLimiter_1.orderLimiter, auth_middleware_1.verifyToken, order_controller_1.updateOrderStatusUnified);
router.post("/admin-cancel/:orderId", rateLimiter_1.orderLimiter, auth_middleware_1.verifyToken, order_controller_1.adminCancelOrder);
router.post("/user-cancel/:orderId", rateLimiter_1.orderLimiter, auth_middleware_1.verifyToken, order_controller_1.userCancelOrder);
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const order_controller_1 = require("../controllers/order.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.post("/", order_controller_1.createOrder);
router.get("/", order_controller_1.getAllOrders);
router.get("/admin/panel-data", order_controller_1.getAdminPanelData);
router.get("/garland", order_controller_1.getGarlandOrders);
router.post("/garland/reminder/:orderId", order_controller_1.sendGarlandReminder);
router.get("/user/:userId", order_controller_1.getUserOrders);
router.put("/update-status/:orderId", auth_middleware_1.verifyToken, order_controller_1.confirmOrder);
router.post("/status/:orderId", order_controller_1.updateOrderStatus); // ✅ important
router.put("/:id/status", auth_middleware_1.verifyToken, order_controller_1.updateOrderStatusUnified);
router.post("/admin-cancel/:orderId", order_controller_1.adminCancelOrder);
router.post("/user-cancel/:orderId", order_controller_1.userCancelOrder);
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const admin_controller_1 = require("../controllers/admin.controller");
const product_controller_1 = require("../controllers/product.controller");
const cod_controller_1 = require("../controllers/cod.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.post("/login", admin_controller_1.adminLogin);
router.get("/stats", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, (0, auth_middleware_1.checkAdminPermission)("dashboard"), admin_controller_1.getStats);
router.get("/document-url", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, (0, auth_middleware_1.checkAdminPermission)("partners"), admin_controller_1.getPartnerDocumentUrl);
router.get("/users", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, (0, auth_middleware_1.checkAdminPermission)("users"), admin_controller_1.getUsers);
router.delete("/users/:id", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, (0, auth_middleware_1.checkAdminPermission)("users"), admin_controller_1.deleteUser);
router.get("/delivery-partners", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, (0, auth_middleware_1.checkAdminPermission)("partners"), admin_controller_1.getDeliveryPartners);
router.put("/approve/delivery/:id", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, (0, auth_middleware_1.checkAdminPermission)("partners"), (0, admin_controller_1.approvePartner)("delivery"));
router.put("/reject/delivery/:id", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, (0, auth_middleware_1.checkAdminPermission)("partners"), (0, admin_controller_1.rejectPartner)("delivery"));
router.get("/transport-partners", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, (0, auth_middleware_1.checkAdminPermission)("partners"), admin_controller_1.getTransportPartners);
router.put("/approve/transport/:id", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, (0, auth_middleware_1.checkAdminPermission)("partners"), (0, admin_controller_1.approvePartner)("transport"));
router.put("/reject/transport/:id", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, (0, auth_middleware_1.checkAdminPermission)("partners"), (0, admin_controller_1.rejectPartner)("transport"));
router.post("/unblock-partner", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, (0, auth_middleware_1.checkAdminPermission)("partners"), admin_controller_1.handleAdminUnblockPartner);
router.post("/block-partner", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, (0, auth_middleware_1.checkAdminPermission)("partners"), admin_controller_1.handleAdminBlockPartner);
router.post("/force-reload", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, admin_controller_1.handleAdminForceReload);
// Products management
router.get("/products", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, (0, auth_middleware_1.checkAdminPermission)("products"), product_controller_1.getAdminProducts);
router.post("/products/add", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, (0, auth_middleware_1.checkAdminPermission)("products"), product_controller_1.createProduct);
router.put("/products/:id", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, (0, auth_middleware_1.checkAdminPermission)("products"), product_controller_1.updateProduct);
// Party Hall configuration routes
router.get("/services/partyhall-status", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, admin_controller_1.getPartyHallServiceStatus);
router.post("/services/partyhall-toggle", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, (0, auth_middleware_1.checkAdminPermission)("party-hall"), admin_controller_1.togglePartyHallService);
// Sub-admin management (Super Admin Only)
router.get("/sub-admins", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, admin_controller_1.getSubAdmins);
router.post("/sub-admins", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, admin_controller_1.createSubAdmin);
router.put("/sub-admins/:id", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, admin_controller_1.updateSubAdmin);
router.delete("/sub-admins/:id", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, admin_controller_1.deleteSubAdmin);
// Alerts / Support Tickets
router.get("/alerts", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, admin_controller_1.getSupportTickets);
router.put("/support/tickets/:ticketId/resolve", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, admin_controller_1.resolveSupportTicket);
// COD Settlement routes
router.post("/cod-settlements/force-sync", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, cod_controller_1.forceSyncHistoricalCod);
router.get("/cod-settlements", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, (0, auth_middleware_1.checkAdminPermission)("finance"), cod_controller_1.getCodSettlementsSummary);
router.get("/cod-settlements/partners/:partnerId", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, (0, auth_middleware_1.checkAdminPermission)("finance"), cod_controller_1.getPartnerCodDetails);
router.post("/cod-settlements/:partnerId/request", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, (0, auth_middleware_1.checkAdminPermission)("finance"), cod_controller_1.requestCodSettlement);
// Public route for settlement link
router.get("/cod-settlements/settlement/:reference", cod_controller_1.getSettlementByReference);
router.post("/cod-settlements/verify-payment", cod_controller_1.verifySettlementPayment);
exports.default = router;

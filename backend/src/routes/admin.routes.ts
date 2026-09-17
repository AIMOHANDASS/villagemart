import express from "express";
import { 
  adminLogin, 
  getDeliveryPartners, 
  getTransportPartners, 
  approvePartner, 
  rejectPartner, 
  getStats,
  getUsers,
  handleAdminUnblockPartner,
  handleAdminBlockPartner,
  handleAdminForceReload,
  getPartyHallServiceStatus,
  togglePartyHallService,
  deleteUser,
  getPartnerDocumentUrl,
  getSubAdmins,
  createSubAdmin,
  updateSubAdmin,
  deleteSubAdmin,
  getSupportTickets,
  resolveSupportTicket
} from "../controllers/admin.controller";
import { createProduct, updateProduct, getAdminProducts } from "../controllers/product.controller";
import { getCodSettlementsSummary, getPartnerCodDetails, requestCodSettlement, getSettlementByReference, verifySettlementPayment, forceSyncHistoricalCod } from "../controllers/cod.controller";
import { verifyToken, isAdmin, checkAdminPermission } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/login", adminLogin);
router.get("/stats", verifyToken, isAdmin, checkAdminPermission("dashboard"), getStats);
router.get("/document-url", verifyToken, isAdmin, checkAdminPermission("partners"), getPartnerDocumentUrl);
router.get("/users", verifyToken, isAdmin, checkAdminPermission("users"), getUsers);
router.delete("/users/:id", verifyToken, isAdmin, checkAdminPermission("users"), deleteUser);

router.get("/delivery-partners", verifyToken, isAdmin, checkAdminPermission("partners"), getDeliveryPartners);
router.put("/approve/delivery/:id", verifyToken, isAdmin, checkAdminPermission("partners"), approvePartner("delivery"));
router.put("/reject/delivery/:id", verifyToken, isAdmin, checkAdminPermission("partners"), rejectPartner("delivery"));

router.get("/transport-partners", verifyToken, isAdmin, checkAdminPermission("partners"), getTransportPartners);
router.put("/approve/transport/:id", verifyToken, isAdmin, checkAdminPermission("partners"), approvePartner("transport"));
router.put("/reject/transport/:id", verifyToken, isAdmin, checkAdminPermission("partners"), rejectPartner("transport"));

router.post("/unblock-partner", verifyToken, isAdmin, checkAdminPermission("partners"), handleAdminUnblockPartner);
router.post("/block-partner", verifyToken, isAdmin, checkAdminPermission("partners"), handleAdminBlockPartner);

router.post("/force-reload", verifyToken, isAdmin, handleAdminForceReload);

// Products management
router.get("/products", verifyToken, isAdmin, checkAdminPermission("products"), getAdminProducts);
router.post("/products/add", verifyToken, isAdmin, checkAdminPermission("products"), createProduct);
router.put("/products/:id", verifyToken, isAdmin, checkAdminPermission("products"), updateProduct);

// Party Hall configuration routes
router.get("/services/partyhall-status", verifyToken, isAdmin, getPartyHallServiceStatus);
router.post("/services/partyhall-toggle", verifyToken, isAdmin, checkAdminPermission("party-hall"), togglePartyHallService);

// Sub-admin management (Super Admin Only)
router.get("/sub-admins", verifyToken, isAdmin, getSubAdmins);
router.post("/sub-admins", verifyToken, isAdmin, createSubAdmin);
router.put("/sub-admins/:id", verifyToken, isAdmin, updateSubAdmin);
router.delete("/sub-admins/:id", verifyToken, isAdmin, deleteSubAdmin);

// Alerts / Support Tickets
router.get("/alerts", verifyToken, isAdmin, getSupportTickets);
router.put("/support/tickets/:ticketId/resolve", verifyToken, isAdmin, resolveSupportTicket);

// COD Settlement routes
router.post("/cod-settlements/force-sync", verifyToken, isAdmin, forceSyncHistoricalCod);
router.get("/cod-settlements", verifyToken, isAdmin, checkAdminPermission("finance"), getCodSettlementsSummary);
router.get("/cod-settlements/partners/:partnerId", verifyToken, isAdmin, checkAdminPermission("finance"), getPartnerCodDetails);
router.post("/cod-settlements/:partnerId/request", verifyToken, isAdmin, checkAdminPermission("finance"), requestCodSettlement);

// Public route for settlement link
router.get("/cod-settlements/settlement/:reference", getSettlementByReference);
router.post("/cod-settlements/verify-payment", verifySettlementPayment);

export default router;

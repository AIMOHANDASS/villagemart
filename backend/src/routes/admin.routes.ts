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
  handleAdminForceReload
} from "../controllers/admin.controller";

const router = express.Router();

router.post("/login", adminLogin);
router.get("/stats", getStats);
router.get("/users", getUsers);

router.get("/delivery-partners", getDeliveryPartners);
router.put("/approve/delivery/:id", approvePartner("delivery"));
router.put("/reject/delivery/:id", rejectPartner("delivery"));

router.get("/transport-partners", getTransportPartners);
router.put("/approve/transport/:id", approvePartner("transport"));
router.put("/reject/transport/:id", rejectPartner("transport"));

router.post("/unblock-partner", handleAdminUnblockPartner);
router.post("/block-partner", handleAdminBlockPartner);

router.post("/force-reload", handleAdminForceReload);

export default router;

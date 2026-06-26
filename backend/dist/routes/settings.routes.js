"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const settings_controller_1 = require("../controllers/settings.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// Public — consumed by both Admin toggles and Customer booking page
router.get("/global-vehicles", settings_controller_1.getGlobalVehicleStatus);
// Admin-only — toggle a vehicle tier on or off
router.put("/update-vehicle-service", auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, settings_controller_1.updateGlobalVehicleStatus);
exports.default = router;

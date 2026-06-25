"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const search_controller_1 = require("../controllers/search.controller");
const router = express_1.default.Router();
// 🌍 Smart Location Search
router.get("/search", search_controller_1.searchLocation);
// 📏 Distance calculation
router.get("/distance", search_controller_1.getDistance);
// 📍 Nearby drivers/partners
const location_controller_1 = require("../controllers/location.controller");
router.get("/nearby", location_controller_1.getNearbyDrivers);
exports.default = router;

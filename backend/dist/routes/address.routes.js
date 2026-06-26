"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const address_controller_1 = require("../controllers/address.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// Apply auth middleware to all routes
router.use(auth_middleware_1.verifyToken);
router.get("/list", address_controller_1.getUserAddresses);
router.post("/add", address_controller_1.addUserAddress);
router.put("/edit/:id", address_controller_1.editUserAddress);
router.post("/select-active", address_controller_1.selectActiveNavbarAddress);
exports.default = router;

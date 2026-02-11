"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const transport_controller_1 = require("../controllers/transport.controller");
const router = express_1.default.Router();
router.post("/book", transport_controller_1.createTransportBooking);
router.get("/", transport_controller_1.getAllTransportBookings);
router.get("/user/:userId", transport_controller_1.getUserTransportBookings);
exports.default = router;

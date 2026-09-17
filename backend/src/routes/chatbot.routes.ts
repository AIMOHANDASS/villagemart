import express from "express";
import { queryProducts } from "../controllers/chatbot.controller";

const router = express.Router();

// 🤖 AI Chatbot — Live product search from MySQL
router.post("/query", queryProducts);

export default router;

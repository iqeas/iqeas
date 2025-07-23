import express from "express";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { createLeaveController, deleteLeaveController, getLeavesController, updateLeaveController } from "../controllers/leave.controller.js";

const router = express.Router();

router.get("/leave/records", authenticateToken, getLeavesController);
router.post("/leave", authenticateToken, createLeaveController);
router.patch("/leave/:id", authenticateToken, updateLeaveController);
router.delete("/leave/:id", authenticateToken, deleteLeaveController);
export default router;

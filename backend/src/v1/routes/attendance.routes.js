import express from "express";

import { authenticateToken } from "../middleware/authMiddleware.js";
import {
  createAttendanceController,
  deleteAttendanceController,
  getAttendanceController,
  updateAttendanceController,
} from "../controllers/attendance.controller.js";

const router = express.Router();

router.get("/attendance/records", authenticateToken, getAttendanceController);

router.post("/attendance", authenticateToken, createAttendanceController);
router.patch("/attendance/:id", authenticateToken, updateAttendanceController);
router.delete("/attendance/:id", authenticateToken, deleteAttendanceController);

export default router;

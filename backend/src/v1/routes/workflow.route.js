import express from "express";
import {
  createStage,
  uploadStageFiles,
  createDrawing,
  addDrawingStageLog,
  getDrawingLogs,
} from "../controllers/workflow.controller.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/stages", createStage);
router.post(
  "/stages/:id/files",
  authenticateToken,
  uploadStageFiles
);

router.post("/drawings", createDrawing);
router.post(
  "/drawings/:id/logs",
  authenticateToken,
  addDrawingStageLog
);
router.get("/drawings/:id/logs", getDrawingLogs);

export default router;

import express from "express";
import {
  createStage,
  uploadStageFiles,
  createDrawing,
  addDrawingStageLog,
  getDrawingLogs,
  getStagesByProjectIdController,
  getStageDrawingsController,
  getAssignedTasksController,
  EditDrawingLogsController,
  getDrawingLogByIdController,
  getStageFinalFiles,
} from "../controllers/workflow.controller.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { getDrawingLogById } from "../services/workflow.service.js";

const router = express.Router();

router.post("/stages/:project_id", createStage);
router.get("/stages/:project_id", getStagesByProjectIdController);
router.get(
  "/stages/drawings/:project_id/:stage_id",
  getStageDrawingsController
);
router.post("/stages/:id/files", authenticateToken, uploadStageFiles);
router.post("/drawings", authenticateToken, createDrawing);
router.post("/drawings/:id/logs", authenticateToken, addDrawingStageLog);
router.get("/drawings/:id/logs", getDrawingLogs);
router.get("/workers/tasks/:project_id", authenticateToken, getAssignedTasksController);
router.patch("/logs/:id", authenticateToken, EditDrawingLogsController);
router.get("/logs/:id", authenticateToken, getDrawingLogByIdController);
router.get("/stages/final-files/:id", authenticateToken, getStageFinalFiles);

export default router;

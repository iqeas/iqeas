import express from "express";
import {
  createStage,
  uploadStageFiles,
  createDrawing,
  addDrawingStageLog,
  getDrawingLogs,
} from "../controllers/workflow.controller.js";
import uploadMiddleware from "../middlewares/upload.js";
import authMiddleware from "../middlewares/auth.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/stages", createStage);
router.post(
  "/stages/:id/files",
  uploadMiddleware.array("files"),
  uploadStageFiles
);

router.post("/drawings", createDrawing);
router.post(
  "/drawings/:id/logs",
  uploadMiddleware.array("files"),
  addDrawingStageLog
);
router.get("/drawings/:id/logs", getDrawingLogs);

export default router;

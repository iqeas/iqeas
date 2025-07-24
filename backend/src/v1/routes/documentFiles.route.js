import express from "express";
import { getProjectsForDocumentsController, handleGetFilesByType } from "../controllers/documentFiles.controller.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Example: /api/get/get-all-uploaded-files?project_id=1&type=ongoing&user_id=4&role=rfq
router.get("/get/get-all-uploaded-filess",authenticateToken, handleGetFilesByType);
router.get("/document/projects",authenticateToken, getProjectsForDocumentsController);

export default router;

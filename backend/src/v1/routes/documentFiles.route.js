// routes/fileRoutes.js
import express from "express";
import { handleGetFilesByType } from "../controllers/documentfiles.controller.js";

const router = express.Router();

// /api/files?project_id=1&type=ongoing&id=10
router.get("/get/get-all-uploaded-files", handleGetFilesByType);

export default router;

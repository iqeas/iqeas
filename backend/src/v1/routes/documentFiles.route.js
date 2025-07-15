import express from "express";
import { handleGetFilesByType } from "../controllers/documentfiles.controller.js";

const router = express.Router();

// Example: /api/get/get-all-uploaded-files?project_id=1&type=ongoing&user_id=4&role=rfq
router.get("/get/get-all-uploaded-filess", handleGetFilesByType);

export default router;

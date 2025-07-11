import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import {
  getFiles,
  uploadFileHandler,
} from "../controllers/uploadfiles.controller.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post(
  "/upload-file",
  authenticateToken,
  upload.single("file"),
  uploadFileHandler
);


router.get("/get-files/all-files", authenticateToken, getFiles);

export default router;

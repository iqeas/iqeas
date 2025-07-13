import express from "express";
import { getDocumentsHandler } from "../controllers/document.controller.js";

const router = express.Router();

router.get("/get-documents", getDocumentsHandler);

export default router;

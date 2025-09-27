import express from "express";
import {
  createEstimationHandler,
  getEstimationHandler,
  updateEstimationHandler,
  getPMProjects,
  getApproved,
  getDraft,
  createEstimationCorrectionHandler,
  createInvoiceController,
} from "../controllers/estimation.controller.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/estimation",authenticateToken, createEstimationHandler);
router.post(
  "/estimation/correction",
  authenticateToken,
  createEstimationCorrectionHandler
);
router.get("/get/estimation/:id", getEstimationHandler);
router.patch("/patch/estimation/:id", updateEstimationHandler);

router.get("/estimation/pm",authenticateToken, getPMProjects);
router.get("/estimation/approves",authenticateToken, getApproved); // This is the new route
router.get("/estimation/draft",authenticateToken, getDraft); // This is the new route


router.post("/estimation/invoice/:id",authenticateToken, createInvoiceController);
export default router;

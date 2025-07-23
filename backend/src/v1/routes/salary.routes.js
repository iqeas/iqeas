import express from "express";

import { authenticateToken } from "../middleware/authMiddleware.js";
import {
  getSalariesController,
  upsertSalaryController,
} from "../controllers/salary.controller.js";

const router = express.Router();

router.get("/salary", authenticateToken, getSalariesController);
router.post("/salary", authenticateToken, upsertSalaryController);

export default router;

import express from "express";
import {
  forgotPasswordController,
  getCurrentUser,
  login,
  resetPasswordController,
} from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { resetPassword } from "../services/auth.service.js";

const router = express.Router();

router.post("/auth/login", login);
router.get("/auth/me", authenticateToken, getCurrentUser);
router.post("/auth/forgot-password", forgotPasswordController);
router.post("/auth/reset-password", resetPasswordController);

export default router;

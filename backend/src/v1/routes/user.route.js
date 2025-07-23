import express from "express";
import {
  createNewUser,
  EditUserDataController,
  getUsersByRoleController,
  getUsersController,
  toggleUserStatus,
} from "../controllers/user.controller.js";
import { allowRoles } from "../utils/verification.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/admin/create/create-user",
  // authenticateToken,
  // allowRoles("admin"),
  createNewUser
);

router.patch(
  "/admin/user/:id/status",
  authenticateToken,
  allowRoles("admin"),
  toggleUserStatus
);

router.get(
  "/admin/get-users",
  authenticateToken,
  allowRoles("admin", "estimation"),
  getUsersController
);
router.get(
  "/admin/get-users/:role",
  authenticateToken,
  getUsersByRoleController
);

router.patch(
  "/admin/users/:id",
  authenticateToken,
  allowRoles("admin"),
  EditUserDataController
);

export default router;

import express from "express";
import {
  createNewProject,
  getProjectsPaginatedController,
  patchProject,
  getEstimationProjects,
  projectRejectCreateHandler,
  getPMProjectsController,
  addDeliveryFilesController,
  fetchAllProjects,
  getUploadedFilesForRoles,
  listWorkerProjectsController,
  getAdminProjectsController,
} from "../controllers/projects.controller.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/projects", authenticateToken, createNewProject);
router.patch("/projects/:id", authenticateToken, patchProject);
router.get("/projects/rfq", authenticateToken, getProjectsPaginatedController);
router.get("/projects/estimation", authenticateToken, getEstimationProjects);
router.get("/projects/pm", authenticateToken, getPMProjectsController);
router.get("/projects/admin", authenticateToken, getAdminProjectsController);
router.post("/projects/reject", authenticateToken, projectRejectCreateHandler);
router.post("/project-delivery/:id", addDeliveryFilesController);
router.get("/projects/uploaded-files-data-by-roles", getUploadedFilesForRoles)
router.get("/projects/working", authenticateToken, listWorkerProjectsController);
export default router;

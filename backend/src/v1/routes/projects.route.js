import express from "express";
import {
  createNewProject,
  getProjectsPaginatedController,
  patchProject,
  getEstimationProjects,
  projectRejectCreateHandler,
  getPMProjectsController,
} from "../controllers/projects.controller.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/projects", authenticateToken, createNewProject);
router.patch("/projects/:id", authenticateToken, patchProject);
// edit-needed change the function name accordingly
router.get("/projects/rfq", authenticateToken, getProjectsPaginatedController);
router.get("/projects/estimation", authenticateToken, getEstimationProjects);
router.get("/projects/pm", authenticateToken, getPMProjectsController);
router.post("/projects/reject", authenticateToken, projectRejectCreateHandler);
export default router;

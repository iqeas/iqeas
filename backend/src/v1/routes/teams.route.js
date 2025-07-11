import express from "express";
import {
  createTeamHandler,
  EditTeamDataController,
  getAllTeamsHandler,
} from "../controllers/teams.controller.js";
import { getTeamsByRole } from "../services/teams.service.js";

const router = express.Router();

router.post("/teams", createTeamHandler);
router.patch("/teams/:id", EditTeamDataController);
router.get("/teams/get-all-teams", getAllTeamsHandler);
router.get("/teams/role/:role", getTeamsByRole);

export default router;

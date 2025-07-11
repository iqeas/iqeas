import {
  createTeam,
  getAllTeams,
  getTeamsByRole,
  updateTeamData,
} from "../services/teams.service.js";
import { formatResponse } from "../utils/response.js";

export const createTeamHandler = async (req, res) => {
  try {
    const {
      title,
      users = [],
      active = true,
      role = "working",
      leader_id,
    } = req.body;

    if (!title) {
      return res
        .status(400)
        .json(formatResponse({ statusCode: 400, detail: "Title is required" }));
    }

    const team = await createTeam({ title, active, role, users, leader_id });

    return res.status(201).json(
      formatResponse({
        statusCode: 201,
        detail: "Team created successfully",
        data: team,
      })
    );
  } catch (err) {
    console.error("Error creating team:", err);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
};

export const EditTeamDataController = async (req, res) => {
  const { id } = req.params;
  const { title, users, active, is_deleted, role } = req.body;

  if (!id) {
    return res
      .status(400)
      .json(formatResponse({ statusCode: 400, detail: "Team id is required" }));
  }

  try {
    const updatedTeam = await updateTeamData(id, {
      title,
      active,
      users,
      role,
      is_deleted,
    });
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Teams updated successfully",
        data: updatedTeam,
      })
    );
  } catch (error) {
    console.error("Error updating user:", error.message);
    return res
      .status(500)
      .json(formatResponse({ statusCode: 500, detail: error.message }));
  }
};

export const getAllTeamsHandler = async (_req, res) => {
  try {
    const teams = await getAllTeams();
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Teams fetched",
        data: teams,
      })
    );
  } catch (err) {
    console.error("Error fetching teams:", err);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
};

export const getTeamsByRoleHandler = async (req, res) => {
  const { role } = req.params;

  if (!role) {
    return res
      .status(400)
      .json(formatResponse({ statusCode: 400, detail: "Role is required" }));
  }

  try {
    const teams = await getTeamsByRole(role);
    if (!teams || teams.length === 0) {
      return res
        .status(404)
        .json(formatResponse({ statusCode: 404, detail: "No teams found" }));
    }

    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Teams fetched by role",
        data: teams,
      })
    );
  } catch (err) {
    console.error("Error fetching teams by role:", err);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
}
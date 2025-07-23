import pool from "../config/db.js";

import { formatResponse } from "../utils/response.js";
import {
  createUser,
  updateUserActiveStatus,
  getAllUsers,
  updateUserData,
  DeleteUser,
  getUsersByRole,
} from "../services/user.service.js";

import { getAllTeams } from "../services/teams.service.js";
import { sentForgotMail } from "../services/auth.service.js";

export const createNewUser = async (req, res) => {
  const { email, phoneNumber, name, role, active,base_salary } = req.body;

  if (!email || !phoneNumber || !name || !role || active === null) {
    return res.status(400).json(
      formatResponse({
        statusCode: 400,
        detail: "Missing required fields",
      })
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { user, password } = await createUser(
      email,
      phoneNumber,
      name,
      role,
      active,
      base_salary,
      client
    );

const sentEmail = await sentForgotMail(email, client);
    console.log(sentEmail);

    await client.query("COMMIT");

    return res.status(201).json(
      formatResponse({
        statusCode: 201,
        detail: "User created successfully",
        data: user,
      })
    );
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Error creating user:", e.message);

    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  } finally {
    client.release();
  }
};

export const toggleUserStatus = async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;

  if (typeof active !== "boolean") {
    return res.status(400).json(
      formatResponse({
        statusCode: 400,
        detail: "`active` must be a boolean (true/false)",
      })
    );
  }

  try {
    const user = await updateUserActiveStatus(id, active);

    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: `User status updated to ${active ? "active" : "inactive"}`,
        data: user,
      })
    );
  } catch (error) {
    console.error("Error updating user status:", error.message);

    return res
      .status(500)
      .json(formatResponse({ statusCode: 500, detail: error.message }));
  }
};

export const getUsersController = async (req, res) => {
  try {
    const { page = 1, size = 10, search = "" } = req.query;
    const data = await getAllUsers({
      page:page,
      search:search,
      size:size
    });

    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Users and teams fetched successfully",
        data: {
          ...data,
        },
      })
    );
  } catch (error) {
    console.error("Error fetching users and teams:", error.message);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
};

export const getUsersByRoleController = async (req, res) => {
  try {
    const { role } = req.params;
    const [users] = await Promise.all([getUsersByRole(role)]);

    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Users fetched successfully",
        data: users,
      })
    );
  } catch (error) {
    console.error("Error fetching users:", error.message);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
};

export const EditUserDataController = async (req, res) => {
  const { id } = req.params;
  const { name, email, phoneNumber, active, role, is_deleted,base_salary } = req.body;

  if (!id) {
    return res
      .status(400)
      .json(formatResponse({ statusCode: 400, detail: "User id is required" }));
  }

  try {
    const updatedUser = await updateUserData(id, {
      name,
      email,
      phoneNumber,
      active,
      role,
      is_deleted,
      base_salary
    });
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "User updated successfully",
        data: updatedUser,
      })
    );
  } catch (error) {
    console.error("Error updating user:", error.message);
    return res
      .status(500)
      .json(formatResponse({ statusCode: 500, detail: error.message }));
  }
};

export const DeleteUserController = async (res, red) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json(
          formatResponse({ statusCode: 400, detail: "User id is required" })
        );
    }
    await DeleteUser(id);
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "User deleted successfully",
        data: null,
      })
    );
  } catch (error) {
    console.error("Error updating user:", error.message);
    return res
      .status(500)
      .json(formatResponse({ statusCode: 500, detail: error.message }));
  }
};

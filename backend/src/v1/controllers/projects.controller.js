import {
  createProject,
  updateProjectPartial,
  getProjectByPagination,
  createProjectUploadedFile,
  getRFQCardData,
  getProjectsEstimationProjects,
  getEstimationCardData,
  createProjectRejection,
  projectRejectionById,
  getPMProjects,
  getAdminProjects,
  addProjectDeliveryFiles,
  getAllProjects,
  fetchUploadedFilesByRoles,
  getWorkerProjectsPaginated,
  getAdminProjectsCards,
  getPMProjectsCards,
  getProjectDetailsById,
  getPublicProjectDetails,
  getProjectShortDetailsById,
} from "../services/projects.service.js";
import pool from "../config/db.js";

import { formatResponse } from "../utils/response.js";

export const createNewProject = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userId = req.user.id;
    const { uploaded_files } = req.body;

    const project = await createProject(req.body, userId, client);

    if (uploaded_files?.length) {
      await createProjectUploadedFile(project.id, uploaded_files, client);
    }

    await client.query("COMMIT");
    const responseProject = await getProjectShortDetailsById(project.id,client);
    return res.status(201).json(
      formatResponse({
        statusCode: 201,
        detail: "Project created successfully",
        data: responseProject,
      })
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  } finally {
    client.release();
  }
};

export const patchProject = async (req, res) => {
  const { id } = req.params;
  const fieldsToUpdate = req.body;
  if (fieldsToUpdate.send_to_estimation) {
    fieldsToUpdate.status = "estimating";
  }
  if (!id) {
    return res
      .status(400)
      .json(
        formatResponse({ statusCode: 400, detail: "Project ID is required" })
      );
  }

  try {
    const updatedProject = await updateProjectPartial(id, fieldsToUpdate);

    if (!updatedProject) {
      return res
        .status(404)
        .json(formatResponse({ statusCode: 404, detail: "Project not found" }));
    }

    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Project updated successfully",
        data: updatedProject,
      })
    );
  } catch (error) {
    console.error("Error updating project:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
};


export async function getProjectsPaginatedController(req, res) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const size = Math.max(parseInt(req.query.size) || 10, 1);
    const searchQuery = req.query.query || "";

    const data = await getProjectByPagination(page, size, searchQuery, client);
    const cardData = await getRFQCardData(client);

    await client.query("COMMIT");

    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Projects fetched successfully",
        data: {
          total_pages: data.total_pages,
          projects: data.projects,
          cards: cardData,
        },
      })
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error fetching projects:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  } finally {
    client.release();
  }
}


export const getEstimationProjects = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const query = req.query.query || "";
    console.log(page, size, query);
    const projects = await getProjectsEstimationProjects({ page, size, query });
    const cards = await getEstimationCardData();
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Projects sent to estimation fetched successfully",
        data: {
          total_pages: projects.total_pages,
          projects: projects.projects,
          cards,
        },
      })
    );
  } catch (error) {
    console.error("Error fetching estimation projects:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
};


export const getPMProjectsController = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const query = req.query.search || "";
    const userId = req.user.id;
    const projects = await getPMProjects({
      page: page,
      size,
      query,
      user_id: userId,
    });
    const cards = await getPMProjectsCards({ userId: userId });
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Projects sent to estimation fetched successfully",
        data: {
          total_pages: projects.total_pages,
          projects: projects.projects,
          cards,
        },
      })
    );
  } catch (error) {
    console.error("Error fetching estimation projects:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
};

export const getAdminProjectsController = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const query = req.query.query || "";
    const projects = await getAdminProjects({
      page: page,
      size,
      query,
    });
    const cards = await getAdminProjectsCards();
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Projects sent to estimation fetched successfully",
        data: {
          total_pages: projects.total_pages,
          projects: projects.projects,
          cards,
        },
      })
    );
  } catch (error) {
    console.error("Error fetching estimation projects:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
};

export const projectRejectCreateHandler = async (req, res) => {
  const client = await pool.connect();
  try {
    const { projectId, reason, uploaded_files_ids } = req.body;
    const userId = req.user.id;

    if (!projectId || !reason) {
      return res.status(400).json(
        formatResponse({
          statusCode: 400,
          detail: "Project ID and reason are required",
        })
      );
    }

    await client.query("BEGIN");

    // Pass the client to your service method so the DB calls share the same transaction
    const projectRejectionId = await createProjectRejection(
      { projectId, reason, uploaded_files_ids, userId },
      client
    );

    const projectData = await projectRejectionById(projectRejectionId, client);

    await client.query("COMMIT");

    return res.status(201).json(
      formatResponse({
        statusCode: 201,
        detail: "Project rejected successfully",
        data: projectData,
      })
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error rejecting project:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  } finally {
    client.release();
  }
};


export async function addDeliveryFilesController(req, res) {
  const client = await pool.connect();
  try {
    const projectId = parseInt(req.params.id, 10);
    const { file_ids } = req.body;

    if (!Array.isArray(file_ids) || file_ids.length === 0) {
      return res.status(400).json(
        formatResponse({
          statusCode: 400,
          detail: "file_ids must be a non-empty array",
        })
      );
    }

    await client.query("BEGIN");

    const files = await addProjectDeliveryFiles(projectId, file_ids, client);
    
    await client.query("COMMIT");

    res.status(201).json(
      formatResponse({
        statusCode: 201,
        detail: "Files added to project delivery successfully",
        data: files,
      })
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error adding delivery files:", err);
    res.status(500).json(
      formatResponse({
        statusCode: 500,
        detail: "Internal server error",
        data: err.message,
      })
    );
  } finally {
    client.release();
  }
}

export async function fetchAllProjects(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;

    const projects = await getAllProjects({ page, size });

    res.status(200).json({
      success: true,
      data: projects.projects,
      pagination: projects.pagination,
    });
  } catch (error) {
    console.error("Error fetching all projects:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}


export async function getUploadedFilesForRoles(req, res) {
  const { role, user_id, page = 1, limit = 10 } = req.query;

  try {
    const result = await fetchUploadedFilesByRoles({
      role,
      user_id: parseInt(user_id),
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}


export async function listWorkerProjectsController(req, res) {
  try {
    const userId = req.user.id;

    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const query = req.query.query || "";

    const data = await getWorkerProjectsPaginated(userId, page, size, query);
    res.status(200).json({
      status_code: 200,
      detail: "Worker projects fetched successfully",
      data: data,
    });
  } catch (err) {
    console.error("Error fetching worker projects:", err);
    res.status(500).json({
      status_code: 500,
      detail: "Internal server error",
    });
  }
}

export async function getWorkerProjectDetailController(req, res) {
  const { userId } = req.user;
  const { id } = req.params;

  try {
    const data = await getWorkerProjectDetail(userId, id);
    res.status(200).json({
      status_code: 200,
      detail: "Worker projects fetched successfully",
      data: data,
    });
  } catch (err) {
    console.error("Error fetching project details:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export const getProjectByIdController = async (req, res) => {
  try {
    const projectId = req.params.id;
    console.log(projectId);
    const project = await getProjectDetailsById(projectId);
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Projects fetched successfully",
        data: project,
      })
    );
  } catch (error) {
    console.error("Error fetching estimation projects:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
};

export async function getPublicProjectInfo(req, res) {
  const { token } = req.params;

  try {
    const data = await getPublicProjectDetails(token);
    if (!data) {
      return res
        .status(404)
        .json({ message: "Project not found or unavailable." });
    }

    return res.json({
      status_code: 200,
      detail: "Projects fetched successfully",
      data: data,
    });
  } catch (err) {
    console.error("Error fetching public project info:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
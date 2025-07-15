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
} from "../services/projects.service.js";

import { formatResponse } from "../utils/response.js";

export const createNewProject = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming user ID is in req.user
    const { uploaded_files } = req.body;

    const project = await createProject({
      ...req.body,
      user_id: userId,
      status: req.body.send_to_estimation ? "estimating" : "draft",
    });
    if (uploaded_files && uploaded_files.length > 0) {
      await createProjectUploadedFile(project.id, uploaded_files);
    }
    return res.status(201).json(
      formatResponse({
        statusCode: 201,
        detail: "Project created successfully",
        data: project,
      })
    );
  } catch (error) {
    console.error("Error creating project:", error.message);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
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
  try {
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const query = req.query.query || "";
    const data = await getProjectByPagination(page, size, query);
    const cardData = await getRFQCardData();
    res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Project fetched sucessfully",
        data: {
          total_pages: data.total_pages,
          projects: data.projects,
          cards: cardData,
        },
      })
    );
  } catch (error) {
    res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
    console.error("Error fetching projects:", error.message);
  }
}

export const getEstimationProjects = async (req, res) => {
  try {
    // edit-needed i will pase page and size from query params and alse search as query
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const query = req.query.search || "";
    const projects = await getProjectsEstimationProjects(page, size, query);
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
    const projects = await getPMProjects({
      page: page,
      size,
      query,
    });
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

export const getAdminProjectsController = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const query = req.query.search || "";
    const projects = await getAdminProjects({
      page: page,
      size,
      query,
    });
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

export const projectRejectCreateHandler = async (req, res) => {
  try {
    const { projectId, reason, uploaded_files_ids } = req.body;
    const userId = req.user.id; // Assuming user ID is in req.user
    if (!projectId || !reason) {
      return res.status(400).json(
        formatResponse({
          statusCode: 400,
          detail: "Project ID and reason are required",
        })
      );
    }
    const projectRejectionId = await createProjectRejection({
      projectId,
      reason,
      uploaded_files_ids,
      userId,
    });
    const projectData = await projectRejectionById(projectRejectionId);
    return res.status(200).json(
      formatResponse({
        statusCode: 201,
        detail: "Project rejected successfully",
        data: projectData,
      })
    );
  } catch (error) {
    console.error("Error rejecting project:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
};

export async function addDeliveryFilesController(req, res) {
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

  try {
    const files = await addProjectDeliveryFiles(projectId, file_ids);
    res.status(201).json(
      formatResponse({
        statusCode: 201,
        detail: "Files added to project delivery successfully",
        data: files,
      })
    );
  } catch (err) {
    console.error("Error adding delivery files:", err);
    res.status(500).json(
      formatResponse({
        statusCode: 500,
        detail: "Internal server error",
        data: err.message,
      })
    );
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

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

    const data = await getProjectByPagination(page, size);
    const cardData = await getRFQCardData();
    res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Project fetched sucessfully",
        data: {
          projects: data,
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
    const projects = await getProjectsEstimationProjects();
    const cards = await getEstimationCardData();
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Projects sent to estimation fetched successfully",
        data: { total_pages: 10, projects, cards },
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
    // edit-needed i will pase page and size from query params and alse search as query
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const query = req.query.search || "";
    const projects = await getPMProjects();
    const cards = await getEstimationCardData();
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Projects sent to estimation fetched successfully",
        data: { total_pages: 10, projects, cards },
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

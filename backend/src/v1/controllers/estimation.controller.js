import {
  createEstimation,
  getEstimationById,
  updateEstimation,
  getProjectsSentToPM,
  getProjectsApproved,
  getProjectsDraft
} from "../services/estimation.service.js";
import { formatResponse } from "../utils/response.js";

export const createEstimationHandler = async (req, res) => {
  try {
    const estimationData = req.body;

    if (!estimationData.project_id) {
      return res.status(400).json(
        formatResponse({
          statusCode: 400,
          detail: "Project ID and User ID are required",
        })
      );
    }

    const user_id = req.user.id;

    const newEstimation = await createEstimation({
      ...estimationData,
      user_id,
    });
    const estimationResponse = await getEstimationById(newEstimation.id);

    return res.status(201).json(
      formatResponse({
        statusCode: 201,
        detail: "Estimation created",
        data: estimationResponse,
      })
    );
  } catch (error) {
    console.error("Error creating estimation:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
};

export const getEstimationHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const estimation = await getEstimationById(id);

    if (!estimation) {
      return res
        .status(404)
        .json(
          formatResponse({ statusCode: 404, detail: "Estimation not found" })
        );
    }

    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Estimation retrieved",
        data: estimation,
      })
    );
  } catch (error) {
    console.error("Error fetching estimation:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
};

export const updateEstimationHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    console.log(id)
    if (!id) {
      return res
        .status(400)
        .json(formatResponse({ statusCode: 400, detail: "ID is required" }));
    }

    const updatedEstimation = await updateEstimation(id, updateData);

    if (!updatedEstimation) {
      return res
        .status(404)
        .json(
          formatResponse({ statusCode: 404, detail: "Estimation not found" })
        );
    }

    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Estimation updated",
        data: updatedEstimation,
      })
    );
  } catch (error) {
    console.error("Error updating estimation:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
};



export const getPMProjects = async (req, res) => {
  try {
    const projects = await getProjectsSentToPM();
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Projects sent to PM fetched successfully",
        data: projects,
      })
    );
  } catch (error) {
    console.error("Error fetching PM projects:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
};


export const getApproved = async (req, res) => {
  try {
    const projects = await getProjectsApproved();
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Projects Approved fetched successfully",
        data: projects,
      })
    );
  } catch (error) {
    console.error("Error fetching Approved projects:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
};

export const getDraft = async (req, res) => {
  try {
    const projects = await getProjectsDraft();
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Projects Draft fetched successfully",
        data: projects,
      })
    );
  } catch (error) {
    console.error("Error fetching Draft projects:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
};

import {
  createEstimation,
  getEstimationById,
  updateEstimation,
  getProjectsSentToPM,
  getProjectsApproved,
  getProjectsDraft,
  createEstimationCorrection,
  createInvoice,
} from "../services/estimation.service.js";
import { updateProjectPartial } from "../services/projects.service.js";
import { formatResponse } from "../utils/response.js";
import pool from "../config/db.js";

export const createEstimationHandler = async (req, res) => {
  const client = await pool.connect();
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
    await client.query("BEGIN");

    const newEstimation = await createEstimation(
      { ...estimationData, user_id },
      client
    );

    const projectUpdateData = await updateProjectPartial(
      estimationData.project_id,
      { estimation_status: "created" },
      client
    );

    const estimationResponse = await getEstimationById(
      newEstimation.id,
      client
    );

    await client.query("COMMIT");

    return res.status(201).json(
      formatResponse({
        statusCode: 201,
        detail: "Estimation created",
        data: { project: projectUpdateData, estimation: estimationResponse },
      })
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating estimation:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  } finally {
    client.release();
  }
};

export const createEstimationCorrectionHandler = async (req, res) => {
  const client = await pool.connect();
  try {
    const estimationData = req.body;

    if (!estimationData.estimation_id || !estimationData.project_id) {
      return res.status(400).json(
        formatResponse({
          statusCode: 400,
          detail: "Estimation ID and Project ID are required",
        })
      );
    }

    await client.query("BEGIN");

    const newEstimationCorrection = await createEstimationCorrection(
      estimationData,
      client
    );

    const updatedProject = await updateProjectPartial(
      estimationData.project_id,
      {
        estimation_status: "back_to_you",
      },
      client
    );

    await client.query("COMMIT");

    return res.status(201).json(
      formatResponse({
        statusCode: 201,
        detail: "Estimation Correction created",
        data: {
          project: updatedProject,
          estimationCorrection: newEstimationCorrection,
        },
      })
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating estimation correction:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  } finally {
    client.release();
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
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id || !updateData.project_id) {
      return res.status(400).json(
        formatResponse({
          statusCode: 400,
          detail: "ID and Project ID is required",
        })
      );
    }

    await client.query("BEGIN");

    const updatedEstimation = await updateEstimation(id, updateData, client);

    if (updatedEstimation.sent_to_pm === true && updateData.approved === true) {
      await updateProjectPartial(
        updatedEstimation.project_id,
        {
          status: "working",
          progress: 0,
          estimation_status: "approved",
        },
        client
      );
    }

    if (updatedEstimation.sent_to_pm === false) {
      await updateProjectPartial(
        updateData.project_id,
        {
          estimation_status: "edited",
        },
        client
      );
    }

    const estimationData = await getEstimationById(id, client);

    await client.query("COMMIT");

    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Estimation updated successfully",
        data: estimationData,
      })
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating estimation:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  } finally {
    client.release();
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


export const createInvoiceController = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params; 
    const invoiceData = req.body;
    const currentUserId = req.user.id;

    await client.query("BEGIN");

    const fileData = await createInvoice(
      client,
      id,
      invoiceData,
      currentUserId
    );

    await client.query("COMMIT");

    return res.status(201).json(
      formatResponse({
        statusCode: 201,
        detail: "Invoice created and linked to estimation",
        data: fileData,
      })
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating invoice:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  } finally {
    client.release();
  }
};

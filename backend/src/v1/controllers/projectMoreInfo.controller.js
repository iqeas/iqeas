import {
  createProjectMoreInfo,
  getProjectMoreInfo,
  updateProjectMoreInfo,
} from "../services/projectMoreInfo.service.js";
import { formatResponse } from "../utils/response.js";

export const createProjectMoreInfoHandler = async (req, res) => {
  try {
    const { project_id, notes, enquiry, uploaded_file_ids } = req.body;

    if (!project_id) {
      return res
        .status(400)
        .json(
          formatResponse({ statusCode: 400, detail: "Project ID is required" })
        );
    }
 
    const newInfo = await createProjectMoreInfo({
      project_id,
      notes,
      enquiry,
      uploaded_file_ids,
    });

    return res.status(201).json(
      formatResponse({
        statusCode: 201,
        detail: "ProjectMoreInfo created",
        data: newInfo,
      })
    );
  } catch (error) {
    console.error("Error creating ProjectMoreInfo:", error);
    return res
      .status(500)
      .json(formatResponse({ statusCode: 500, data: "Internal Server Error" }));
  }
};

export const getProjectMoreInfoHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const info = await getProjectMoreInfo(id);

    if (!info) {
      return res
        .status(404)
        .json(formatResponse(404, "ProjectMoreInfo not found"));
    }

    return res
      .status(200)
      .json(formatResponse(200, "ProjectMoreInfo retrieved", info));
  } catch (error) {
    console.error("Error fetching ProjectMoreInfo:", error);
    return res
      .status(500)
      .json(formatResponse(500, "Internal Server Error", error.message));
  }
};


export const updateProjectMoreInfoHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, enquiry, uploaded_file_ids } = req.body;

    const updated = await updateProjectMoreInfo(id, {
      notes,
      enquiry,
      uploaded_file_ids,
    });

    if (!updated) {
      return res
        .status(404)
        .json(
          formatResponse({
            statusCode: 404,
            detail: "ProjectMoreInfo not found",
          })
        );
    }

    return res
      .status(200)
      .json(
        formatResponse({
          statusCode: 200,
          detail: "ProjectMoreInfo updated",
          data: updated,
        })
      );
  } catch (error) {
    console.error("Error updating ProjectMoreInfo:", error);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
};
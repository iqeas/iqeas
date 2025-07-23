import { getFilesByType } from "../services/documentFiles.service.js";
import { formatResponse } from "../utils/response.js";

export async function handleGetFilesByType(req, res) {
  try {
    const source =
      req.body && Object.keys(req.body).length > 0 ? req.body : req.query;
    const { project_id, role, user_id } = source;

    if (!project_id || !role || !user_id) {
      return res.status(400).json(
        formatResponse({
          statusCode: 400,
          detail: "project_id, role, and user_id are required",
        })
      );
    }

    const files = await getFilesByType(project_id, user_id, role);
    return res
      .status(200)
      .json(
        formatResponse({ statusCode: 200, detail: "Fetched", data: files })
      );
  } catch (err) {
    console.error("Error in handleGetFilesByType:", err);
    res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
}

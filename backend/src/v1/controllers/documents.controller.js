import { getDocuments } from "../services/documents.service.js";
import { formatResponse } from "../utils/response.js";

export async function getDocumentsHandler(req, res) {
  try {
    const { page = 1, size = 10, query = "", type, project_id } = req.query;
    if (!project_id || !type) {
      return res.status(400).json(
        formatResponse({
          statusCode: 400,
          detail: "project_id and type are required",
        })
      );
    }
    const documents = await getDocuments(page, size, query, type, project_id);
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Documents fetched successfully",
        data: documents,
      })
    );
  } catch (err) {
    console.error("getDocumentsHandler Error:", err);
    return res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Internal Server Error" })
      );
  }
}

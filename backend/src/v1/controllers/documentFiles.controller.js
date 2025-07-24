import { getFilesByType, getProjectsForDocument } from "../services/documentFiles.service.js";
import { formatResponse } from "../utils/response.js";

export async function handleGetFilesByType(req, res) {
  try {
    const {role,id:userId} = req.user
    const { project_id, type } = req.query;
    const { page = 1, size = 20, search = "" } = req.query;
    console.log(role,userId);
    if (!project_id || !role || !userId) {
      return res.status(400).json(
        formatResponse({
          statusCode: 400,
          detail: "project_id, role, and user_id are required",
        })
      );
    }

    const result = await getFilesByType(project_id, userId, role,type,page,size,search);
    return res
      .status(200)
      .json(
        formatResponse({
          statusCode: 200,
          detail: "Fetched",
          data: { ...result },
        })
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
export async function getProjectsForDocumentsController(req, res) {
  try {
    const {role, id:user_id} = req.user
    const {  page=1, size=20, search='' } = req.query;
    const result = await getProjectsForDocument({
      role: role.toLowerCase(),
      user_id: parseInt(user_id),
      page: parseInt(page),
      size: parseInt(size),
      search,
    });

    res.json(
      formatResponse({ statusCode: 200, detail: "Fetched", data: result })
    );
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json(
        formatResponse({ statusCode: 500, detail: "Failed to fetch projects" })
      );
  }
}
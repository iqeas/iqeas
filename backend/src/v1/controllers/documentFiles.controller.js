import { getFilesByType } from "../services/documentFiles.service.js";

export async function handleGetFilesByType(req, res) {
  try {
    const projectId = parseInt(req.query.project_id, 10);
    const type = req.query.type;
    const id = parseInt(req.query.id, 10);

    if (isNaN(projectId) || isNaN(id)) {
      return res
        .status(400)
        .json({ error: "project_id and id must be valid integers" });
    }
    if (!["ongoing", "incoming"].includes(type)) {
      return res.status(400).json({ error: "Invalid type parameter" });
    }

    const files = await getFilesByType(projectId, type, id);
    return res.json({ success: true, data: files });
  } catch (error) {
    console.error("Error in handleGetFilesByType:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
}

import { getFilesByType } from "../services/documentFiles.service.js";

export async function handleGetFilesByType(req, res) {
  try {
    const project_id = parseInt(req.query.project_id, 10);
    const type = req.query.type; // "incoming" or "ongoing"
    const user_id = parseInt(req.query.user_id, 10); // logged in user id
    const role = req.query.role; // "rfq", "estimation", "admin"

    if (isNaN(project_id) || isNaN(user_id)) {
      return res.status(400).json({ error: "Invalid project_id or user_id" });
    }

    if (!["incoming", "ongoing"].includes(type)) {
      return res.status(400).json({ error: "Invalid type parameter" });
    }

    if (!["rfq", "estimation", "admin",'documentation','working'].includes(role)) {
      return res.status(400).json({ error: "Invalid role parameter" });
    }

    const files = await getFilesByType(project_id, type, user_id, role);

    return res.json({ success: true, data: files });
  } catch (error) {
    console.error("Error in handleGetFilesByType:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
}

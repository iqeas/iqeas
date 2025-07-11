import {
  getUploadedFilesByRole,
  saveUploadedFile,
} from "../services/uploadfiles.service.js";
import { formatResponse } from "../utils/response.js";

export const uploadFileHandler = async (req, res) => {
  try {
    const { label } = req.body;
    const file = req.file;
    const uploaded_by = req.user.id;

    if (!file) {
      return res
        .status(400)
        .json(formatResponse({ statusCode: 400, detail: "No file uploaded" }));
    }

    const saved = await saveUploadedFile({
      label,
      filename: file.filename,
      uploaded_by,
    });

    return res.status(201).json(
      formatResponse({
        statusCode: 201,
        detail: "File uploaded",
        data: saved,
      })
    );
  } catch (err) {
    console.error("Upload Error:", err);
    return res.status(500).json(
      formatResponse({
        statusCode: 500,
        detail: "Upload failed",
        data: err.message,
      })
    );
  }
};
export async function getFiles(req, res) {
  try {
    const { id: userId, role } = req.user;
    const { page = 1, size = 10 } = req.query;

    const result = await getUploadedFilesByRolePaginated(
      userId,
      role,
      page,
      size
    );

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching files:", error.message);
    res.status(500).json({ error: "Failed to fetch files" });
  }
}
import pool from "../config/db.js";

export async function getFilesByType(project_id, type, current_user_id, role) {
  try {
    let query = `
      SELECT uf.*, u.name AS uploaded_by_name
      FROM uploaded_files uf
      JOIN users u ON u.id = uf.uploaded_by_id
      JOIN projects_uploaded_files puf ON uf.id = puf.uploaded_file_id
      WHERE puf.project_id = $1
    `;
    let values = [project_id];

    if (role === "rfq") {
      // RFQ can only see files they uploaded (outgoing)
      query += ` AND uf.uploaded_by_id = $2`;
      values.push(current_user_id);
    } else if (role === "estimation") {
      if (type === "ongoing") {
        query += ` AND uf.uploaded_by_id = $2`;
        values.push(current_user_id);
      } else if (type === "incoming") {
        query += ` AND uf.uploaded_by_id != $2`;
        values.push(current_user_id);
      }
    } else if (role === "admin") {
      // Admin sees all, no condition needed
    } else {
      throw new Error("Invalid role");
    }

    query += ` ORDER BY uf.created_at DESC`;

    const { rows } = await pool.query(query, values);
    return rows;
  } catch (error) {
    console.error("Error in getFilesByType:", error);
    throw error;
  }
}

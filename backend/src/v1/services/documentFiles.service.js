import pool from "../config/db.js";

export async function getFilesByType(project_id, type, id) {
  try {
    if (type === "ongoing") {
      const query = `
        SELECT uf.*
        FROM uploaded_files uf
        JOIN projects_uploaded_files puf ON uf.id = puf.uploaded_file_id
        WHERE puf.project_id = $1 AND uf.id = $2
      `;
      const values = [project_id, id];
      const { rows } = await pool.query(query, values);
      return rows;
    } else if (type === "incoming") {
      const query = `
        SELECT uf.*
        FROM uploaded_files uf
        JOIN projects_uploaded_files puf ON uf.id = puf.uploaded_file_id
        WHERE puf.project_id = $1 AND uf.id != $2
      `;
      const values = [project_id, id];
      const { rows } = await pool.query(query, values);
      return rows;
    } else {
      throw new Error("Invalid type parameter");
    }
  } catch (error) {
    console.error("Error in getFilesByType:", error);
    throw error;
  }
}

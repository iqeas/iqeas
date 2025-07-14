
import pool from "../config/db.js";

export async function getDocuments({
  page = 1,
  size = 10,
  query = "",
  type,
  project_id,
}) {
  const limit = Math.max(Number(size), 1);
  const offset = Math.max((Number(page) - 1) * limit, 0);

  // Base query and params array
  let baseQuery = `
    SELECT d.*, 
      json_build_object(
        'id', u.id,
        'name', u.name,
        'email', u.email
      ) AS uploaded_by_user
    FROM documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE 1=1
  `;

  const params = [];
  let paramIndex = 1;

  if (query && query.trim() !== "") {
    baseQuery += ` AND (d.title ILIKE $${paramIndex} OR d.description ILIKE $${paramIndex})`;
    params.push(`%${query.trim()}%`);
    paramIndex++;
  }

  if (type && (type === "incoming" || type === "outgoing")) {
    baseQuery += ` AND d.direction = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  if (project_id) {
    baseQuery += ` AND d.project_id = $${paramIndex}`;
    params.push(project_id);
    paramIndex++;
  }

  baseQuery += ` ORDER BY d.created_at DESC LIMIT $${paramIndex} OFFSET $${
    paramIndex + 1
  }`;
  params.push(limit, offset);

  const result = await pool.query(baseQuery, params);
  let countQuery = `SELECT COUNT(*) FROM documents d WHERE 1=1`;
  const countParams = [];
  let countParamIndex = 1;

  if (query && query.trim() !== "") {
    countQuery += ` AND (d.title ILIKE $${countParamIndex} OR d.description ILIKE $${countParamIndex})`;
    countParams.push(`%${query.trim()}%`);
    countParamIndex++;
  }

  if (type && (type === "incoming" || type === "outgoing")) {
    countQuery += ` AND d.direction = $${countParamIndex}`;
    countParams.push(type);
    countParamIndex++;
  }

  if (project_id) {
    countQuery += ` AND d.project_id = $${countParamIndex}`;
    countParams.push(project_id);
    countParamIndex++;
  }

  const countResult = await pool.query(countQuery, countParams);
  const total = Number(countResult.rows[0].count);

  return {
    documents: result.rows,
    total,
    page,
    size,
    pagesLeft: Math.ceil(total / size) - page,
  };
}

export async function getDocumentCount() {
  const query = `SELECT COUNT(*) FROM documents;`;
  const result = await pool.query(query);
  return Number(result.rows[0].count);
}

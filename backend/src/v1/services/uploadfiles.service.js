import pool from "../config/db.js";

export async function saveUploadedFile({ label, filename, uploaded_by }) {
  const result = await pool.query(
    `INSERT INTO uploaded_files (label, file, uploaded_by_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [label, filename, uploaded_by]
  );

  return result.rows[0];
}


export async function getUploadedFilesByRolePaginated(
  userId,
  role,
  page = 1,
  size = 10
) {
  const limit = Math.max(Number(size), 1);
  const offset = Math.max((Number(page) - 1) * limit, 0);

  let baseWhereClause = "";
  let countWhereClause = "";
  let params = [];
  let countParams = [];

  if (role === "rfq") {
    baseWhereClause = `WHERE uf.uploaded_by_id = $1`;
    countWhereClause = `WHERE uploaded_by_id = $1`;
    params = [userId, limit, offset];
    countParams = [userId];
  } else if (role === "estimation") {
    baseWhereClause = `
      WHERE uf.uploaded_by_id = $1
         OR uf.uploaded_by_id IN (
           SELECT id FROM users WHERE role = 'rfq'
         )
    `;
    countWhereClause = `
      WHERE uploaded_by_id = $1
         OR uploaded_by_id IN (
           SELECT id FROM users WHERE role = 'rfq'
         )
    `;
    params = [userId, limit, offset];
    countParams = [userId];
  } else {
    throw new Error("Unauthorized role");
  }

  const query = `
    SELECT *
    FROM uploaded_files uf
    ${baseWhereClause}
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM uploaded_files
    ${countWhereClause}
  `;

  const result = await pool.query(query, params);
  const countResult = await pool.query(countQuery, countParams);

  const total = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(total / limit);

  return {
    files: result.rows,
    pagination: {
      total,
      totalPages,
      currentPage: Number(page),
      pageSize: limit,
      remainingPages: Math.max(totalPages - page, 0),
    },
  };
}
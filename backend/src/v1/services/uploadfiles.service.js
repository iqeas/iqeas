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
  size = 10,
  searchQuery = ""
) {
  const limit = Math.max(Number(size), 1);
  const offset = Math.max((Number(page) - 1) * limit, 0);

  let baseWhereClause = "";
  let countWhereClause = "";
  let params = [userId, limit, offset];
  let countParams = [userId];
  let searchCondition = "";
  console.log(searchQuery);
  if (searchQuery) {
    searchCondition = `AND uf.label ILIKE $4`;
    params.push(`%${searchQuery}%`);
  }

  if (role === "rfq") {
    baseWhereClause = `WHERE uf.uploaded_by_id = $1`;
    countWhereClause = `WHERE uploaded_by_id = $1`;
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
  } else {
    throw new Error("Unauthorized role");
  }

  const query = `
    SELECT 
      uf.*,
      json_build_object(
        'id', u.id,
        'name', u.name
      ) AS uploaded_by
    FROM uploaded_files uf
    LEFT JOIN users u ON uf.uploaded_by_id = u.id
    ${baseWhereClause}
    ${searchCondition}
    ORDER BY uf.created_at DESC
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
    },
  };
}

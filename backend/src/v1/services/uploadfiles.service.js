import pool from "../config/db.js";

export async function saveUploadedFile({ label, filename, uploaded_by }) {
  console.log(label, filename, uploaded_by);
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

  let baseWhere = "";
  let queryParams = [];
  let countParams = [];

  const hasSearch = searchQuery.trim() !== "";

  switch (role) {
    case "rfq":
      baseWhere = `WHERE uf.uploaded_by_id = $1`;
      queryParams = [userId];
      countParams = [userId];
      break;

    case "estimation":
      baseWhere = `
        WHERE (uf.uploaded_by_id = $1
           OR uf.uploaded_by_id IN (SELECT id FROM users WHERE role = 'rfq'))
      `;
      queryParams = [userId];
      countParams = [userId];
      break;

    case "pm":
      baseWhere = `
        WHERE uf.id IN (
          SELECT uploaded_file_id
          FROM projects_uploaded_files puf
          JOIN projects p ON puf.project_id = p.id
          WHERE p.leader_id = $1
        )
      `;
      queryParams = [userId];
      countParams = [userId];
      break;

    case "working":
      baseWhere = `
        WHERE uf.id IN (
          SELECT uploaded_file_id FROM tasks_uploaded_files tu
          JOIN tasks t ON tu.task_id = t.id
          WHERE t.assigned_individual_id = $1
          UNION
          SELECT uploaded_file_id FROM deliveries_uploaded_files du
          JOIN deliveries d ON du.delivery_id = d.id
          WHERE d.user_id = $1
        )
      `;
      queryParams = [userId];
      countParams = [userId];
      break;

    case "documenting":
      baseWhere = `
        WHERE (uf.uploaded_by_id = $1
          OR uf.id IN (
            SELECT uploaded_file_id
            FROM tasks_uploaded_files tu
            JOIN tasks t ON tu.task_id = t.id
            WHERE t.assigned_team_id IN (
              SELECT team_id FROM teams_users WHERE user_id = $1
            )
          ))
      `;
      queryParams = [userId];
      countParams = [userId];
      break;

    case "admin":
      // admin does not filter by userId, only search
      if (hasSearch) {
        baseWhere = `WHERE uf.label ILIKE $1`;
        queryParams = [`%${searchQuery}%`];
        countParams = [`%${searchQuery}%`];
      } else {
        baseWhere = "";
        queryParams = [];
        countParams = [];
      }
      break;

    default:
      throw new Error("Unauthorized role");
  }
  console.log(baseWhere, queryParams, countParams);
  if (hasSearch && role !== "admin") {
    baseWhere += ` AND uf.label ILIKE $${queryParams.length + 1}`;
    const searchParam = `%${searchQuery}%`;
    queryParams.push(searchParam);
    countParams.push(searchParam);
  }

  queryParams.push(limit, offset);

  const query = `
    SELECT 
      uf.*,
      json_build_object(
        'id', u.id,
        'name', u.name
      ) AS uploaded_by
    FROM uploaded_files uf
    LEFT JOIN users u ON uf.uploaded_by_id = u.id
    ${baseWhere}
    ORDER BY uf.created_at DESC
    LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM uploaded_files uf
    ${baseWhere}
  `;

  const result = await pool.query(query, queryParams);
  const countResult = await pool.query(countQuery, countParams);

  const total = parseInt(countResult.rows[0]?.total || 0, 10);
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

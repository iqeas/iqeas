import pool from "../config/db.js";

export async function getFilesByType(
  project_id,
  current_user_id,
  role,
  type = "all",
  page = 1,
  size = 10,
  search = ""
) {
  try {
    const normalizedType = type.toLowerCase();
    const validTypes = ["incoming", "outgoing", "all"];
    if (!validTypes.includes(normalizedType)) {
      throw new Error("Invalid type parameter");
    }

    const projectId = Number(project_id);
    const userId = Number(current_user_id);
    const limit = Number(size);
    const offset = (Number(page) - 1) * limit;
    const searchTerm = search ? `%${search.toLowerCase()}%` : null;

    // Common select clause
    const selectClause = `
      SELECT
        uf.*,
        u.name AS uploaded_by_name,
        p.name AS project_name,
        p.project_id AS project_code,
        CASE
          WHEN uf.uploaded_by_id = $1 THEN 'outgoing'
          ELSE 'incoming'
        END AS direction
      FROM uploaded_files uf
      JOIN users u ON u.id = uf.uploaded_by_id
      JOIN projects_uploaded_files puf ON uf.id = puf.uploaded_file_id
      JOIN projects p ON p.id = puf.project_id
    `;

    let query = "";
    let queryParams = [];

    // =============================
    // 1. RFQ
    // =============================
    if (role === "rfq") {
      if (normalizedType === "incoming") return [];

      queryParams = [userId, projectId];
      let whereClause = `p.id = $2 AND uf.uploaded_by_id = $1`;

      if (searchTerm) {
        queryParams.push(searchTerm);
        whereClause += ` AND (LOWER(uf.label) LIKE $3)`;
      }

      queryParams.push(limit, offset);
      query = `
        ${selectClause}
        WHERE ${whereClause}
        ORDER BY uf.created_at DESC
        LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
      `;
    }

    // =============================
    // 2. Estimation
    // =============================
    else if (role === "estimation") {
      const estRes = await pool.query(
        `SELECT id FROM estimations WHERE project_id = $1 AND user_id = $2 LIMIT 1`,
        [projectId, userId]
      );
      const estimationId = estRes.rowCount ? estRes.rows[0].id : null;

      if (normalizedType === "incoming") {
        queryParams = [userId, projectId];
        if (searchTerm) {
          queryParams.push(searchTerm);
        }
        queryParams.push(limit, offset);

        const searchClause = searchTerm ? ` AND (LOWER(uf.label) LIKE $3)` : "";

        query = `
          ${selectClause}
          WHERE p.id = $2 AND u.role = 'rfq'${searchClause}
          ORDER BY uf.created_at DESC
          LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
        `;
      } else if (normalizedType === "outgoing" || normalizedType === "all") {
        queryParams = [userId, estimationId, projectId];
        if (searchTerm) {
          queryParams.push(searchTerm);
        }
        queryParams.push(limit, offset);

        const searchClause = searchTerm ? ` AND (LOWER(uf.label) LIKE $3)` : "";

        const outgoingClause =
          normalizedType === "outgoing"
            ? `
            (euf.estimation_id = $2 AND uf.uploaded_by_id = $1)
            OR (d.project_id = $3 AND uf.uploaded_by_id = $1 AND dslf.type = 'outgoing')
          `
            : `
            (euf.estimation_id = $2 AND uf.uploaded_by_id = $1)
            OR (d.project_id = $3 AND uf.uploaded_by_id = $1 AND dslf.type = 'outgoing')
            OR (p.id = $3 AND u.role = 'rfq')
          `;

        query = `
          ${selectClause}
          LEFT JOIN estimation_uploaded_files euf ON uf.id = euf.uploaded_file_id
          LEFT JOIN drawings_uploaded_files duf ON uf.id = duf.uploaded_file_id
          LEFT JOIN drawings d ON duf.drawing_id = d.id
          LEFT JOIN drawing_stage_log_files dslf ON uf.id = dslf.uploaded_file_id
          WHERE (${outgoingClause})${searchClause}
          ORDER BY uf.created_at DESC
          LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
        `;
      }
    }

    // =============================
    // 3. PM / Working / Documentation / Admin
    // =============================
    else if (["pm", "working", "documentation", "admin"].includes(role)) {
      const roleIncomingMap = {
        pm: ["estimation", "working", "documentation"],
        working: ["pm"],
        documentation: ["pm"],
      };
      const incomingRoles = roleIncomingMap[role] || [];

      queryParams = [userId, projectId];
      let whereParts = [`p.id = $2`];

      if (normalizedType === "incoming") {
        whereParts.push(`uf.uploaded_by_id != $1`);
        if (incomingRoles.length) {
          queryParams.push(incomingRoles);
          whereParts.push(`u.role = ANY($${queryParams.length})`);
        }
      } else if (normalizedType === "outgoing") {
        whereParts.push(`uf.uploaded_by_id = $1`);
      } else {
        if (incomingRoles.length) {
          queryParams.push(incomingRoles);
          whereParts.push(
            `(uf.uploaded_by_id = $1 OR (uf.uploaded_by_id != $1 AND u.role = ANY($${queryParams.length})))`
          );
        } else {
          whereParts.push(
            `(uf.uploaded_by_id = $1 OR uf.uploaded_by_id != $1)`
          );
        }
      }

      if (searchTerm) {
        queryParams.push(searchTerm);
        whereParts.push(`(LOWER(uf.label) LIKE $${queryParams.length})`);
      }

      queryParams.push(limit, offset);
      query = `
        ${selectClause}
        WHERE ${whereParts.join(" AND ")}
        ORDER BY uf.created_at DESC
        LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
      `;
    }

    // Execute main query
    const { rows } = await pool.query(query, queryParams);

    // Count total
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM uploaded_files uf
      JOIN users u ON u.id = uf.uploaded_by_id
      JOIN projects_uploaded_files puf ON uf.id = puf.uploaded_file_id
      JOIN projects p ON p.id = puf.project_id
      WHERE p.id = $1
      ${searchTerm ? "AND (LOWER(uf.label) LIKE $2 )" : ""}
    `;
    const countParams = searchTerm ? [projectId, searchTerm] : [projectId];
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    return { files: rows, total, totalPages, page };
  } catch (error) {
    console.error("getFilesByType error:", error);
    throw error;
  }
}

export async function getProjectsForDocument({
  role,
  user_id,
  page = 1,
  size = 10,
  search = "",
}) {
  const offset = (page - 1) * size;
  const params = [];
  let condition = `WHERE true`;

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    condition += ` AND LOWER(p.name) LIKE $${params.length}`;
  }

  switch (role) {
    case "rfq":
    case "admin":
      // No additional condition
      break;
    case "estimation":
      condition += ` AND p.send_to_estimation = true`;
      break;
    case "pm":
      params.push(user_id);
      condition += ` AND EXISTS (
        SELECT 1 FROM estimations e 
        WHERE e.project_id = p.id AND e.sent_to_pm = true AND e.forwarded_user_id = $${params.length}
      )`;
      break;
    case "working":
    case "documentation":
      params.push(user_id);
      condition += ` AND EXISTS (
        SELECT 1 FROM drawings d 
        JOIN drawing_stage_logs dsl ON d.id = dsl.drawing_id
        WHERE d.project_id = p.id AND dsl.forwarded_user_id = $${params.length}
      )`;
      break;
    default:
      throw new Error("Invalid role");
  }

  // Total count
  const countQuery = `SELECT COUNT(*) FROM projects p ${condition}`;
  const countRes = await pool.query(countQuery, params);
  const total = parseInt(countRes.rows[0].count);
  const total_pages = Math.ceil(total / size);

  // Actual query
  const query = `
    SELECT 
      p.id, p.name, p.project_id, p.client_name, p.status, p.created_at
    FROM projects p
    ${condition}
    ORDER BY p.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const results = await pool.query(query, [...params, size, offset]);

  return {
    total_pages,
    projects: results.rows,
  };
}

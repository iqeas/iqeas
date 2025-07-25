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
  const normalizedType = type.toLowerCase();
  const validTypes = ["incoming", "outgoing", "all"];
  if (!validTypes.includes(normalizedType)) {
    throw new Error("Invalid type parameter");
  }

  const offset = (page - 1) * size;
  if (role === "rfq") {
    let baseQuery = `
    SELECT uf.*, u.name AS uploaded_by_name
    FROM uploaded_files uf
    LEFT JOIN users u ON uf.uploaded_by_id = u.id
    WHERE uf.uploaded_by_id = $2
      AND uf.id IN (
        SELECT uploaded_file_id FROM projects_uploaded_files WHERE project_id = $1
        UNION
        SELECT uploaded_file_id FROM project_more_info_uploaded_files
        WHERE project_more_info_id IN (
          SELECT id FROM project_more_info WHERE project_id = $1
        )
      )
  `;

    // Optional search filter
    if (search) {
      baseQuery += ` AND (uf.label ILIKE '%' || $3 || '%')`;
    }

    const offset = (page - 1) * size;
    const limitOffsetParams = search
      ? [project_id, current_user_id, search, size, offset]
      : [project_id, current_user_id, size, offset];

    const paginatedQuery =
      baseQuery +
      ` ORDER BY uf.created_at DESC LIMIT $${
        limitOffsetParams.length - 1
      } OFFSET $${limitOffsetParams.length}`;

    const results = await pool.query(paginatedQuery, limitOffsetParams);

    const countQuery = `SELECT COUNT(*) FROM (${baseQuery}) AS total`;
    const countParams = search
      ? [project_id, current_user_id, search]
      : [project_id, current_user_id];
    const countResult = await pool.query(countQuery, countParams);

    const total_pages = Math.ceil(parseInt(countResult.rows[0].count) / size);

    return {
      total_pages,
      files: results.rows,
    };
  }
  if (role === "estimation") {
    let baseQuery = "";
    let params = [];
    let countParams = [];
    let paramIndex = 1;

    // Incoming files
    const incomingSubquery = `
    SELECT uploaded_file_id FROM projects_uploaded_files WHERE project_id = $1
    UNION
    SELECT uploaded_file_id FROM project_more_info_uploaded_files
    WHERE project_more_info_id IN (
      SELECT id FROM project_more_info WHERE project_id = $1
    )
    UNION
    SELECT uploaded_file_id FROM project_rejection_uploaded_files
    WHERE project_rejection_id IN (
      SELECT id FROM project_rejections WHERE project_id = $1
    )
  `;

    // Outgoing files
    const outgoingSubquery = `
    SELECT uploaded_file_id FROM estimation_uploaded_files
    WHERE estimation_id = (
      SELECT id FROM estimations WHERE project_id = $1 AND user_id = $2
    )
  `;

    if (type === "incoming") {
      baseQuery = `
      SELECT uf.*, u.name AS uploaded_by_name
      FROM uploaded_files uf
      LEFT JOIN users u ON u.id = uf.uploaded_by_id
      WHERE uf.id IN (${incomingSubquery})
    `;
      params = [project_id];
      countParams = [...params];
    }

    if (type === "outgoing") {
      baseQuery = `
      SELECT uf.*, u.name AS uploaded_by_name
      FROM uploaded_files uf
      LEFT JOIN users u ON u.id = uf.uploaded_by_id
      WHERE uf.id IN (${outgoingSubquery})
        AND uf.uploaded_by_id = $2
    `;
      params = [project_id, current_user_id];
      countParams = [...params];
    }

    if (type === "all") {
      baseQuery = `
      SELECT uf.*, u.name AS uploaded_by_name
      FROM uploaded_files uf
      LEFT JOIN users u ON u.id = uf.uploaded_by_id
      WHERE (
        uf.id IN (${incomingSubquery})
        OR (
          uf.id IN (${outgoingSubquery})
          AND uf.uploaded_by_id = $2
        )
      )
    `;
      params = [project_id, current_user_id];
      countParams = [...params];
    }

    // Add optional search
    if (search) {
      baseQuery += ` AND uf.label ILIKE '%' || $${params.length + 1} || '%'`;
      params.push(search);
      countParams.push(search);
    }

    // Add pagination
    const offset = (page - 1) * size;
    baseQuery += ` ORDER BY uf.created_at DESC LIMIT $${
      params.length + 1
    } OFFSET $${params.length + 2}`;
    params.push(size, offset);

    // Execute paginated query
    const results = await pool.query(baseQuery, params);

    // Count total for pagination
    const countQuery = `SELECT COUNT(*) FROM (${baseQuery.replace(
      /LIMIT.*OFFSET.*/i,
      ""
    )}) AS total`;
    const countResult = await pool.query(countQuery, countParams);
    const total_pages = Math.ceil(parseInt(countResult.rows[0].count) / size);

    return {
      total_pages,
      files: results.rows,
    };
  }

  if (role === "pm") {
    const offset = (page - 1) * size;
    // Base params: project & user
    const baseParams = [project_id, current_user_id];
    let params = [...baseParams];
    let idx = params.length + 1;

    // Optional search clause
    let searchClause = "";
    if (search) {
      searchClause = ` AND uf.label ILIKE $${idx}`;
      params.push(`%${search}%`);
      idx++;
    }

    // Incoming source queries
    const incoming =
      type === "incoming" || type === "all"
        ? `
      -- project files
      SELECT uf.*, u.name AS uploaded_by_name
      FROM projects_uploaded_files puf
      JOIN uploaded_files uf ON uf.id = puf.uploaded_file_id
      LEFT JOIN users u ON u.id = uf.uploaded_by_id
      WHERE puf.project_id = $1

      UNION

      -- estimation files
      SELECT uf.*, u.name AS uploaded_by_name
      FROM estimation_uploaded_files euf
      JOIN estimations e ON e.id = euf.estimation_id
      JOIN uploaded_files uf ON uf.id = euf.uploaded_file_id
      LEFT JOIN users u ON u.id = uf.uploaded_by_id
      WHERE e.project_id = $1

      UNION

      -- more‑info files
      SELECT uf.*, u.name AS uploaded_by_name
      FROM project_more_info_uploaded_files pmf
      JOIN project_more_info pmi ON pmi.id = pmf.project_more_info_id
      JOIN uploaded_files uf ON uf.id = pmf.uploaded_file_id
      LEFT JOIN users u ON u.id = uf.uploaded_by_id
      WHERE pmi.project_id = $1

      UNION

      -- drawing‑stage incoming
      SELECT uf.*, u.name AS uploaded_by_name
      FROM drawing_stage_log_files dslf
      JOIN drawing_stage_logs dsl ON dsl.id = dslf.log_id
      JOIN drawings d ON d.id = dsl.drawing_id
      JOIN uploaded_files uf ON uf.id = dslf.uploaded_file_id
      LEFT JOIN users u ON u.id = uf.uploaded_by_id
      WHERE d.project_id = $1
        AND dsl.forwarded_user_id = $2
        AND dslf.type = 'incoming'
    `
        : null;

    // Outgoing source queries
    const outgoing =
      type === "outgoing" || type === "all"
        ? `
      -- drawings files
      SELECT uf.*, u.name AS uploaded_by_name
      FROM drawings_uploaded_files duf
      JOIN drawings d ON d.id = duf.drawing_id
      JOIN uploaded_files uf ON uf.id = duf.uploaded_file_id
      LEFT JOIN users u ON u.id = uf.uploaded_by_id
      WHERE d.project_id = $1

      UNION

      -- drawing‑stage outgoing
      SELECT uf.*, u.name AS uploaded_by_name
      FROM drawing_stage_log_files dslf
      JOIN drawing_stage_logs dsl ON dsl.id = dslf.log_id
      JOIN drawings d ON d.id = dsl.drawing_id
      JOIN uploaded_files uf ON uf.id = dslf.uploaded_file_id
      LEFT JOIN users u ON u.id = uf.uploaded_by_id
      WHERE d.project_id = $1
        AND dsl.forwarded_user_id = $2
        AND dslf.type = 'outgoing'
    `
        : null;

    // Combine
    let union = "";
    if (incoming && outgoing) union = `(${incoming}) UNION (${outgoing})`;
    else if (incoming) union = incoming;
    else if (outgoing) union = outgoing;
    else return { total_pages: 0, files: [] };

    // Final paginated query
    const finalQuery = `
      SELECT * FROM (
        ${union}
      ) AS uf
      WHERE 1=1
      ${searchClause}
      ORDER BY uf.created_at DESC
      LIMIT $${idx++} OFFSET $${idx}
    `;
    params.push(size, offset);

    // Total count
    const countQuery = `
      SELECT COUNT(*) FROM (
        ${union}
      ) AS uf
      WHERE 1=1
      ${searchClause}
    `;

    // Execute
    const [countRes, dataRes] = await Promise.all([
      pool.query(countQuery, params.slice(0, idx - 2)), // no limit/offset
      pool.query(finalQuery, params),
    ]);

    const total_pages = Math.ceil(parseInt(countRes.rows[0].count, 10) / size);
    // Fetch delivery files separately
    const deliveryQ = `
    SELECT uf.*, u.name AS uploaded_by_name, 'delivery_files' AS source
    FROM project_delivery_files pdf
    JOIN uploaded_files uf ON uf.id = pdf.uploaded_file_id
    LEFT JOIN users u ON u.id = uf.uploaded_by_id
    WHERE pdf.project_id = $1
      ${search ? "AND uf.label ILIKE $2" : ""}
  `;
    const deliverParams = [project_id,...(search?[`%${search}%`]:[])]
    const deliveryRes = await pool.query(deliveryQ, deliverParams);
    return {
      total_pages,
      files: dataRes.rows,
      final_files: deliveryRes.rows,
    };
  }

  if (role === "working" || role === "documentation") {
    const params = [project_id, current_user_id];
    let idx = 3;
    let searchClause = "";

    if (search) {
      searchClause = ` AND uf.label ILIKE $${idx}`;
      params.push(`%${search}%`);
      idx++;
    }

    const incomingQ = `
        SELECT uf.*, u.name AS uploaded_by_name
        FROM drawing_stage_log_files dslf
        JOIN drawing_stage_logs dsl ON dsl.id = dslf.log_id
        JOIN drawings d ON d.id = dsl.drawing_id
        JOIN uploaded_files uf ON uf.id = dslf.uploaded_file_id
        LEFT JOIN users u ON u.id = uf.uploaded_by_id
        WHERE d.project_id = $1
        AND dsl.forwarded_user_id = $2
        AND dslf.type = 'incoming'
      `;

    const outgoingQ = `
        SELECT uf.*, u.name AS uploaded_by_name
        FROM drawing_stage_log_files dslf
        JOIN drawing_stage_logs dsl ON dsl.id = dslf.log_id
        JOIN drawings d ON d.id = dsl.drawing_id
        JOIN uploaded_files uf ON uf.id = dslf.uploaded_file_id
        LEFT JOIN users u ON u.id = uf.uploaded_by_id
        WHERE d.project_id = $1
        AND dsl.forwarded_user_id = $2
        AND dslf.type = 'outgoing'
      `;

    let unionQ;
    if (type === "incoming") {
      unionQ = incomingQ;
    } else if (type === "outgoing") {
      unionQ = outgoingQ;
    } else {
      unionQ = `(${incomingQ}) UNION (${outgoingQ})`;
    }

    const finalQ = `
        SELECT * FROM (
          ${unionQ}
        ) AS uf
        WHERE 1=1
        ${searchClause}
        ORDER BY uf.created_at DESC
        LIMIT $${idx++} OFFSET $${idx}
      `;

    params.push(size, offset);

    const countQ = `
        SELECT COUNT(*) FROM (
          ${unionQ}
        ) AS uf
        WHERE 1=1
        ${searchClause}
      `;

    const [countRes, dataRes] = await Promise.all([
      pool.query(countQ, params.slice(0, idx - 2)),
      pool.query(finalQ, params),
    ]);

    const total_pages = Math.ceil(parseInt(countRes.rows[0].count, 10) / size);

    return {
      total_pages,
      files: dataRes.rows,
    };
  }
  if(role=='admin'){
    const offset = (page - 1) * size;
    const keyword = `%${search}%`;

    // Build individual queries for each source
    const queries = [];

    // 1. projects_uploaded_files
    queries.push(`
    SELECT uf.*, u.name AS uploaded_by_name, 'projects_uploaded' AS source
    FROM projects_uploaded_files p
    JOIN uploaded_files uf ON uf.id = p.uploaded_file_id
    LEFT JOIN users u ON u.id = uf.uploaded_by_id
    WHERE p.project_id = $1
      ${search ? "AND uf.label ILIKE $2" : ""}
  `);

    // 2. project_rejection_uploaded_files
    queries.push(`
    SELECT uf.*, u.name AS uploaded_by_name, 'project_rejections' AS source
    FROM project_rejection_uploaded_files pr
    JOIN project_rejections pjr ON pjr.id = pr.project_rejection_id
    JOIN uploaded_files uf ON uf.id = pr.uploaded_file_id
    LEFT JOIN users u ON u.id = uf.uploaded_by_id
    WHERE pjr.project_id = $1
      ${search ? "AND uf.label ILIKE $2" : ""}
  `);

    // 3. project_more_info_uploaded_files
    queries.push(`
    SELECT uf.*, u.name AS uploaded_by_name, 'project_more_info' AS source
    FROM project_more_info pm
    JOIN project_more_info_uploaded_files pmi ON pm.id = pmi.project_more_info_id
    JOIN uploaded_files uf ON uf.id = pmi.uploaded_file_id
    LEFT JOIN users u ON u.id = uf.uploaded_by_id
    WHERE pm.project_id = $1
      ${search ? "AND uf.label ILIKE $2" : ""}
  `);

    // 4. estimation_uploaded_files (via estimations)
    queries.push(`
    SELECT uf.*, u.name AS uploaded_by_name, 'estimations' AS source
    FROM estimations e
    JOIN estimation_uploaded_files ef ON e.id = ef.estimation_id
    JOIN uploaded_files uf ON uf.id = ef.uploaded_file_id
    LEFT JOIN users u ON u.id = uf.uploaded_by_id
    WHERE e.project_id = $1
      ${search ? "AND uf.label ILIKE $2" : ""}
  `);

    // 5. drawings_uploaded_files (via drawings)
    queries.push(`
    SELECT uf.*, u.name AS uploaded_by_name, 'drawings_uploaded' AS source
    FROM drawings d
    JOIN drawings_uploaded_files duf ON d.id = duf.drawing_id
    JOIN uploaded_files uf ON uf.id = duf.uploaded_file_id
    LEFT JOIN users u ON u.id = uf.uploaded_by_id
    WHERE d.project_id = $1
      ${search ? "AND uf.label ILIKE $2" : ""}
  `);

    // 6. drawing_stage_log_files (via stage logs)
    queries.push(`
    SELECT uf.*, u.name AS uploaded_by_name, 'drawing_stage' AS source
    FROM drawing_stage_logs dsl
    JOIN drawings d ON d.id = dsl.drawing_id
    JOIN drawing_stage_log_files dslf ON dsl.id = dslf.log_id
    JOIN uploaded_files uf ON uf.id = dslf.uploaded_file_id
    LEFT JOIN users u ON u.id = uf.uploaded_by_id
    WHERE d.project_id = $1
      ${search ? "AND uf.label ILIKE $2" : ""}
  `);

    // 7. final_files (via final_files -> drawings)
    queries.push(`
    SELECT uf.*, u.name AS uploaded_by_name, 'final_files' AS source
    FROM final_files ff
    JOIN drawings d ON d.id = ff.drawing_id
    JOIN uploaded_files uf ON uf.id = ff.uploaded_file_id
    LEFT JOIN users u ON u.id = uf.uploaded_by_id
    WHERE d.project_id = $1
      ${search ? "AND uf.label ILIKE $2" : ""}
  `);

    // Combine with UNION ALL (we will dedupe in JS)
    const unionSQL = queries.join("\nUNION ALL\n");

    // Fetch all matching rows
    const params = search ? [project_id, keyword] : [project_id];
    const allRowsRes = await pool.query(unionSQL, params);
    const allRows = allRowsRes.rows;

    // Deduplicate by file id
    const fileMap = new Map();
    allRows.forEach((row) => {
      if (!fileMap.has(row.id)) fileMap.set(row.id, row);
    });
    const deduped = Array.from(fileMap.values());

    // Paginate in JS
    const paginated = deduped.slice(offset, offset + size);
    const total_pages = Math.ceil(deduped.length / size);

    // Fetch delivery files separately
    const deliveryQ = `
    SELECT uf.*, u.name AS uploaded_by_name, 'delivery_files' AS source
    FROM project_delivery_files pdf
    JOIN uploaded_files uf ON uf.id = pdf.uploaded_file_id
    LEFT JOIN users u ON u.id = uf.uploaded_by_id
    WHERE pdf.project_id = $1
      ${search ? "AND uf.label ILIKE $2" : ""}
  `;
    const deliveryRes = await pool.query(deliveryQ, params);

    return {
      total_pages,
      files: paginated,
      final_files: deliveryRes.rows,
    };
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

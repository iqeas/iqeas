import pool from "../config/db.js";

export async function createStage(project_id, stagesData) {
  const stages = stagesData.map((stage, index) => {
    if (index == 0) {
      return {
        name: stage.name,
        weight: stage.weight,
        allocated_hours: stage.allocated_hours,
        project_id,
        status: "pending",
      };
    } else {
      return {
        name: stage.name,
        weight: stage.weight,
        allocated_hours: stage.allocated_hours,
        project_id,
        status: "not_started",
      };
    }
  });

  const insertions = stages.map((stage) =>
    pool.query(
      `INSERT INTO stages (name, weight, allocated_hours, project_id, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        stage.name,
        stage.weight,
        stage.allocated_hours,
        project_id,
        stage.status,
      ]
    )
  );

  return Promise.all(insertions).then((results) => {
    const grouped = {};
    results.forEach((res) => {
      const stage = res.rows[0];
      grouped[stage.name] = stage;
    });
    return grouped;
  });
}

export async function uploadStageFiles(stageId, files) {
  const insertions = files.map((file) =>
    pool.query(
      `INSERT INTO stage_uploaded_files (stage_id, uploaded_file_id) VALUES ($1, $2)`,
      [stageId, file.id]
    )
  );
  await Promise.all(insertions);
  return { uploaded: files.length };
}

export async function createDrawing(data, uploaded_by) {
  const {
    title,
    drawing_type,
    revision,
    drawing_weightage,
    allocated_hours,
    project_id,
    stage_id,
    client_dwg_no,
    iqeas_dwg_no,
    uploaded_files_ids,
  } = data;

  const result = await pool.query(
    `INSERT INTO drawings (title, drawing_type, revision, drawing_weightage, allocated_hours, project_id, stage_id, uploaded_by, client_dwg_no, iqeas_dwg_no)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      title,
      drawing_type,
      revision,
      drawing_weightage,
      allocated_hours,
      project_id,
      stage_id,
      uploaded_by,
      client_dwg_no,
      iqeas_dwg_no,
    ]
  );
  const drawingId = result.rows[0].id;
  console.log("Uploaded files inserted:===", uploaded_files_ids);
  if (uploaded_files_ids?.length) {
    const fileInsertions = uploaded_files_ids.map((fileId) =>
      pool.query(
        `INSERT INTO drawings_uploaded_files (drawing_id, uploaded_file_id) VALUES ($1, $2)`,
        [drawingId, fileId]
      )
    );
    console.log("Uploaded files inserted:", uploaded_files_ids);
    await Promise.all(fileInsertions);
  }
  return result.rows[0];
}

export async function addDrawingStageLog({
  drawingId,
  step_name,
  status,
  notes,
  userId,
  forwarded_user_id = null,
  uploaded_files_ids = [],
  action_taken = "not_yet",
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const stepOrderRes = await client.query(
      `SELECT COUNT(*) AS count FROM drawing_stage_logs WHERE drawing_id = $1`,
      [drawingId]
    );
    const step_order = parseInt(stepOrderRes.rows[0].count, 10) + 1;

    const logRes = await client.query(
      `INSERT INTO drawing_stage_logs 
      (drawing_id, step_name, status, notes, created_by, forwarded_user_id, action_taken, step_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        drawingId,
        step_name,
        status,
        notes,
        userId,
        forwarded_user_id,
        action_taken,
        step_order,
      ]
    );

    const logId = logRes.rows[0].id;

    if (uploaded_files_ids?.length) {
      const fileInsertions = uploaded_files_ids.map((fileId) =>
        client.query(
          `INSERT INTO drawing_stage_log_files (log_id, uploaded_file_id, type)
           VALUES ($1, $2, 'incoming')`,
          [logId, fileId]
        )
      );
      await Promise.all(fileInsertions);
    }

    await client.query("COMMIT");
    return logRes.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getDrawingLogs(drawingId) {
  const result = await pool.query(
    `SELECT * FROM drawing_stage_logs WHERE drawing_id = $1 ORDER BY created_at ASC`,
    [drawingId]
  );
  return result.rows;
}

export async function getStagesByProjectId(projectId) {
  const result = await pool.query(
    `SELECT * FROM stages WHERE project_id = $1 ORDER BY created_at ASC`,
    [projectId]
  );

  return result.rows;
}
export async function getDrawingsWithLogs(projectId, stageId) {
  const query = `
    SELECT 
      d.id,
      d.title,
      d.drawing_type,
      d.revision,
      d.drawing_weightage,
      d.allocated_hours,
      d.project_id,
      d.stage_id,
      d.uploaded_by,
      d.created_at,
      d.client_dwg_no,
      d.iqeas_dwg_no,

      -- Drawing uploaded_files
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', uf.id,
          'label', uf.label,
          'file', uf.file
        ))
        FROM drawings_uploaded_files duf
        JOIN uploaded_files uf ON duf.uploaded_file_id = uf.id
        WHERE duf.drawing_id = d.id
      ), '[]'::json) AS uploaded_files,

      -- Drawing stage logs (ordered by created_at ASC)
      COALESCE((
        SELECT json_agg(log_entry ORDER BY log_entry->>'created_at')
        FROM (
          SELECT json_build_object(
            'id', l.id,
            'step_name', l.step_name,
            'status', l.status,
            'notes', l.notes,
            'reason', l.reason,
            'step_order', l.step_order,
            'is_sent', l.is_sent,
            'action_taken', l.action_taken,
            'created_at', l.created_at,
            'updated_at', l.updated_at,
            'created_by', json_build_object(
              'id', u.id,
              'name', u.name,
              'email', u.email
            ),
            'incoming_files', COALESCE((
              SELECT json_agg(json_build_object(
                'id', uf1.id,
                'label', uf1.label,
                'file', uf1.file
              ))
              FROM drawing_stage_log_files dslf1
              JOIN uploaded_files uf1 ON dslf1.uploaded_file_id = uf1.id
              WHERE dslf1.log_id = l.id AND dslf1.type = 'incoming'
            ), '[]'::json),
            'outgoing_files', COALESCE((
              SELECT json_agg(json_build_object(
                'id', uf2.id,
                'label', uf2.label,
                'file', uf2.file
              ))
              FROM drawing_stage_log_files dslf2
              JOIN uploaded_files uf2 ON dslf2.uploaded_file_id = uf2.id
              WHERE dslf2.log_id = l.id AND dslf2.type = 'outgoing'
            ), '[]'::json)
          ) AS log_entry
          FROM drawing_stage_logs l
          LEFT JOIN users u ON l.created_by = u.id
          WHERE l.drawing_id = d.id
          ORDER BY l.created_at ASC
        ) AS ordered_logs
      ), '[]'::json) AS drawing_stage_logs

    FROM drawings d
    WHERE d.project_id = $1 AND d.stage_id = $2;
  `;

  const result = await pool.query(query, [projectId, stageId]);
  return result.rows[0];
}


export async function getDrawingsWithLogsById(drawing_id) {
  const query = `
    SELECT 
      d.id,
      d.title,
      d.drawing_type,
      d.revision,
      d.drawing_weightage,
      d.allocated_hours,
      d.project_id,
      d.stage_id,
      d.uploaded_by,
      d.created_at,
      d.client_dwg_no,
      d.iqeas_dwg_no,

      COALESCE((
        SELECT json_agg(json_build_object(
          'id', uf.id,
          'label', uf.label,
          'file', uf.file
        ))
        FROM drawings_uploaded_files duf
        JOIN uploaded_files uf ON duf.uploaded_file_id = uf.id
        WHERE duf.drawing_id = d.id
      ), '[]'::json) AS uploaded_files,

      COALESCE((
        SELECT json_agg(json_build_object(
          'id', l.id,
          'step_name', l.step_name,
          'status', l.status,
          'notes', l.notes,
          'step_order', l.step_order,
          'is_sent', l.is_sent,
          'action_taken', l.action_taken,
          'reason', l.reason,
          'created_at', l.created_at,
          'updated_at', l.updated_at,
          'created_by', json_build_object(
            'id', u.id,
            'name', u.name,
            'email', u.email
          ),
          'incoming_files', COALESCE((
            SELECT json_agg(json_build_object(
              'id', uf1.id,
              'label', uf1.label,
              'file', uf1.file
            ))
            FROM drawing_stage_log_files dslf1
            JOIN uploaded_files uf1 ON dslf1.uploaded_file_id = uf1.id
            WHERE dslf1.log_id = l.id AND dslf1.type = 'incoming'
          ), '[]'::json),
          'outgoing_files', COALESCE((
            SELECT json_agg(json_build_object(
              'id', uf2.id,
              'label', uf2.label,
              'file', uf2.file
            ))
            FROM drawing_stage_log_files dslf2
            JOIN uploaded_files uf2 ON dslf2.uploaded_file_id = uf2.id
            WHERE dslf2.log_id = l.id AND dslf2.type = 'outgoing'
          ), '[]'::json)
        ))
        FROM drawing_stage_logs l
        LEFT JOIN users u ON l.created_by = u.id
        WHERE l.drawing_id = d.id
      ), '[]'::json) AS drawing_stage_logs

    FROM drawings d
    WHERE d.id = $1;
  `;

  const result = await pool.query(query, [drawing_id]);
  return result.rows[0];
}
export async function getDrawingLogById(drawingLogId) {
  const query = `
    SELECT 
      l.id,
      l.drawing_id,
      l.step_name,
      l.status,
      l.notes,
      l.reason,
      l.step_order,
      l.is_sent,
      l.action_taken,
      l.created_at,
      l.updated_at,

      json_build_object(
        'id', u.id,
        'name', u.name,
        'email', u.email
      ) AS created_by,

      COALESCE((
        SELECT json_agg(json_build_object(
          'id', uf1.id,
          'label', uf1.label,
          'file', uf1.file
        ))
        FROM drawing_stage_log_files dslf1
        JOIN uploaded_files uf1 ON dslf1.uploaded_file_id = uf1.id
        WHERE dslf1.log_id = l.id AND dslf1.type = 'incoming'
      ), '[]'::json) AS incoming_files,

      COALESCE((
        SELECT json_agg(json_build_object(
          'id', uf2.id,
          'label', uf2.label,
          'file', uf2.file
        ))
        FROM drawing_stage_log_files dslf2
        JOIN uploaded_files uf2 ON dslf2.uploaded_file_id = uf2.id
        WHERE dslf2.log_id = l.id AND dslf2.type = 'outgoing'
      ), '[]'::json) AS outgoing_files

    FROM drawing_stage_logs l
    LEFT JOIN users u ON l.created_by = u.id
    WHERE l.id = $1;
  `;

  const result = await pool.query(query, [drawingLogId]);
  return result.rows[0] || null;
}
export async function getUserAssignedTasks(
  userId,
  queryText = "",
  page = 1,
  size = 10,
  filter = "all"
) {
  const offset = (page - 1) * size;

  let filterCondition = "";
  if (filter === "not_started") {
    filterCondition = "AND l.status = 'pending'";
  } else if (filter === "in_progress") {
    filterCondition = "AND l.status = 'in_progress'";
  } else if (filter === "completed") {
    filterCondition = "AND l.status = 'completed'";
  }

  const values = [userId, `%${queryText}%`, size, offset];

  const query = `
    WITH filtered_logs AS (
      SELECT 
        l.*,
        d.title AS drawing_title,
        p.id AS project_id,
        p.project_id AS project_code,
        d.uploaded_by AS project_uploaded_by,
        p.client_company,
        p.priority AS estimation_priority,
        e.deadline AS estimation_due_date,
        u.name AS assigned_by_name,
        u.email AS assigned_by_email,
        u.id AS assigned_by_id,

        -- Sent to user (get from the next log for same drawing)
        (
          SELECT json_build_object(
            'name', fu.name,
            'role', fu.role,
            'datetime', next_l.created_at
          )
          FROM drawing_stage_logs next_l
          JOIN users fu ON fu.id = next_l.forwarded_user_id
          WHERE next_l.drawing_id = l.drawing_id
            AND next_l.id > l.id
          ORDER BY next_l.id ASC
          LIMIT 1
        ) AS sent_to,

        -- Incoming files
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', uf1.id,
            'label', uf1.label,
            'file', uf1.file
          ))
          FROM drawing_stage_log_files dslf1
          JOIN uploaded_files uf1 ON dslf1.uploaded_file_id = uf1.id
          WHERE dslf1.log_id = l.id AND dslf1.type = 'incoming'
        ), '[]'::json) AS incoming_files,

        -- Outgoing files
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', uf2.id,
            'label', uf2.label,
            'file', uf2.file
          ))
          FROM drawing_stage_log_files dslf2
          JOIN uploaded_files uf2 ON dslf2.uploaded_file_id = uf2.id
          WHERE dslf2.log_id = l.id AND dslf2.type = 'outgoing'
        ), '[]'::json) AS outgoing_files,

        COUNT(*) OVER() AS total_count

      FROM drawing_stage_logs l
      JOIN drawings d ON d.id = l.drawing_id
      JOIN projects p ON p.id = d.project_id
      JOIN users u ON u.id = l.created_by
      LEFT JOIN estimations e ON e.project_id = p.id

      WHERE l.forwarded_user_id = $1
        AND (l.step_name = 'drafting' OR l.step_name = 'checking')
        AND (
          d.title ILIKE $2 OR
          p.client_company ILIKE $2 OR
          p.project_id ILIKE $2
        )
        ${filterCondition}
      ORDER BY l.created_at DESC
      LIMIT $3 OFFSET $4
    )

    SELECT 
      id,
      project_uploaded_by,
      drawing_id,
      drawing_title,
      step_name,
      status,
      is_sent,
      action_taken,
      step_order,
      notes,
      reason,
      created_at,
      updated_at,
      json_build_object('id', assigned_by_id, 'name', assigned_by_name, 'email', assigned_by_email) AS assigned_by,
      sent_to,
      project_id,
      project_code,
      client_company,
      estimation_due_date,
      estimation_priority,
      incoming_files,
      outgoing_files,
      total_count
    FROM filtered_logs;
  `;

  const result = await pool.query(query, values);
  const total = result.rows[0]?.total_count || 0;
  const totalPages = Math.ceil(total / size);

  return {
    total_pages: totalPages,
    tasks: result.rows,
  };
}
export async function updateDrawingLog(
  logId,
  status,
  action_taken = "not_yet",
  reason = "",
  uploaded_files_ids = []
) {
  const client = await pool.connect();
  let newlyAddedFiles = [];

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE drawing_stage_logs
      SET status = $1, action_taken = $2, reason = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [status, action_taken, reason, logId]
    );

    if (uploaded_files_ids.length > 0) {
      const insertPromises = uploaded_files_ids.map((fileId) =>
        client.query(
          `INSERT INTO drawing_stage_log_files (log_id, uploaded_file_id, type)
           VALUES ($1, $2, 'outgoing')
           RETURNING uploaded_file_id`,
          [logId, fileId]
        )
      );

      const insertedIds = await Promise.all(insertPromises);
      const insertedFileIds = insertedIds.map(
        (r) => r.rows[0].uploaded_file_id
      );

      const fileResult = await client.query(
        `SELECT id, label, file
         FROM uploaded_files
         WHERE id = ANY($1::int[])`,
        [insertedFileIds]
      );

      newlyAddedFiles = fileResult.rows;
    }

    await client.query("COMMIT");
    return newlyAddedFiles;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getUserTaskStats(userId) {
  const query = `
    SELECT
      COUNT(*) FILTER (
        WHERE l.forwarded_user_id = $1 AND (l.step_name = 'drafting' OR l.step_name = 'checking')
      ) AS total,

      COUNT(*) FILTER (
        WHERE l.forwarded_user_id = $1 AND l.status = 'completed' AND (l.step_name = 'drafting' OR l.step_name = 'checking')
      ) AS completed,

      COUNT(*) FILTER (
        WHERE l.forwarded_user_id = $1 AND l.status = 'in_progress' AND (l.step_name = 'drafting' OR l.step_name = 'checking')
      ) AS pending,

      COUNT(*) FILTER (
        WHERE l.forwarded_user_id = $1 AND l.status = 'rejected' AND (l.step_name = 'drafting' OR l.step_name = 'checking')
      ) AS rejected,

      COUNT(*) FILTER (
        WHERE l.forwarded_user_id = $1 AND l.status = 'pending' AND (l.step_name = 'drafting' OR l.step_name = 'checking')
      ) AS not_started
  FROM drawing_stage_logs l;
  `;

  const values = [userId];
  const result = await pool.query(query, values);

  return (
    result.rows[0] || {
      total: 0,
      completed: 0,
      pending: 0,
      rejected: 0,
      not_started: 0,
    }
  );
}

export async function updateLogStatus(logId, isSent) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE drawing_stage_logs 
       SET is_sent = $1, updated_at = NOW() 
       WHERE id = $2 RETURNING *`,
      [isSent, logId]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteDrawingLog(logId) {
  const result = await pool.query(
    `DELETE FROM drawing_stage_logs 
     WHERE id = $1 RETURNING *`,
    [logId]
  );
  return result.rows[0];
}

export async function getUserAssignedTaskByLogId(logId) {
  const query = `
    WITH filtered_log AS (
      SELECT 
        l.*,
        d.title AS drawing_title,
        p.id AS project_id,
        p.project_id AS project_code,
        p.client_company,
        d.uploaded_by AS project_uploaded_by,
        p.priority AS estimation_priority,
        e.deadline AS estimation_due_date,
        u.name AS assigned_by_name,
        u.id AS assigned_by_id,
        u.email AS assigned_by_email,

        -- Sent to user (next log)
        (
          SELECT json_build_object(
            'name', fu.name,
            'role', fu.role,
            'datetime', next_l.created_at
          )
          FROM drawing_stage_logs next_l
          JOIN users fu ON fu.id = next_l.forwarded_user_id
          WHERE next_l.drawing_id = l.drawing_id
            AND next_l.id > l.id
          ORDER BY next_l.id ASC
          LIMIT 1
        ) AS sent_to,

        -- Incoming files
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', uf1.id,
            'label', uf1.label,
            'file', uf1.file
          ))
          FROM drawing_stage_log_files dslf1
          JOIN uploaded_files uf1 ON dslf1.uploaded_file_id = uf1.id
          WHERE dslf1.log_id = l.id AND dslf1.type = 'incoming'
        ), '[]'::json) AS incoming_files,

        -- Outgoing files
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', uf2.id,
            'label', uf2.label,
            'file', uf2.file
          ))
          FROM drawing_stage_log_files dslf2
          JOIN uploaded_files uf2 ON dslf2.uploaded_file_id = uf2.id
          WHERE dslf2.log_id = l.id AND dslf2.type = 'outgoing'
        ), '[]'::json) AS outgoing_files

      FROM drawing_stage_logs l
      JOIN drawings d ON d.id = l.drawing_id
      JOIN projects p ON p.id = d.project_id
      JOIN users u ON u.id = l.created_by
      LEFT JOIN estimations e ON e.project_id = p.id
      WHERE l.id = $1
    )

    SELECT 
      id,
      drawing_id,
      drawing_title,
      step_name,
      status,
      is_sent,
      action_taken,
      step_order,
      notes,
      reason,
      project_uploaded_by,
      created_at,
      updated_at,
      json_build_object('id', assigned_by_id, 'name', assigned_by_name, 'email', assigned_by_email) AS assigned_by,      
      sent_to,
      project_id,
      project_code,
      client_company,
      estimation_due_date,
      estimation_priority,
      incoming_files,
      outgoing_files
    FROM filtered_log;
  `;

  const result = await pool.query(query, [logId]);
  return result.rows[0] || null;
}

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
        revision: "A",
      };
    } else {
      return {
        name: stage.name,
        weight: stage.weight,
        allocated_hours: stage.allocated_hours,
        project_id,
        status: "not_started",
        revision: index == 1 ? "B" : index == 2 ? "C" : "1",
      };
    }
  });

  const insertions = stages.map((stage) =>
    pool.query(
      `INSERT INTO stages (name, weight, allocated_hours, project_id, status,revision)
       VALUES ($1, $2, $3, $4, $5,$6) RETURNING *`,
      [
        stage.name,
        stage.weight,
        stage.allocated_hours,
        project_id,
        stage.status,
        stage.revision,
      ]
    )
  );

  return Promise.all(insertions).then((results) => {
    const grouped = {};
    results.forEach((res) => {
      const stage = res.rows[0];
      if (!grouped[stage.name]) {
        grouped[stage.name] = {};
      }
      grouped[stage.name]["stage"] = stage;
      grouped[stage.name]["drawing"] = null;
      grouped[stage.name]["drawingLogs"] = [];
    });
    return grouped;
  });
}

export async function partialUpdateStage(stageId, updateData) {
  const fields = [];
  const values = [];
  let index = 1;
  console.log(stageId, updateData);
  for (const key in updateData) {
    fields.push(`${key} = $${index}`);
    values.push(updateData[key]);
    index++;
  }

  if (fields.length === 0) {
    throw new Error("No fields provided for update.");
  }

  values.push(stageId); // for WHERE clause

  const query = `
    UPDATE stages
    SET ${fields.join(", ")}, updated_at = NOW()
    WHERE id = $${index}
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
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

    // Get current step order
    const stepOrderRes = await client.query(
      `SELECT COUNT(*) AS count FROM drawing_stage_logs WHERE drawing_id = $1`,
      [drawingId]
    );
    const step_order = parseInt(stepOrderRes.rows[0].count, 10) + 1;

    // === Determine forwarded_user_id ===
    if (!forwarded_user_id) {
      if (step_name.toLowerCase() === "approval") {
        // Get uploaded_by from the drawing
        const drawingRes = await client.query(
          `SELECT uploaded_by FROM drawings WHERE id = $1`,
          [drawingId]
        );
        forwarded_user_id = drawingRes.rows[0]?.uploaded_by || null;
      } else {
        // Get from last similar step
        const lastForwardedRes = await client.query(
          `SELECT forwarded_user_id FROM drawing_stage_logs
           WHERE drawing_id = $1 AND step_name = $2 AND forwarded_user_id IS NOT NULL
           ORDER BY created_at DESC
           LIMIT 1`,
          [drawingId, step_name]
        );
        if (lastForwardedRes.rows.length > 0) {
          forwarded_user_id = lastForwardedRes.rows[0].forwarded_user_id;
        }
      }
    }

    // === Insert the log ===
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

    // === Insert uploaded files ===
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

export async function addFinalFiles(drawingId, uploadedFileIds = []) {
  if (!drawingId || !uploadedFileIds.length) return [];

  const values = uploadedFileIds
    .map((fileId) => `(${drawingId}, ${fileId})`)
    .join(", ");

  const query = `
    INSERT INTO final_files (drawing_id, uploaded_file_id)
    VALUES ${values}
    RETURNING *;
  `;

  const result = await pool.query(query);
  return result.rows;
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

      -- Final files
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', uf.id,
          'label', uf.label,
          'file', uf.file
        ))
        FROM final_files ff
        JOIN uploaded_files uf ON ff.uploaded_file_id = uf.id
        WHERE ff.drawing_id = d.id
      ), '[]'::json) AS final_files,

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
export async function getUserAssignedTasksForProject(
  userId,
  projectId,
  page = 1,
  size = 10
) {
  const offset = (page - 1) * size;
  const values = [userId, projectId, size, offset];

  const query = `
    WITH filtered_logs AS (
      SELECT 
        l.*,
        d.title AS drawing_title,
        d.revision,
        d.drawing_type,
        d.client_dwg_no,
        d.iqeas_dwg_no,
        d.allocated_hours,
        d.drawing_weightage,
        d.created_at AS drawing_created_at,
        d.stage_id,
        json_build_object(
          'id', du.id,
          'name', du.name,
          'email', du.email
        ) AS drawing_uploaded_by_user,
        u.id AS assigned_by_id,
        u.name AS assigned_by_name,
        u.email AS assigned_by_email,

        -- Estimation uploaded files
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', uf.id,
            'label', uf.label,
            'file', uf.file
          ))
          FROM estimations e
          JOIN estimation_uploaded_files ef ON ef.estimation_id = e.id
          JOIN uploaded_files uf ON uf.id = ef.uploaded_file_id
          WHERE e.project_id = d.project_id
        ), '[]'::json) AS estimation_files,

        -- Drawing uploaded files
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', uf.id,
            'label', uf.label,
            'file', uf.file
          ))
          FROM drawings_uploaded_files duf
          JOIN uploaded_files uf ON duf.uploaded_file_id = uf.id
          WHERE duf.drawing_id = d.id
        ), '[]'::json) AS drawing_files,

        -- Sent to user
        (
          SELECT json_build_object(
            'name', fu.name,
            'role', fu.role,
            'datetime', next_l.created_at
          )
          FROM drawing_stage_logs next_l
          JOIN users fu ON fu.id = next_l.forwarded_user_id
          WHERE next_l.drawing_id = l.drawing_id AND next_l.id > l.id
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
      JOIN users du ON du.id = d.uploaded_by
      JOIN users u ON u.id = l.created_by
      WHERE l.forwarded_user_id = $1 AND d.project_id = $2
      ORDER BY l.created_at DESC
      LIMIT $3 OFFSET $4
    )

    SELECT 
      id,
      drawing_id,
      drawing_title,
      drawing_type,
      revision,
      drawing_weightage,
      allocated_hours,
      client_dwg_no,
      iqeas_dwg_no,
      stage_id,
      status,
      step_name,
      is_sent,
      action_taken,
      step_order,
      drawing_created_at,
      notes,
      reason,
      created_at,
      updated_at,
      drawing_uploaded_by_user,
      json_build_object('id', assigned_by_id, 'name', assigned_by_name, 'email', assigned_by_email) AS assigned_by,
      sent_to,
      estimation_files,
      drawing_files,
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
  is_sent = false,
  uploaded_files_ids = []
) {
  const client = await pool.connect();
  let newlyAddedFiles = [];

  try {
    await client.query("BEGIN");
    let result;
    if (is_sent != null || is_sent == undefined) {
      result = await client.query(
        `UPDATE drawing_stage_logs
        SET status = $1, action_taken = $2, reason = $3, updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [status, action_taken, reason, logId]
      );
    } else {
      result = await client.query(
        `UPDATE drawing_stage_logs
        SET status = $1, action_taken = $2, reason = $3,is_sent=$6, updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [status, action_taken, reason, logId, is_sent]
      );
    }

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
        d.revision,
        d.drawing_type,
        d.client_dwg_no,
        d.iqeas_dwg_no,
        d.allocated_hours,
        d.drawing_weightage,
        d.uploaded_by AS drawing_uploaded_by,
        d.stage_id,
        p.progress AS project_progress,
        d.created_at AS drawing_created_at,
        s.name AS stage_name,
        p.id AS project_id,
        p.project_id AS project_code,
        p.client_company,
        p.contact_person,
        p.contact_person_email,
        p.contact_person_phone,
        p.status AS project_status,
        p.priority AS estimation_priority,

        e.deadline AS estimation_due_date,

        u.name AS assigned_by_name,
        u.email AS assigned_by_email,
        u.id AS assigned_by_id,

        -- Drawing Creator
        json_build_object(
          'id', du.id,
          'name', du.name,
          'email', du.email
        ) AS drawing_uploaded_by_user,

        -- Estimation uploaded files
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', uf.id,
            'label', uf.label,
            'file', uf.file
          ))
          FROM estimations e2
          JOIN estimation_uploaded_files ef ON ef.estimation_id = e2.id
          JOIN uploaded_files uf ON uf.id = ef.uploaded_file_id
          WHERE e2.project_id = p.id
        ), '[]'::json) AS estimation_files,

        -- Drawing uploaded files
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', uf.id,
            'label', uf.label,
            'file', uf.file
          ))
          FROM drawings_uploaded_files duf
          JOIN uploaded_files uf ON duf.uploaded_file_id = uf.id
          WHERE duf.drawing_id = d.id
        ), '[]'::json) AS drawing_files,

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
      JOIN users du ON du.id = d.uploaded_by
      JOIN projects p ON p.id = d.project_id
      JOIN users u ON u.id = l.created_by
      JOIN stages s ON s.id = d.stage_id
      LEFT JOIN estimations e ON e.project_id = p.id
      WHERE l.id = $1
    )

    SELECT 
      id,
      drawing_id,
      drawing_title,
      drawing_type,
      revision,
      drawing_weightage,
      allocated_hours,
      stage_name,
      project_progress,
      client_dwg_no,
      iqeas_dwg_no,
      stage_id,
      status,
      step_name,
      is_sent,
      action_taken,
      step_order,
      drawing_created_at,
      notes,
      reason,
      created_at,
      updated_at,
      drawing_uploaded_by_user,
      json_build_object('id', assigned_by_id, 'name', assigned_by_name, 'email', assigned_by_email) AS assigned_by,
      sent_to,
      -- Project details
      project_id,
      project_code,
      client_company,
      contact_person,
      contact_person_phone,
      contact_person_email,
      project_status,
      -- Estimation
      estimation_due_date,
      estimation_priority,
      estimation_files,
      -- Drawing
      drawing_files,
      -- Files
      incoming_files,
      outgoing_files
    FROM filtered_log;
  `;

  const result = await pool.query(query, [logId]);
  return result.rows[0] || null;
}

export async function getStageIdByProjectAndName(project_id, name) {
  const result = await pool.query(
    `SELECT id FROM stages WHERE project_id = $1 AND name = $2 LIMIT 1`,
    [project_id, name]
  );
  return result.rows[0]?.id || null;
}
export async function getStageById(stageId) {
  const query = `
    SELECT 
      id,
      project_id,
      name,
      weight,
      allocated_hours,
      created_at,
      updated_at,
      status,
      revision
    FROM stages
    WHERE id = $1
  `;

  const result = await pool.query(query, [stageId]);
  return result.rows[0] || null;
}

export async function getFinalFilesByProjectId(projectId) {
  const { rows } = await pool.query(
    `
    SELECT 
      uf.id,
      uf.label,
      uf.file
    FROM final_files ff
    JOIN uploaded_files uf ON ff.uploaded_file_id = uf.id
    JOIN drawings d ON ff.drawing_id = d.id
    WHERE d.project_id = $1
    `,
    [projectId]
  );
  console.log(rows);

  return rows;
}

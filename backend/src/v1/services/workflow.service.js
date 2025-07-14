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
    uploaded_files_ids
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
      iqeas_dwg_no
    ]
  );
  const drawingId = result.rows[0].id;
  if (uploaded_files_ids?.length) {
    const fileInsertions = uploaded_files_ids.map((fileId) =>
      pool.query(
        `INSERT INTO drawings_uploaded_files (drawing_id, uploaded_file_id) VALUES ($1, $2)`,
        [drawingId, fileId]
      )
    );
    await Promise.all(fileInsertions);
  }
  return result.rows[0];
}

export async function addDrawingStageLog(
  drawingId,
  step_name,
  status,
  notes,
  userId,
  files,
  forwarded_to,
  forwarded_id
) {
  const drawingRes = await pool.query(
    `SELECT stage_id FROM drawings WHERE id = $1`,
    [drawingId]
  );
  const stage_id = drawingRes.rows[0].stage_id;

  const logRes = await pool.query(
    `INSERT INTO drawing_stage_logs 
     (drawing_id, stage_id, step_name, status, notes, created_by, forwarded_to, forwarded_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      drawingId,
      stage_id,
      step_name,
      status,
      notes,
      userId,
      forwarded_to || null,
      forwarded_id || null,
    ]
  );

  const logId = logRes.rows[0].id;

  if (files?.length) {
    await Promise.all(
      files.map((file) =>
        pool.query(
          `INSERT INTO drawing_stage_log_files (log_id, uploaded_file_id) VALUES ($1, $2)`,
          [logId, file.id]
        )
      )
    );
  }

  return logRes.rows[0];
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
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', uf.id,
            'label', uf.label,
            'file', uf.file
          ))
          FROM drawings_uploaded_files duf
          JOIN uploaded_files uf ON duf.uploaded_file_id = uf.id
          WHERE duf.drawing_id = d.id
        ), '[]'::json
      ) AS uploaded_files,

      -- Drawing stage logs
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', l.id,
            'step_name', l.step_name,
            'status', l.status,
            'notes', l.notes,
            'reason', l.reason,
            'created_by', json_build_object(
              'id', u.id,
              'name', u.name,
              'email', u.email
            ),
            'created_at', l.created_at,
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
          WHERE l.drawing_id = d.id AND l.stage_id = $2
        ), '[]'::json
      ) AS drawing_stage_logs

    FROM drawings d
    WHERE d.project_id = $1 AND d.stage_id = $2;
  `;

  const values = [projectId, stageId];
  const result = await pool.query(query, values);
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

      -- Drawing uploaded_files
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', uf.id,
            'label', uf.label,
            'file', uf.file
          ))
          FROM drawings_uploaded_files duf
          JOIN uploaded_files uf ON duf.uploaded_file_id = uf.id
          WHERE duf.drawing_id = d.id
        ), '[]'::json
      ) AS uploaded_files,

      -- Drawing stage logs
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', l.id,
            'step_name', l.step_name,
            'status', l.status,
            'notes', l.notes,
            'reason', l.reason,
            'created_by', json_build_object(
              'id', u.id,
              'name', u.name,
              'email', u.email
            ),
            'created_at', l.created_at,
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
        ), '[]'::json
      ) AS drawing_stage_logs

    FROM drawings d
    WHERE d.id = $1;
  `;

  const values = [drawing_id];
  const result = await pool.query(query, values);
  return result.rows[0];
}

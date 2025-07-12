import pool from "../config/db.js";

export async function createStage({ project_id, name, weight, allocated_hours }) {
  const result = await pool.query(
    `INSERT INTO stages (project_id, name, weight, allocated_hours)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [project_id, name, weight, allocated_hours]
  );
  return result.rows[0];
}

export async function uploadStageFiles(stageId, files) {
  const insertions = files.map(file =>
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
    stage_id
  } = data;

  const result = await pool.query(
    `INSERT INTO drawings (title, drawing_type, revision, drawing_weightage, allocated_hours, project_id, stage_id, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [title, drawing_type, revision, drawing_weightage, allocated_hours, project_id, stage_id, uploaded_by]
  );
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
      forwarded_id || null
    ]
  );

  const logId = logRes.rows[0].id;

  if (files?.length) {
    await Promise.all(
      files.map(file =>
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

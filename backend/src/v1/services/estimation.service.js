import pool from "../config/db.js";
import { updateProjectPartial } from "./projects.service.js";
export async function createEstimation(data) {
  const {
    project_id,
    user_id,
    status = "approved",
    log = null,
    cost = null,
    deadline = null,
    approval_date = null,
    approved = false,
    sent_to_pm = false,
    forwarded_user_id = null,
    notes = null,
    uploaded_file_ids = [],
  } = data;

  const query = `
  INSERT INTO estimations (
    project_id, user_id, status, log, cost,
    deadline, approval_date, approved, sent_to_pm,
    forwarded_user_id, notes
  ) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9, $10,
    $11
  ) RETURNING *;
`;

  const values = [
    project_id,
    user_id,
    status,
    log,
    cost,
    deadline,
    approval_date,
    approved,
    sent_to_pm,
    forwarded_user_id,
    notes,
  ];

  const result = await pool.query(query, values);
  const estimation = result.rows[0];

  if (uploaded_file_ids.length > 0) {
    const promises = uploaded_file_ids.map((fileId) =>
      pool.query(
        `INSERT INTO estimation_uploaded_files (estimation_id, uploaded_file_id) VALUES ($1, $2)`,
        [estimation.id, fileId]
      )
    );
    await Promise.all(promises);
  }
  await updateProjectPartial(project_id, {
    estimation_status: "approved",
    status: "Working",
  });

  return estimation;
}
export async function getEstimationById(estimationId) {
  const query = `
    SELECT 
      e.id,
      e.created_at,
      e.updated_at,
      e.project_id,
      e.user_id,
      e.log,
      e.cost,
      e.deadline,
      e.approval_date,
      e.approved,
      e.sent_to_pm,
      e.forwarded_user_id,
      e.notes,
      e.updates,

      -- Estimation owner (user)
      json_build_object(
        'id', eu.id,
        'name', eu.name,
        'email', eu.email
      ) AS user,

      -- Uploaded files
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', uf.id,
              'label', uf.label,
              'file', uf.file
            )
          )
          FROM estimation_uploaded_files euf
          JOIN uploaded_files uf ON euf.uploaded_file_id = uf.id
          WHERE euf.estimation_id = e.id
        ), '[]'::json
      ) AS uploaded_files,

      -- Forwarded user info
      (
        SELECT json_build_object(
          'id', u.id,
          'label', u.name,
          'email', u.email
        )
        FROM users u
        WHERE u.id = e.forwarded_user_id
      ) AS forwarded_to

    FROM estimations e
    JOIN users eu ON e.user_id = eu.id
    WHERE e.id = $1
    LIMIT 1;
  `;

  const values = [estimationId];
  const result = await pool.query(query, values);
  return result.rows[0] || null;
}


export async function updateEstimation(id, data) {
  const fields = [];
  const values = [];
  let index = 1;

  for (const key in data) {
    fields.push(`${key} = $${index}`);
    values.push(data[key]);
    index++;
  }

  if (fields.length === 0) {
    throw new Error("No fields provided to update");
  }

  const query = `
    UPDATE estimations
    SET ${fields.join(", ")}, updated_at = NOW()
    WHERE id = $${index}
    RETURNING *;
  `;

  values.push(id);

  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function getProjectsSentToPM() {
  const query = `SELECT * FROM estimations WHERE sent_to_pm = true ORDER BY created_at DESC;`;
  const result = await pool.query(query);
  return result.rows;
}

export async function getProjectsApproved() {
  const query = `SELECT * FROM estimations WHERE approved = false ORDER BY created_at DESC;`;
  const result = await pool.query(query);
  return result.rows;
}

export async function getProjectsDraft() {
  const query = `SELECT * FROM estimations WHERE status = 'draft' ORDER BY created_at DESC;`;
  const result = await pool.query(query);
  return result.rows;
}

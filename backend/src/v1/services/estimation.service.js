import pool from "../config/db.js";
import { generateInvoiceExcel } from "../lib/excel.js";
import { uploadFile } from "../lib/s3.js";
import { uuidGenerator } from "../utils/uuidGenerator.js";
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

  return estimation;
}

export async function createEstimationCorrection(data, client) {
  const { estimation_id, correction } = data;

  const query = `
  INSERT INTO estimation_corrections (
    estimation_id,correction
  ) VALUES (
    $1, $2
  ) RETURNING *;
`;

  const values = [estimation_id, correction];

  const result = await client.query(query, values);
  return result.rows[0];
}

export async function updateEstimation(id, data, client) {
  const fields = [];
  const values = [];
  let index = 1;
  const uploaded_file_ids = data.uploaded_file_ids;
  delete data.uploaded_file_ids;
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

  const result = await client.query(query, values);

  if (uploaded_file_ids && uploaded_file_ids.length > 0) {
    const promises = uploaded_file_ids.map((fileId) =>
      client.query(
        `INSERT INTO estimation_uploaded_files (estimation_id, uploaded_file_id) VALUES ($1, $2)`,
        [id, fileId]
      )
    );
    await Promise.all(promises);
  }
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

export async function getEstimationById(estimationId, client) {
  const query = `
    SELECT 
      e.*,

      json_build_object(
        'id', u.id,
        'name', u.name,
        'email', u.email
      ) AS user,

      (
        SELECT json_build_object(
          'id', fuser.id,
          'label', fuser.name,
          'email', fuser.email
        )
        FROM users fuser
        WHERE fuser.id = e.forwarded_user_id
      ) AS forwarded_to,

      COALESCE((
        SELECT json_agg(json_build_object(
          'id', uf.id,
          'label', uf.label,
          'file', uf.file
        ))
        FROM estimation_uploaded_files euf
        JOIN uploaded_files uf ON euf.uploaded_file_id = uf.id
        WHERE euf.estimation_id = e.id
      ), '[]'::json) AS uploaded_files,

      COALESCE((
        SELECT json_agg(json_build_object(
          'id', ec.id,
          'correction', ec.correction,
          'created_at', ec.created_at
        ) ORDER BY ec.created_at DESC)
        FROM estimation_corrections ec
        WHERE ec.estimation_id = e.id
      ), '[]'::json) AS corrections,

      (
        SELECT json_build_object(
          'id', p.id,
          'project_id', p.project_id,
          'name', p.name,
          'client_name', p.client_name,
          'client_company', p.client_company,
          'send_to_estimation', p.send_to_estimation,
          'uploaded_files', COALESCE((
            SELECT json_agg(json_build_object(
              'id', uf1.id,
              'file', uf1.file,
              'label', uf1.label
            ))
            FROM projects_uploaded_files puf
            JOIN uploaded_files uf1 ON puf.uploaded_file_id = uf1.id
            WHERE puf.project_id = p.id
          ), '[]'::json),

          'add_more_infos', COALESCE((
            SELECT json_agg(json_build_object(
              'id', pm.id,
              'notes', pm.notes,
              'enquiry', pm.enquiry,
              'uploaded_files', COALESCE((
                SELECT json_agg(json_build_object(
                  'id', uf2.id,
                  'file', uf2.file,
                  'label', uf2.label
                ))
                FROM project_more_info_uploaded_files pmuf
                JOIN uploaded_files uf2 ON pmuf.uploaded_file_id = uf2.id
                WHERE pmuf.project_more_info_id = pm.id
              ), '[]'::json)
            ))
            FROM project_more_info pm
            WHERE pm.project_id = p.id
          ), '[]'::json),

          'project_rejection', (
            SELECT json_build_object(
              'id', pr.id,
              'note', pr.note,
              'created_at', pr.created_at,
              'user', json_build_object(
                'id', pru.id,
                'name', pru.name
              ),
              'uploaded_files', COALESCE((
                SELECT json_agg(json_build_object(
                  'id', uf3.id,
                  'file', uf3.file,
                  'label', uf3.label
                ))
                FROM project_rejection_uploaded_files prf
                JOIN uploaded_files uf3 ON prf.uploaded_file_id = uf3.id
                WHERE prf.project_rejection_id = pr.id
              ), '[]'::json)
            )
            FROM project_rejections pr
            JOIN users pru ON pr.user_id = pru.id
            WHERE pr.project_id = p.id
            ORDER BY pr.created_at DESC
            LIMIT 1
          )
        )
        FROM projects p
        WHERE p.id = e.project_id
      ) AS project

    FROM estimations e
    LEFT JOIN users u ON e.user_id = u.id
    WHERE e.id = $1
    LIMIT 1
  `;

  const result = await client.query(query, [estimationId]);
  return result.rows[0];
}


export async function createInvoice(client, estimationId, data, currentUserId) {
  const file = await generateInvoiceExcel(data);
  const uuid = uuidGenerator();
  const file_name = `invoice-${uuid}`;
  const file_url = await uploadFile(file, file_name, "estimation-folder");

  const query = `
    INSERT INTO estimation_uploaded_files (estimation_id, uploaded_file_id)
    SELECT $4, id FROM uploaded_files
    WHERE file = $1
    UNION ALL
    SELECT $4, id FROM (
      INSERT INTO uploaded_files (label, file, uploaded_by_id, status)
      SELECT $2, $1, $3, 'under_review'
      WHERE NOT EXISTS (SELECT 1 FROM uploaded_files WHERE file = $1)
      RETURNING id
    ) AS new_file
    ON CONFLICT DO NOTHING
    RETURNING uploaded_file_id;
  `;

  const values = [file_url, file_name, currentUserId, estimationId];
  const result = await client.query(query, values);

  return result.rows[0];
}

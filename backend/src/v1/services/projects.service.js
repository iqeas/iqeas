import pool from "../config/db.js";
import { generateProjectId } from "../utils/projectIdCreator.js";

export async function createProject(projectData) {
  const {
    user_id,
    name,
    client_name,
    client_company,
    received_date,
    location,
    project_type,
    priority,
    contact_person,
    contact_person_phone,
    contact_person_email,
    notes,
    status = "draft",
    send_to_estimation = false,
  } = projectData;
  const project_id = generateProjectId();
  const query = `
    INSERT INTO projects (
      user_id, name, project_id, received_date,
      client_name, client_company, location,
      project_type, priority, contact_person,
      contact_person_phone, contact_person_email,
      notes, status, send_to_estimation
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7,
      $8, $9, $10,
      $11, $12,
      $13, $14, $15
    ) RETURNING *
  `;

  const values = [
    user_id,
    name,
    project_id,
    received_date,
    client_name,
    client_company,
    location,
    project_type,
    priority,
    contact_person,
    contact_person_phone,
    contact_person_email,
    notes,
    status,
    send_to_estimation,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function updateProjectPartial(id, fieldsToUpdate) {
  const keys = Object.keys(fieldsToUpdate);
  if (keys.length === 0) {
    throw new Error("No fields to update");
  }

  const setClauses = keys.map((key, idx) => `"${key}" = $${idx + 1}`);

  const values = keys.map((key) => fieldsToUpdate[key]);

  values.push(id);

  const query = `
    UPDATE projects
    SET ${setClauses.join(", ")}, updated_at = NOW()
    WHERE id = $${values.length}
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function getProjectByPagination(page = 1, size = 10) {
  const limit = Math.max(Number(size), 1);
  const offset = Math.max((Number(page) - 1) * limit, 0);

  const query = `
  SELECT 
  p.*,

  -- User object
  json_build_object(
    'id', u.id,
    'name', u.name,
    'email', u.email,
    'phonenumber', u.phonenumber
  ) AS user,

  -- Uploaded files directly on project
  COALESCE(
    (
      SELECT json_agg(json_build_object(
        'id', uf.id,
        'file', uf.file,
        'label', uf.label
      ))
      FROM projects_uploaded_files puf
      JOIN uploaded_files uf ON puf.uploaded_file_id = uf.id
      WHERE puf.project_id = p.id
    ), '[]'::json
  ) AS uploaded_files,

  -- Add more infos (array of { id, notes, enquiry, uploaded_files })
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id', pm.id,
          'notes', pm.notes,
          'enquiry', pm.enquiry,
          'uploaded_files',
            COALESCE((
              SELECT json_agg(
                json_build_object(
                  'id', uf2.id,
                  'file', uf2.file,
                  'label', uf2.label
                )
              )
              FROM project_more_info_uploaded_files pmuf
              JOIN uploaded_files uf2 ON pmuf.uploaded_file_id = uf2.id
              WHERE pmuf.project_more_info_id = pm.id
            ), '[]'::json)
        )
      )
      FROM project_more_info pm
      WHERE pm.project_id = p.id
    ), '[]'::json
  ) AS add_more_infos

FROM projects p

LEFT JOIN users u ON p.user_id = u.id

ORDER BY p.created_at DESC
LIMIT $1 OFFSET $2;

  `;

  const values = [limit, offset];

  const result = await pool.query(query, values);
  return result.rows;
}


export async function getProjectsSentToEstimation() {
  const query = `SELECT * FROM projects WHERE send_to_estimation = true ORDER BY created_at DESC;`;
  const result = await pool.query(query);
  return result.rows;
}

export async function getProjectsSentToPM() {
  const query = `SELECT * FROM projects WHERE send_to_pm = true ORDER BY created_at DESC;`;
  const result = await pool.query(query);
  return result.rows;
}



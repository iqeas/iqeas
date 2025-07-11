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



export async function getUploadedFilesByRolePaginated(
  userId,
  role,
  page = 1,
  size = 10
) {
  const limit = Math.max(Number(size), 1);
  const offset = Math.max((Number(page) - 1) * limit, 0);

  let baseWhereClause = "";
  let countWhereClause = "";
  let params = [];
  let countParams = [];

  if (role === "rfq") {
    baseWhereClause = `WHERE uf.uploaded_by_id = $1`;
    countWhereClause = `WHERE uploaded_by_id = $1`;
    params = [userId, limit, offset];
    countParams = [userId];
  } else if (role === "estimation") {
    baseWhereClause = `
      WHERE uf.uploaded_by_id = $1
         OR uf.uploaded_by_id IN (
           SELECT id FROM users WHERE role = 'rfq'
         )
    `;
    countWhereClause = `
      WHERE uploaded_by_id = $1
         OR uploaded_by_id IN (
           SELECT id FROM users WHERE role = 'rfq'
         )
    `;
    params = [userId, limit, offset];
    countParams = [userId];
  } else {
    throw new Error("Unauthorized role");
  }

  const query = `
    SELECT *
    FROM uploaded_files uf
    ${baseWhereClause}
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM uploaded_files
    ${countWhereClause}
  `;

  const result = await pool.query(query, params);
  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].total, 10);
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



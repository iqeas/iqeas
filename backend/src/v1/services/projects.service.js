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
  const project_id = await generateProjectId();
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

export async function createProjectUploadedFile(projectId, uploadedFileIds) {
  if (!Array.isArray(uploadedFileIds) || uploadedFileIds.length === 0) {
    throw new Error("uploadedFileIds must be a non-empty array");
  }

  const query = `
    INSERT INTO projects_uploaded_files (project_id, uploaded_file_id)
    VALUES ($1, $2)
    RETURNING *;
  `;

  const promises = uploadedFileIds.map(async (uploadedFileId) => {
    const values = [projectId, uploadedFileId];
    const result = await pool.query(query, values);
    return result.rows[0];
  });

  return Promise.all(promises);
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
export async function getProjectsEstimationProjects() {
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

      -- Add more infos
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
      ) AS add_more_infos,

      -- Estimation with forward logic and uploaded_files
      (
        SELECT json_build_object(
          'id', e.id,
          'status', e.status,
          'cost', e.cost,
          'deadline', e.deadline,
          'approval_date', e.approval_date,
          'approved', e.approved,
          'sent_to_pm', e.sent_to_pm,
          'notes', e.notes,
          'updates', e.updates,
          'log', e.log,
          'user',
            json_build_object(
              'id', eu.id,
              'name', eu.name,
              'email', eu.email
            ),
          'forwarded_to', 
            CASE 
              WHEN e.forward_type = 'user' THEN (
                SELECT json_build_object(
                  'type', 'user',
                  'id', fuser.id,
                  'label', fuser.name,
                  'users', NULL
                )
                FROM users fuser WHERE fuser.id = e.forward_id
              )
              WHEN e.forward_type = 'team' THEN (
  SELECT json_build_object(
    'type', 'team',
    'id', t.id,
    'label', t.title,
    'users', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', u2.id,
          'name', u2.name,
          'email', u2.email
        )
      )
      FROM teams_users tu
      JOIN users u2 ON u2.id = tu.user_id
      WHERE tu.team_id = t.id
    ), '[]'::json)
  )
  FROM teams t WHERE t.id = e.forward_id
)
              ELSE NULL
            END,
          'uploaded_files',
            COALESCE((
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
            ), '[]'::json)
        )
        FROM estimations e
        JOIN users eu ON e.user_id = eu.id
        WHERE e.project_id = p.id
        LIMIT 1
      ) AS estimation,

      -- Project Rejection (if any)
      (
        SELECT json_build_object(
          'id', pr.id,
          'note', pr.note,
          'created_at', pr.created_at,
          'user', json_build_object(
            'id', pru.id,
            'name', pru.name
          ),
          'uploaded_files', COALESCE((
            SELECT json_agg(
              json_build_object(
                'id', uf3.id,
                'file', uf3.file,
                'label', uf3.label
              )
            )
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
      ) AS project_rejection

    FROM projects p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.send_to_estimation = true
    ORDER BY p.created_at DESC;
  `;

  const result = await pool.query(query);
  return result.rows;
}


export async function getProjectsSentToPM() {
  const query = `SELECT * FROM projects WHERE send_to_pm = true ORDER BY created_at DESC;`;
  const result = await pool.query(query);
  return result.rows;
}

export async function getRFQCardData() {
  const active_projects = await pool.query(
    `SELECT COUNT(*) AS count FROM projects WHERE send_to_estimation = true`
  );
  const read_for_estimation = await pool.query(
    `SELECT COUNT(*) AS count FROM projects WHERE send_to_estimation = false`
  );

  return {
    active_projects: parseInt(active_projects.rows[0].count),
    read_for_estimation: parseInt(read_for_estimation.rows[0].count),
  };
}

export async function getEstimationCardData() {
  const active_estimation = await pool.query(
    `SELECT COUNT(*) AS count FROM projects WHERE send_to_estimation = true`
  );
  const pending_estimations = await pool.query(
    `SELECT COUNT(*) AS count FROM projects WHERE estimation_status != 'approved'`
  );
  const completed_estimations = await pool.query(
    `SELECT COUNT(*) AS count FROM projects WHERE estimation_status = 'approved'`
  );
  const total_value = await pool.query(
    `SELECT SUM(cost) AS total FROM estimations`
  );

  return {
    active_estimation: parseInt(active_estimation.rows[0].count),
    pending_estimations: parseInt(pending_estimations.rows[0].count),
    completed_estimations: parseInt(completed_estimations.rows[0].count),
    total_value: parseFloat(total_value.rows[0].total) || 0,
  };
}

import pool from "../config/db.js";
import { defineProjectProgress } from "../utils/defineProjectProgress.js";
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
  console.log(fieldsToUpdate.progress, defineProjectProgress(result.rows[0]));
  if (
    !fieldsToUpdate.progress &&
    defineProjectProgress(result.rows[0]) != result.rows[0].progress
  ) {
    console.log("enter to change progress");
    const progress = defineProjectProgress(result.rows[0]);
    console.log("new progress", progress);
    await pool.query(
      `UPDATE projects SET progress = $1, updated_at = NOW() WHERE id = $2`,
      [progress, id]
    );
  }
  return result.rows[0];
}
export async function getProjectByPagination(page = 1, size = 10, query = "") {
  const limit = Math.max(Number(size), 1);
  const offset = Math.max((Number(page) - 1) * limit, 0);
  const search = `%${query.toLowerCase()}%`;

  // Count total matching rows
  const countQuery = `
    SELECT COUNT(*) FROM projects p
    WHERE LOWER(p.name) ILIKE $1
       OR LOWER(p.project_id::TEXT) ILIKE $1
       OR LOWER(p.client_company) ILIKE $1
       OR LOWER(p.client_name) ILIKE $1
       OR LOWER(p.contact_person) ILIKE $1
  `;
  const countResult = await pool.query(countQuery, [search]);
  const totalCount = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(totalCount / limit);

  // Main query with pagination and search
  const dataQuery = `
    SELECT 
      p.*,

      json_build_object(
        'id', u.id,
        'name', u.name,
        'email', u.email,
        'phonenumber', u.phonenumber
      ) AS user,

      COALESCE((
        SELECT json_agg(json_build_object(
          'id', uf.id,
          'file', uf.file,
          'label', uf.label
        ))
        FROM projects_uploaded_files puf
        JOIN uploaded_files uf ON puf.uploaded_file_id = uf.id
        WHERE puf.project_id = p.id
      ), '[]'::json) AS uploaded_files,

      COALESCE((
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
      ), '[]'::json) AS add_more_infos

    FROM projects p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE LOWER(p.name) ILIKE $1
       OR LOWER(p.project_id::TEXT) ILIKE $1
       OR LOWER(p.client_company) ILIKE $1
       OR LOWER(p.client_name) ILIKE $1
       OR LOWER(p.contact_person) ILIKE $1
    ORDER BY p.created_at DESC
    LIMIT $2 OFFSET $3;
  `;

  const dataResult = await pool.query(dataQuery, [search, limit, offset]);

  return {
    total_pages: totalPages,
    projects: dataResult.rows,
  };
}

export async function getProjectsEstimationProjects(
  page = 1,
  size = 10,
  queryText = ""
) {
  const offset = (page - 1) * size;
  const search = `%${queryText}%`;

  const query = `
    WITH filtered_projects AS (
      SELECT 
        p.*,

        json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email,
          'phonenumber', u.phonenumber
        ) AS user,

        COALESCE((
          SELECT json_agg(json_build_object(
            'id', uf.id,
            'file', uf.file,
            'label', uf.label
          ))
          FROM projects_uploaded_files puf
          JOIN uploaded_files uf ON puf.uploaded_file_id = uf.id
          WHERE puf.project_id = p.id
        ), '[]'::json) AS uploaded_files,

        COALESCE((
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
        ), '[]'::json) AS add_more_infos,

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
            'user', json_build_object(
              'id', eu.id,
              'name', eu.name,
              'email', eu.email
            ),
            'forwarded_to', (
              SELECT json_build_object(
                'id', fuser.id,
                'label', fuser.name,
                'email', fuser.email
              )
              FROM users fuser
              WHERE fuser.id = e.forwarded_user_id
            ),
            'uploaded_files', COALESCE((
              SELECT json_agg(json_build_object(
                'id', uf.id,
                'label', uf.label,
                'file', uf.file
              ))
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
        ) AS project_rejection,

        COUNT(*) OVER() AS total_count

      FROM projects p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.send_to_estimation = true
        AND (
          p.client_company ILIKE $1 OR
          p.contact_person ILIKE $1 OR
          p.project_id::text ILIKE $1 OR
          p.name ILIKE $1 OR
          p.client_name ILIKE $1
        )
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    )

    SELECT * FROM filtered_projects;
  `;

  const result = await pool.query(query, [search, size, offset]);

  const total = result.rows[0]?.total_count || 0;
  const totalPages = Math.ceil(total / size);

  return {
    total_pages: totalPages,
    projects: result.rows,
  };
}
export async function getPMProjects({ page = 1, size = 10, query = "" }) {
  const offset = (page - 1) * size;
  const search = `%${query.toLowerCase()}%`;
  const values = [search, search, search, search, search, size, offset];

  const queryText = `
    WITH filtered_projects AS (
      SELECT *
      FROM projects
      WHERE (
        LOWER(client_company) ILIKE $1 OR
        LOWER(contact_person) ILIKE $2 OR
        LOWER(project_id) ILIKE $3 OR
        LOWER(name) ILIKE $4 OR
        LOWER(client_name) ILIKE $5
      )
      AND EXISTS (
        SELECT 1 FROM estimations e
        WHERE e.project_id = projects.id AND e.sent_to_pm = true
      )
      ORDER BY created_at DESC
      LIMIT $6 OFFSET $7
    )

    SELECT 
      fp.*,

      json_build_object(
        'id', u.id,
        'name', u.name,
        'email', u.email,
        'phonenumber', u.phonenumber
      ) AS user,

      COALESCE((
        SELECT json_agg(json_build_object(
          'id', uf.id,
          'file', uf.file,
          'label', uf.label
        ))
        FROM projects_uploaded_files puf
        JOIN uploaded_files uf ON puf.uploaded_file_id = uf.id
        WHERE puf.project_id = fp.id
      ), '[]'::json) AS uploaded_files,

      COALESCE((
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
        WHERE pm.project_id = fp.id
      ), '[]'::json) AS add_more_infos,

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
          'user', json_build_object(
            'id', eu.id,
            'name', eu.name,
            'email', eu.email
          ),
          'forwarded_to', (
            SELECT json_build_object(
              'id', fuser.id,
              'label', fuser.name,
              'email', fuser.email
            )
            FROM users fuser
            WHERE fuser.id = e.forwarded_user_id
          ),
          'uploaded_files', COALESCE((
            SELECT json_agg(json_build_object(
              'id', uf.id,
              'label', uf.label,
              'file', uf.file
            ))
            FROM estimation_uploaded_files euf
            JOIN uploaded_files uf ON euf.uploaded_file_id = uf.id
            WHERE euf.estimation_id = e.id
          ), '[]'::json)
        )
        FROM estimations e
        JOIN users eu ON e.user_id = eu.id
        WHERE e.project_id = fp.id
        LIMIT 1
      ) AS estimation,

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
        WHERE pr.project_id = fp.id
        ORDER BY pr.created_at DESC
        LIMIT 1
      ) AS project_rejection,

      (
        SELECT COALESCE(json_agg(json_build_object(
          'id', uf.id,
          'label', uf.label,
          'file', uf.file
        )), '[]'::json)
        FROM project_delivery_files pdf
        JOIN uploaded_files uf ON pdf.uploaded_file_id = uf.id
        WHERE pdf.project_id = fp.id
      ) AS delivery_files

    FROM filtered_projects fp
    LEFT JOIN users u ON fp.user_id = u.id;
  `;

  const totalQuery = `
    SELECT COUNT(*) FROM projects
    WHERE (
      LOWER(client_company) ILIKE $1 OR
      LOWER(contact_person) ILIKE $2 OR
      LOWER(project_id) ILIKE $3 OR
      LOWER(name) ILIKE $4 OR
      LOWER(client_name) ILIKE $5
    )
    AND EXISTS (
      SELECT 1 FROM estimations e
      WHERE e.project_id = projects.id AND e.sent_to_pm = true
    )
  `;

  const [result, totalResult] = await Promise.all([
    pool.query(queryText, values),
    pool.query(totalQuery, values.slice(0, 5)),
  ]);

  const totalPages = Math.ceil(Number(totalResult.rows[0].count) / size);

  return {
    total_pages: totalPages,
    projects: result.rows,
  };
}

export async function getAdminProjects({ page = 1, size = 10, query = "" }) {
  const offset = (page - 1) * size;
  const search = `%${query.toLowerCase()}%`;
  const values = [search, search, search, search, search, size, offset];

  const queryText = `
    WITH filtered_projects AS (
      SELECT *
      FROM projects
      WHERE
        LOWER(client_company) ILIKE $1 OR
        LOWER(contact_person) ILIKE $2 OR
        LOWER(project_id) ILIKE $3 OR
        LOWER(name) ILIKE $4 OR
        LOWER(client_name) ILIKE $5
      ORDER BY created_at DESC
      LIMIT $6 OFFSET $7
    )

    SELECT 
      fp.*,

      json_build_object(
        'id', u.id,
        'name', u.name,
        'email', u.email,
        'phonenumber', u.phonenumber
      ) AS user,

      COALESCE((
        SELECT json_agg(json_build_object(
          'id', uf.id,
          'file', uf.file,
          'label', uf.label
        ))
        FROM projects_uploaded_files puf
        JOIN uploaded_files uf ON puf.uploaded_file_id = uf.id
        WHERE puf.project_id = fp.id
      ), '[]'::json) AS uploaded_files,

      COALESCE((
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
        WHERE pm.project_id = fp.id
      ), '[]'::json) AS add_more_infos,

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
          'user', json_build_object(
            'id', eu.id,
            'name', eu.name,
            'email', eu.email
          ),
          'forwarded_to', (
            SELECT json_build_object(
              'id', fuser.id,
              'label', fuser.name,
              'email', fuser.email
            )
            FROM users fuser
            WHERE fuser.id = e.forwarded_user_id
          ),
          'uploaded_files', COALESCE((
            SELECT json_agg(json_build_object(
              'id', uf.id,
              'label', uf.label,
              'file', uf.file
            ))
            FROM estimation_uploaded_files euf
            JOIN uploaded_files uf ON euf.uploaded_file_id = uf.id
            WHERE euf.estimation_id = e.id
          ), '[]'::json)
        )
        FROM estimations e
        JOIN users eu ON e.user_id = eu.id
        WHERE e.project_id = fp.id
        LIMIT 1
      ) AS estimation,

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
        WHERE pr.project_id = fp.id
        ORDER BY pr.created_at DESC
        LIMIT 1
      ) AS project_rejection,

      (
        SELECT COALESCE(json_agg(json_build_object(
          'id', uf.id,
          'label', uf.label,
          'file', uf.file
        )), '[]'::json)
        FROM project_delivery_files pdf
        JOIN uploaded_files uf ON pdf.uploaded_file_id = uf.id
        WHERE pdf.project_id = fp.id
      ) AS delivery_files

    FROM filtered_projects fp
    LEFT JOIN users u ON fp.user_id = u.id;
  `;

  const totalQuery = `
    SELECT COUNT(*) FROM projects
    WHERE
      LOWER(client_company) ILIKE $1 OR
      LOWER(contact_person) ILIKE $2 OR
      LOWER(project_id) ILIKE $3 OR
      LOWER(name) ILIKE $4 OR
      LOWER(client_name) ILIKE $5
  `;

  const [result, totalResult] = await Promise.all([
    pool.query(queryText, values),
    pool.query(totalQuery, values.slice(0, 5)),
  ]);

  const totalPages = Math.ceil(Number(totalResult.rows[0].count) / size);

  return {
    total_pages: totalPages,
    projects: result.rows,
  };
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

export async function createProjectRejectionUploadedFiles(
  rejectionId,
  uploadedFileIds
) {
  if (!Array.isArray(uploadedFileIds) || uploadedFileIds.length === 0) {
    throw new Error("uploadedFileIds must be a non-empty array");
  }

  const query = `
    INSERT INTO project_rejection_uploaded_files (project_rejection_id, uploaded_file_id)
    VALUES ($1, $2)
    RETURNING *;
  `;

  const promises = uploadedFileIds.map(async (uploadedFileId) => {
    const values = [rejectionId, uploadedFileId];
    const result = await pool.query(query, values);
    return result.rows[0];
  });

  return Promise.all(promises);
}
export async function createProjectRejection({
  projectId,
  reason,
  uploaded_files_ids,
  userId,
}) {
  const query = `
    INSERT INTO project_rejections (project_id, note, user_id)
    VALUES ($1, $2, $3)
    RETURNING id;
  `;

  const values = [projectId, reason, userId];
  const result = await pool.query(query, values);
  const rejectionId = result.rows[0].id;

  if (uploaded_files_ids && uploaded_files_ids.length > 0) {
    await createProjectRejectionUploadedFiles(rejectionId, uploaded_files_ids);
  }
  await updateProjectPartial(projectId, {
    estimation_status: "rejected",
  });
  return rejectionId;
}
export async function projectRejectionById(rejectionId) {
  const query = `
    SELECT 
      pr.id,
      pr.created_at,
      pr.updated_at,
      pr.project_id,
      pr.user_id,
      pr.note,
      json_build_object(
        'id', u.id,
        'name', u.name
      ) AS user,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', uf.id,
              'file', uf.file,
              'label', uf.label
            )
          )
          FROM project_rejection_uploaded_files pruf
          JOIN uploaded_files uf ON pruf.uploaded_file_id = uf.id
          WHERE pruf.project_rejection_id = pr.id
        ), '[]'::json
      ) AS uploaded_files
    FROM project_rejections pr
    JOIN users u ON pr.user_id = u.id
    WHERE pr.id = $1
    LIMIT 1;
  `;
  const result = await pool.query(query, [rejectionId]);
  console.log([rejectionId], result.rows[0]);
  return result.rows[0] || null;
}

export async function addProjectDeliveryFiles(projectId, fileIds) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert delivery file records
    const insertValues = fileIds
      .map((fileId) => `(${projectId}, ${fileId})`)
      .join(",");
    await client.query(`
      INSERT INTO project_delivery_files (project_id, uploaded_file_id)
      VALUES ${insertValues}
    `);

    // Get uploaded file details
    const { rows } = await client.query(
      `SELECT id, label, file FROM uploaded_files WHERE id = ANY($1::int[])`,
      [fileIds]
    );

    await client.query("COMMIT");
    return rows;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

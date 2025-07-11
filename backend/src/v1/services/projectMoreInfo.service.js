import pool from "../config/db.js";
export async function createProjectMoreInfo({
  project_id,
  notes,
  enquiry,
  uploaded_file_ids = [],
}) {
  const result = await pool.query(
    `INSERT INTO project_more_info (project_id, notes, enquiry)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [project_id, notes, enquiry]
  );

  const inserted = result.rows[0];
  const insertedId = inserted.id;

  // Validate uploaded_file_ids
  if (uploaded_file_ids.length > 0) {
    const { rows: existingFiles } = await pool.query(
      `SELECT id FROM uploaded_files WHERE id = ANY($1)`,
      [uploaded_file_ids]
    );

    if (existingFiles.length !== uploaded_file_ids.length) {
      throw new Error("One or more uploaded_file_ids do not exist");
    }

    const insertPromises = uploaded_file_ids.map((fileId) =>
      pool.query(
        `INSERT INTO project_more_info_uploaded_files (project_more_info_id, uploaded_file_id)
        VALUES ($1, $2)`,
        [insertedId, fileId]
      )
    );
    await Promise.all(insertPromises);
  }

  // Return the enriched inserted row with uploaded files
  const enriched = await pool.query(
    `
    SELECT 
      pm.id,
      pm.notes,
      pm.enquiry,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', uf.id,
              'file', uf.file,
              'label', uf.label
            )
          )
          FROM project_more_info_uploaded_files pmuf
          JOIN uploaded_files uf ON pmuf.uploaded_file_id = uf.id
          WHERE pmuf.project_more_info_id = pm.id
        ), '[]'::json
      ) AS uploaded_files
    FROM project_more_info pm
    WHERE pm.id = $1
    `,
    [insertedId]
  );

  return enriched.rows[0];
}


export async function getProjectMoreInfo(id) {
  const result = await pool.query(
    `SELECT * FROM project_more_info WHERE id = $1`,
    [id]
  );

  if (result.rowCount === 0) return null;

  const info = result.rows[0];

  const fileResult = await pool.query(
    `SELECT uf.* FROM uploaded_files uf
     JOIN project_more_info_uploaded_files pmf
     ON uf.id = pmf.uploaded_file_id
     WHERE pmf.project_more_info_id = $1`,
    [id]
  );

  info.uploaded_files = fileResult.rows;

  return info;
}


export async function updateProjectMoreInfo(id, data) {
  const allowedFields = ["notes", "enquiry"];
  const fields = [];
  const values = [];
  let index = 1;

  for (const key of allowedFields) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${index}`);
      values.push(data[key]);
      index++;
    }
  }

  let updateQuery = null;
  if (fields.length > 0) {
    updateQuery = `
      UPDATE project_more_info
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $${index}
      RETURNING *;
    `;
    values.push(id);
  }

  let updatedRow = null;
  if (updateQuery) {
    const result = await pool.query(updateQuery, values);
    updatedRow = result.rows[0];
  }

  if (data.uploaded_file_ids) {
    const { rows: existingFiles } = await pool.query(
      `SELECT id FROM uploaded_files WHERE id = ANY($1)`,
      [data.uploaded_file_ids]
    );

    if (existingFiles.length !== data.uploaded_file_ids.length) {
      throw new Error("One or more uploaded_file_ids do not exist");
    }

    await pool.query(
      `DELETE FROM project_more_info_uploaded_files WHERE project_more_info_id = $1`,
      [id]
    );

    const insertPromises = data.uploaded_file_ids.map((fileId) =>
      pool.query(
        `INSERT INTO project_more_info_uploaded_files (project_more_info_id, uploaded_file_id)
         VALUES ($1, $2)`,
        [id, fileId]
      )
    );
    await Promise.all(insertPromises);
  }

  return await getProjectMoreInfo(id);
}

import pool from "../config/db.js";

export async function getAttendanceList({
  page = 1,
  size = 10,
  search = "",
  date = null,
}) {
  const offset = (page - 1) * size;

  if (!date) {
    throw new Error("Date is required to fetch attendance list.");
  }

  // Separate params for count query (no date needed)
  const countParams = [];
  let whereClause = `WHERE u.is_deleted = FALSE`;

  if (search) {
    countParams.push(`%${search.toLowerCase()}%`);
    whereClause += ` AND LOWER(u.name) LIKE $${countParams.length}`;
  }

  // 1. Count total users matching condition (no date involved here)
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM users u ${whereClause}`,
    countParams
  );
  const total = parseInt(countResult.rows[0].count);
  const total_pages = Math.ceil(total / size);

  // 2. Now prepare params for attendance query (includes `date`)
  const queryParams = [date]; // $1 is date
  let queryWhereClause = `WHERE u.is_deleted = FALSE`;

  if (search) {
    queryParams.push(`%${search.toLowerCase()}%`);
    queryWhereClause += ` AND LOWER(u.name) LIKE $${queryParams.length}`;
  }

  // 3. Append pagination
  queryParams.push(size); // LIMIT
  queryParams.push(offset); // OFFSET

  const query = `
    SELECT 
      u.id AS id,
      u.name AS name,
      CASE
        WHEN a.id IS NULL THEN NULL
        ELSE json_build_object(
          'id', a.id,
          'status', a.status,
          'note', a.note,
          'date', a.date,
          'user_id', a.user_id,
        )
      END AS attendance
    FROM users u
    LEFT JOIN attendance a ON a.user_id = u.id AND a.date = $1
    ${queryWhereClause}
    ORDER BY u.name
    LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
  `;

  const { rows } = await pool.query(query, queryParams);

  return { total_pages, users: rows };
}


// Create new attendance
export async function createAttendance({ user_id, date, status, note }) {
const result = await pool.query(
  `INSERT INTO attendance (user_id, date, status, note)
    VALUES ($1, $2, $3, $4)
    RETURNING *`,
  [user_id, date, status, note]
);
return result.rows[0];
}

// Update attendance (partial)
export async function updateAttendance(id, updates) {
  const fields = [];
  const values = [];
  let index = 1;

  for (const key in updates) {
    fields.push(`${key} = $${index++}`);
    values.push(updates[key]);
  }

  if (!fields.length) return null;

  values.push(id); // for WHERE
  const query = `UPDATE attendance SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`;
  const result = await pool.query(query, values);
  return result.rows[0];
}

// Delete attendance
export async function deleteAttendance(id) {
  await pool.query(`DELETE FROM attendance WHERE id = $1`, [id]);
  return { success: true };
}


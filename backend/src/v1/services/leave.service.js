import pool from "../config/db.js";

export async function getLeaves({ page, size, search, filter }) {
  const offset = (page - 1) * size;
  const params = [];
  let condition = `WHERE u.is_deleted = FALSE`;

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    condition += ` AND LOWER(u.name) LIKE $${params.length}`;
  }

  if (filter === "on_leave") {
    condition += ` AND l.to_date > CURRENT_DATE`;
  } else if (filter === "not_on_leave") {
    condition += ` AND l.to_date < CURRENT_DATE`;
  }

  // Count total leaves matching condition
  const countQuery = `
    SELECT COUNT(*) FROM leaves l
    INNER JOIN users u ON u.id = l.user_id
    ${condition}
  `;
  const countRes = await pool.query(countQuery, params);
  const total = parseInt(countRes.rows[0].count);
  const total_pages = Math.ceil(total / size);

  // Main query: leave list with user JSON object
  const query = `
    SELECT 
      l.id,
      l.leave_type,
      l.from_date,
      l.to_date,
      l.reason,
      l.applied_at,
      json_build_object(
        'id', u.id,
        'name', u.name
      ) AS user
    FROM leaves l
    INNER JOIN users u ON u.id = l.user_id
    ${condition}
    ORDER BY l.from_date DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const values = [...params, size, offset];
  const { rows } = await pool.query(query, values);

  return {
    total_pages,
    leaves: rows,
  };
}


export async function createLeave(data) {
  const {
    user_id,
    leave_type,
    from_date,
    to_date,
    reason,
  } = data;
  const query = `
    INSERT INTO leaves (user_id, leave_type, from_date, to_date, reason)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [user_id, leave_type, from_date, to_date, reason];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

export async function updateLeave(id, data) {
  const fields = [];
  const values = [];
  let index = 1;

  for (const key in data) {
    fields.push(`${key} = $${index}`);
    values.push(data[key]);
    index++;
  }

  values.push(id);
  const query = `
    UPDATE leaves
    SET ${fields.join(", ")}
    WHERE id = $${index}
    RETURNING *
  `;
  const { rows } = await pool.query(query, values);
  return rows[0];
}

export async function deleteLeave(id) {
  await pool.query(`DELETE FROM leaves WHERE id = $1`, [id]);
}

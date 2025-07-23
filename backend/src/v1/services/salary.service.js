import pool from "../config/db.js";

export async function getSalaryList({
  search = "",
  page = 1,
  size = 10,
  date,
}) {
  if (!date) throw new Error("Date is required");

  const offset = (page - 1) * size;
  const month = new Date(date).toISOString().slice(0, 7); // 'YYYY-MM'

  const baseQuery = `
    FROM users u
    LEFT JOIN salary_records s 
      ON s.user_id = u.id AND s.salary_date = $1
    WHERE u.is_deleted = false
      AND (
        u.name ILIKE '%' || $2 || '%' OR
        CAST(u.id AS TEXT) ILIKE '%' || $2 || '%'
      )
  `;

  const countQuery = `SELECT COUNT(*) ${baseQuery};`;
  const dataQuery = `
    SELECT 
      u.id AS id,
      u.name AS name,
      u.base_salary as base_salary,
      CASE
        WHEN s.id IS NULL THEN NULL
      ELSE json_build_object( 
        'id', s.id,
        'base_salary', s.base_salary,
        'salary_date', s.salary_date,
        'bonus', s.bonus,
        'deduction', s.deduction,
        'net_salary', s.net_salary,
        'paid_on', s.paid_on
      ) END AS salary
    ${baseQuery}
    ORDER BY u.name 
    LIMIT $3 OFFSET $4;
  `;

  const countResult = await pool.query(countQuery, [month, search]);
  const totalCount = parseInt(countResult.rows[0].count);
  const totalPages = Math.ceil(totalCount / size);

  const dataResult = await pool.query(dataQuery, [month, search, size, offset]);

  return {
    salaries: dataResult.rows,
    total_pages: totalPages,
  };
}
export async function createOrUpdateSalary({
  user_id,
  salary_date,
  base_salary,
  bonus = 0,
  deduction = 0,
  paid_on = null,
}) {
  const query = `
    INSERT INTO salary_records (user_id, salary_date, base_salary, bonus, deduction, paid_on)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id, salary_date)
    DO UPDATE SET base_salary = $3, bonus = $4, deduction = $5, paid_on = $6
    RETURNING *;
  `;
  const values = [user_id, salary_date, base_salary, bonus, deduction, paid_on];
  const result = await pool.query(query, values);
  return result.rows[0];
}

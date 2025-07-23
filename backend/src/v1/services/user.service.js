import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import { generatePassword } from "../utils/passwordGenerator.js";
import { uuidGenerator } from "../utils/uuidGenerator.js";
export async function createUser(
  email,
  phoneNumber,
  name,
  role,
  active = true,
  base_salary=0,
  client
) {
  const password = generatePassword(email, phoneNumber);
  const hashedPassword = await bcrypt.hash(password, 10);
  const uniqueId = uuidGenerator();

  const existingUser = await client.query(
    `SELECT id FROM users WHERE email = $1 AND is_deleted = true LIMIT 1`,
    [email]
  );

  if (existingUser.rows.length > 0) {
    const userId = existingUser.rows[0].id;

    const result = await client.query(
      `UPDATE users SET
        phoneNumber = $1,
        name = $2,
        role = $3,
        password = $4,
        active = $5,
        is_deleted = false,
        user_id = $6,
        base_salary = $8,
        updated_at = NOW()
      WHERE id = $7
      RETURNING id, email, phoneNumber, name, role, active`,
      [phoneNumber, name, role, hashedPassword, active, uniqueId, userId,base_salary]
    );

    return {
      user: result.rows[0],
      password,
    };
  }

  const userResult = await client.query(
    `INSERT INTO users (email, phoneNumber, name, role, password, active, user_id) 
    VALUES ($1, $2, $3, $4, $5, $6, $7,$8) 
    RETURNING id, email, phoneNumber, name, role, active,base_salary`,
    [
      email,
      phoneNumber,
      name,
      role,
      hashedPassword,
      active,
      uniqueId,
      base_salary,
    ]
  );

  return {
    user: userResult.rows[0],
    password,
  };
}

export async function updateUserActiveStatus(id, isActive) {
  const result = await pool.query(
    `UPDATE users SET active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, name, role, active`,
    [isActive, id]
  );

  if (result.rows.length === 0) {
    throw new Error("User not found");
  }

  return result.rows[0];
}

export async function updateUserData(
  id,
  { name, email, phoneNumber, active, role, is_deleted = false,base_salary=0 }
) {
  const result = await pool.query(
    `UPDATE users SET
      name = COALESCE($1, name),
      email = COALESCE($2, email),
      phoneNumber = COALESCE($3, phoneNumber),
      active = COALESCE($4, active),
      role = COALESCE($5, role),
      is_deleted = $6,
      base_salary = $8,
      updated_at = NOW()
    WHERE id = $7
    RETURNING id, email, phoneNumber, name, role, active, is_deleted,base_salary`,
    [name, email, phoneNumber, active, role, is_deleted, id, base_salary]
  );
  if (result.rows.length === 0) {
    throw new Error("User not found");
  }
  return result.rows[0];
}

export async function DeleteUser(id) {
  await pool.query(
    `
    UPDATE users SET is_deleted=true where id=$1
    `,
    [id]
  );
  return None;
}
export async function getAllUsers({ page = 1, size = 10, search = "" }) {
  const offset = (page - 1) * size;
  const params = [];

  let baseQuery = `
    SELECT id, email, name, role, phonenumber, active, base_salary, created_at
    FROM users
    WHERE is_deleted = false
  `;

  let countQuery = `SELECT COUNT(*) FROM users WHERE is_deleted = false`;

  if (search) {
    baseQuery += ` AND LOWER(name) LIKE $${params.length + 1}`;
    countQuery += ` AND LOWER(name) LIKE $${params.length + 1}`;
    params.push(`%${search.toLowerCase()}%`);
  }

  baseQuery += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${
    params.length + 2
  }`;
  params.push(size, offset);

  const usersResult = await pool.query(baseQuery, params);
  const countResult = await pool.query(
    countQuery,
    params.slice(0, search ? 1 : 0)
  ); // only pass search param if it exists

  const total = parseInt(countResult.rows[0].count);
  const totalPages = Math.ceil(total / size);

  return {
    users: usersResult.rows,
    total_pages: totalPages,
  };
}


export async function getUsersByRole(role) {
  const result = await pool.query(
    `SELECT id, email, name, role, phonenumber, active, created_at FROM users WHERE role = $1 AND is_deleted = false ORDER BY created_at DESC`,
    [role]
  );
  return result.rows;
}

import pool from "../config/db.js";

export async function createTeam({
  title,
  description = "",
  active = true,
  role = "",
  users = [],
  leader_id,
}) {
  const result = await pool.query(
    `INSERT INTO teams (title, description, active, role, users, leader_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [title, description, active, role, JSON.stringify(users), leader_id]
  );
  const row = result.rows[0];
  const parsedUsers =
    typeof row.users === "string" ? JSON.parse(row.users) : row.users || [];

  const userIds = Array.isArray(parsedUsers) ? parsedUsers.map(Number) : [];
  const leader = userIds.length
    ? await pool.query(`SELECT name, id FROM users WHERE id = $1`, [
        row.leader_id,
      ])
    : { rows: [] };
  const userResult = userIds.length
    ? await pool.query(`SELECT name, id FROM users WHERE id = ANY($1::int[])`, [
        userIds,
      ])
    : { rows: [] };

  return {
    ...row,
    leader: leader.rows[0] || null,
    users: userResult.rows,
  };
}

export async function getAllTeams() {
  const result = await pool.query(
    `SELECT * FROM teams where is_deleted = false ORDER BY created_at DESC`
  );

  return await Promise.all(
    result.rows.map(async (row) => {
      console.log(typeof row.users);
      const parsedUsers =
        typeof row.users === "string" ? JSON.parse(row.users) : row.users || [];

      const userIds = Array.isArray(parsedUsers) ? parsedUsers.map(Number) : [];

      const leader = userIds.length
        ? await pool.query(`SELECT name, id FROM users WHERE id = $1`, [
            row.leader_id,
          ])
        : { rows: [] };
      const userResult = userIds.length
        ? await pool.query(
            `SELECT name, id FROM users WHERE id = ANY($1::int[])`,
            [userIds]
          )
        : { rows: [] };

      return {
        ...row,
        leader: leader.rows[0] || null,
        users: userResult.rows,
      };
    })
  );
}
export async function updateTeamActiveStatus(id, isActive) {
  const result = await pool.query(
    `UPDATE teams SET active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, title, users, active`,
    [isActive, id]
  );

  if (result.rows.length === 0) {
    throw new Error("Team not found");
  }

  return result.rows[0];
}

export async function updateTeamData(
  id,
  { title, users, active,role, is_deleted = false }
) {
  const result = await pool.query(
    `UPDATE teams SET
      title = COALESCE($1, title),
      active = COALESCE($2, active),
      users = COALESCE($3, users),
      role = COALESCE($4, role),
      is_deleted = $5,
      updated_at = NOW()
    WHERE id = $6
    RETURNING id, users, title, active, role, is_deleted, leader_id`,
    [title, active, users, role, is_deleted, id]
  );
  if (result.rows.length === 0) {
    throw new Error("Team not found");
  }

  const row = result.rows[0];
  const parsedUsers =
    typeof row.users === "string" ? JSON.parse(row.users) : row.users || [];

  const userIds = Array.isArray(parsedUsers) ? parsedUsers.map(Number) : [];
  const userResult = userIds.length
    ? await pool.query(`SELECT name, id FROM users WHERE id = ANY($1::int[])`, [
        userIds,
      ])
    : { rows: [] };
  console.log(row.leader_id);
  const leader = userIds.length
    ? await pool.query(`SELECT name, id FROM users WHERE id = $1`, [
        row.leader_id,
      ])
    : { rows: [] };
  return {
    ...row,
    users: userResult.rows,
    leader: leader.rows[0] || null,
  };
}

export async function getTeamsByRole(role) {
  const result = await pool.query(
    `SELECT * FROM teams WHERE role = $1 AND is_deleted = false ORDER BY created_at DESC`,
    [role]
  );

  return await Promise.all(
    result.rows.map(async (row) => {
      const parsedUsers =
        typeof row.users === "string" ? JSON.parse(row.users) : row.users || [];

      const userIds = Array.isArray(parsedUsers) ? parsedUsers.map(Number) : [];
      const leader = userIds.length
        ? await pool.query(`SELECT name, id FROM users WHERE id = $1`, [
            row.leader_id,
          ])
        : { rows: [] };
      const userResult = userIds.length
        ? await pool.query(
            `SELECT name, id FROM users WHERE id = ANY($1::int[])`,
            [userIds]
          )
        : { rows: [] };

      return {
        ...row,
        leader: leader.rows[0] || null,
        users: userResult.rows,
      };
    })
  );
}   
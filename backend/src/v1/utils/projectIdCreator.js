import pool from "../config/db.js";

export const generateProjectId = async () => {
  const prefix = "PRJ";
  const yearSuffix = new Date().getFullYear().toString().slice(-2); // "24"

  const latestQuery = `
    SELECT project_id 
    FROM projects 
    WHERE project_id LIKE '${prefix}-%-${yearSuffix}' 
    ORDER BY created_at DESC 
    LIMIT 1;
  `;

  const result = await pool.query(latestQuery);
  let nextNumber = 1;
  console.log(result.rows[0]);
  if (result.rows.length > 0) {
    const latestId = result.rows[0].project_id; // e.g. "PRJ-012-24"
    const numberPart = latestId.split("-")[1]; // "012"
    const parsed = parseInt(numberPart, 10);
    if (!isNaN(parsed)) {
      nextNumber = parsed + 1;
    }
  }

  const formattedNumber = String(nextNumber).padStart(3, "0");
  const createdProjectId = `${prefix}-${formattedNumber}-${yearSuffix}`;
  console.log(createdProjectId);
  return createdProjectId;
};

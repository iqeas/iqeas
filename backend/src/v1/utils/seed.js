import pool from "../config/db.js";
import { createUser } from "../services/user.service.js";


async function createInitialAdmin() {
  const client = await pool.connect();

  try {
    const result = await client.query(
      "SELECT id FROM users WHERE role = 'admin' AND is_deleted = false LIMIT 1"
    );

    if (result.rows.length > 0) {
      console.log("✅ Admin already exists, skipping seed.");
      return;
    }

    // create new admin
    const { user, password } = await createUser(
      "admin@iqeasoffshore.com", 
      "9999999999", 
      "Super Admin", 
      "admin", 
      true, 
      0, 
      client
    );

    console.log("✅ Admin created:", user);
    console.log("🔑 Initial password:", password);
  } catch (err) {
    console.error("❌ Error creating initial admin:", err);
  } finally {
    client.release();
  }
}

export default createInitialAdmin;

import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function loginUser({ email, password }) {
  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1 AND active = true",
    [email]
  );

  const user = result.rows[0];

  if (!user || !user.active) {
    throw new Error("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      phonenumber: user.phonenumber,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "720h" }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      phonenumber: user.phonenumber,
      role: user.role,
      active: user.active,
    },
  };
}

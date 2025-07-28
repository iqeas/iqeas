import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendForgotPasswordEmail from "../utils/mail.js";
import { createForgotPasswordToken } from "../utils/jwt.js";

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

export async function sentForgotMail(email) {
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND active = true",
      [email]
    );

    const user = result.rows[0];

    if (!user || !user.active) {
      return false;
    }

    const token = createForgotPasswordToken({ email });
    const resetUrl = `${process.env.FORGOT_PASSWORD_URL}?token=${token}`;
    console.log(resetUrl,token);
    const emailSent = await sendForgotPasswordEmail(email, resetUrl);
    if (!emailSent) {
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error generating token:", error);
    return false;
  }
}

export async function resetPassword(email, newPassword) {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      "UPDATE users SET password = $1 WHERE email = $2 AND active = true",
      [hashedPassword, email]
    );

    if (result.rowCount === 0) {
      throw new Error("Email not found or user is inactive");
    }

    return true;
  } catch (error) {
    console.error("Error resetting password:", error);
    throw new Error("Failed to reset password");
  }
}

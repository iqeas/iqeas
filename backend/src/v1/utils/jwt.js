import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const jwtSecret = process.env.JWT_SECRET;

export const generateJwtToken = (payload) => {
  return jwt.sign(payload, jwtSecret, { expiresIn: "720h" });
};

export const verifyJwtToken = (token) => {
  return jwt.verify(token, jwtSecret);
};

export const createForgotPasswordToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });
};
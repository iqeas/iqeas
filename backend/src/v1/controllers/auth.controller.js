import { loginUser, resetPassword } from "../services/auth.service.js";
import { verifyJwtToken } from "../utils/jwt.js";
import { formatResponse } from "../utils/response.js";
import { sentForgotMail } from "../services/auth.service.js";

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { token, user } = await loginUser({ email, password });

    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Login successful",
        data: {
          token,
          user,
        },
      })
    );
  } catch (error) {
    if (error.message === "Invalid credentials") {
      return res.status(400).json(
        formatResponse({
          statusCode: 400,
          detail: error.message,
        })
      );
    }

    console.log("Login error", error);
    return res.status(500).json(
      formatResponse({
        statusCode: 500,
        detail: "Server error",
      })
    );
  }
};

export const getCurrentUser = (req, res) => {
  if (!req.user) {
    return res.status(401).json(
      formatResponse({
        statusCode: 401,
        detail: "Unauthorized",
      })
    );
  }

  return res.status(200).json(
    formatResponse({
      statusCode: 200,
      detail: "User retrieved successfully",
      data: req.user,
    })
  );
};

export const forgotPasswordController = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json(
        formatResponse({
          statusCode: 400,
          detail: "Email is required",
        })
      );
    }
    const emailSent = await sentForgotMail(email);
    if (!emailSent) {
      return res.status(400).json(
        formatResponse({
          statusCode: 400,
          detail: "Failed to send reset email. Please check your email address",
        })
      );
    }
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Password reset email sent successfully",
      })
    );
  } catch (error) {
    console.error("Forgot password error", error);
    return res.status(500).json(
      formatResponse({
        statusCode: 500,
        detail: "Server error",
      })
    );
  }
};

export const resetPasswordController = async (req, res) => {
  const { newPassword, token } = req.body;

  try {
    if (!newPassword || !token) {
      return res.status(400).json(
        formatResponse({
          statusCode: 400,
          detail: "New password and token are required",
        })
      );
    }
    const decoded = verifyJwtToken(token);
    console.log(decoded);
    const email = decoded.email;
    await resetPassword(email, newPassword);
    return res.status(200).json(
      formatResponse({
        statusCode: 200,
        detail: "Password reset successfully",
      })
    );
  } catch (error) {
    console.error("Reset password error", error);
    return res.status(500).json(
      formatResponse({
        statusCode: 500,
        detail: error.message,
      })
    );
  }
};

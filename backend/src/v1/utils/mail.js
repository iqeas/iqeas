import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
export default async function sendForgotPasswordEmail(to_email, url) {
  try {
    const data = await resend.emails.send({
      from: process.env.RESEND_SENDER_EMAIL || "onboarding@resend.dev",
      to: [to_email],
      subject: "Reset your password",
      html: `
        <h3>Password Reset</h3>
        <p>Click the button below to reset your password:</p>
        <a href="${url}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none;">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    console.log("Email sent successfully:", data);
    return true;
  } catch (err) {
    console.error("Error sending email:", err);
    return false;
  }
}

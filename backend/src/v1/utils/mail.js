import nodemailer from "nodemailer";

export default async function sendForgotPasswordEmail(to_email, url) {
  console.log(`${to_email} - ${url}`)
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_ID,
      pass: process.env.MAIL_PASSWORD,
    },
    tls:{
      rejectUnauthorized:false
    }
  });
  console.log(process.env.MAIL_ID);
  console.log(process.env.MAIL_PASSWORD);
  const mailOptions = {
    from: {
      name: "IQEAS ERP SYSTEM",
      address: process.env.MAIL_ID,
    },
    to: to_email,
    subject: "Reset your password",
    html: `
      <h3>Password Reset</h3>
      <p>Click the button below to reset your password:</p>
      <a href="${url}" style="
        padding: 10px 20px;
        background: #007bff;
        color: white;
        text-decoration: none;
        display: inline-block;
        border-radius: 4px;
      ">Reset Password</a>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.response);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

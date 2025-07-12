import Mailjet from "node-mailjet";

const mailjet = Mailjet.apiConnect(
  process.env.MJ_APIKEY_PUBLIC,
  process.env.MJ_APIKEY_PRIVATE
);


export default async function sendForgotPasswordEmail(to_email, url) {
  try {
    console.log(url);
    return true;
    const request = await mailjetClient
      .post("send", { version: "v3.1" })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.MAILJET_SENDER_EMAIL,
              Name: "IQEAS ERP SYSTEM",
            },
            To: [
              {
                Email: to_email,
                Name: to_email,
              },
            ],
            Subject: "Reset your password",
            HTMLPart: `
            <h3>Password Reset</h3>
            <p>Click the button below to reset your password:</p>
            <a href="${url}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none;">Reset Password</a>
            <p>If you did not request this, please ignore this email.</p>
          `,
          },
        ],
      });

    console.log("Email sent successfully:", request.body);
    return true;
  } catch (err) {
    console.error("Error sending email:", err.statusCode, err.message);
    return false;
  }
}


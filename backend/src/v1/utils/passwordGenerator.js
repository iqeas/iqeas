import crypto from "crypto";

export const generatePassword = (email, phone) => {
  const unique = crypto.randomBytes(4).toString("hex");

  const emailPart = email.slice(0, 3).toLowerCase();
  const phonenumberPart = phone.toString().slice(-3);

  const password = `${emailPart}${unique}${phonenumberPart}`;
  return password;
};

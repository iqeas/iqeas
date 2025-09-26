import crypto from "crypto";

export const uuidGenerator = () => {
  const uuid = crypto.randomUUID();
  console.log(uuid);
  return uuid;
};

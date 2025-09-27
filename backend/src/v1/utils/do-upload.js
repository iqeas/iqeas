import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "./do-space-config.js";
import { v4 as uuidv4 } from "uuid";
import mime from "mime-types";
import pool from "../config/db.js";
import { deleteFile, uploadFile } from "../lib/s3.js";
import fs from "fs/promises";

// Helper to get folder based on role
function getFolderByRole(role) {
  switch (role) {
    case "rfq":
      return "rfq-folder";
    case "pm":
      return "pm-folder";
    case "estimation":
      return "estimation-folder";
    case "document":
      return "document-folder";
    default:
      return "others";
  }
}
export async function uploadFileToDO(file, label, role) {
  const buffer = await fs.readFile(file.path);
  const extension = mime.extension(file.mimetype) || "bin";
  const filename = `${label}.${extension}`;
  console.log("role",role)
  const folder = getFolderByRole(role);
  const url = await uploadFile(buffer, label,filename, folder);
  return url.url;
} 

export async function deleteFileFromDO(file) {
  const url = file.file;
  await deleteFile(url);
}

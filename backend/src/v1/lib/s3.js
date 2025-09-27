import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import mime from "mime-types";
import path from "path";

// Config
const SPACE = process.env.DO_SPACE_NAME; // e.g. "my-space"
const REGION = process.env.DO_REGION; // e.g. "nyc3"
const ENDPOINT = process.env.DO_ENDPOINT; // e.g. "nyc3.digitaloceanspaces.com"
const ACCESS_KEY = process.env.DO_KEY;
const SECRET_KEY = process.env.DO_SECRET;
const PUBLIC = (process.env.SPACES_PUBLIC || "true") === "true";

// S3 client for DigitalOcean Spaces
const s3 = new S3Client({
  region: REGION,
  endpoint: `https://${ENDPOINT}`,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
});

function buildPublicUrl(key) {
  return `https://${SPACE}.${ENDPOINT}/${encodeURIComponent(key).replace(
    /%2F/g,
    "/"
  )}`;
}

/**
 * Upload a file buffer to Spaces
 * @param {Buffer} fileBuffer - file data
 * @param {string} fileName - original file name
 * @param {string} folder - optional folder path
 * @returns {Promise<{ key: string, url: string }>}
 */
export async function uploadFile(fileBuffer, fileName, folder = "") {
  const timestamp = Date.now();
  const cleanFolder = folder.replace(/^\/|\/$/g, ""); 
  const extension = path.extname(fileName) || "";
  const baseName = path.basename(fileName, extension);
  const key =
    (cleanFolder ? `${cleanFolder}/` : "") +
    `${timestamp}_${baseName}${extension}`;
  console.log(timestamp,cleanFolder,extension,baseName,key)
  const contentType = mime.lookup(extension) || "application/octet-stream";

  const putParams = {
    Bucket: SPACE,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
    ACL: "public-read", // force public access
  };

  await s3.send(new PutObjectCommand(putParams));
  console.log({ key, url: buildPublicUrl(key) },folder,fileName);
  return { key, url: buildPublicUrl(key) };
}


/**
 * Delete a file by key or public URL
 * @param {string} fileKeyOrUrl
 * @returns {Promise<{ ok: boolean, key: string }>}
 */
export async function deleteFile(fileKeyOrUrl) {
  let key;
  if (/^https?:\/\//i.test(fileKeyOrUrl)) {
    // If URL, extract path
    const urlObj = new URL(fileKeyOrUrl);
    key = decodeURIComponent(urlObj.pathname.replace(/^\//, ""));
  } else {
    key = fileKeyOrUrl;
  }

  const delParams = { Bucket: SPACE, Key: key };
  await s3.send(new DeleteObjectCommand(delParams));

  return { ok: true, key };
}

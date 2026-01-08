import { S3Client } from "@aws-sdk/client-s3";
import { STSClient } from "@aws-sdk/client-sts";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

const {
  STORAGE_ENDPOINT, // internal (docker DNS) or unset for AWS
  STORAGE_EXTERNAL_ENDPOINT, // external hostname for presigned URLs (localhost for Postman)
  STORAGE_REGION,
  STORAGE_ACCESS_KEY,
  STORAGE_SECRET_KEY,
  STORAGE_FORCE_PATH_STYLE,
  STORAGE_STS_USER,
  STORAGE_STS_PASSWORD,
} = process.env;

const forcePathStyle = String(STORAGE_FORCE_PATH_STYLE).toLowerCase() === "true";

const s3Client = new S3Client({
  region: STORAGE_REGION,
  credentials: {
    accessKeyId: STORAGE_ACCESS_KEY,
    secretAccessKey: STORAGE_SECRET_KEY,
  },
  endpoint: STORAGE_ENDPOINT || undefined,
  forcePathStyle,
});

// External presign client: used ONLY to generate presigned URLs that Postman/browser can resolve
const s3PresignClient = new S3Client({
  region: STORAGE_REGION,
  credentials: {
    accessKeyId: STORAGE_ACCESS_KEY,
    secretAccessKey: STORAGE_SECRET_KEY,
  },
  endpoint: (STORAGE_EXTERNAL_ENDPOINT || STORAGE_ENDPOINT) || undefined,
  forcePathStyle,
});

const stsClient = new STSClient({
  region: STORAGE_REGION,
  credentials: {
    accessKeyId: STORAGE_STS_USER,
    secretAccessKey: STORAGE_STS_PASSWORD,
  },
  endpoint: STORAGE_ENDPOINT || undefined,
  forcePathStyle,
});

export { s3Client, s3PresignClient, stsClient };
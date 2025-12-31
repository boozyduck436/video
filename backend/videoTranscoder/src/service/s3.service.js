import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createWriteStream, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { pipeline } from "stream/promises";
import dotenv from "dotenv";
import { s3 } from "../config/s3.config.js";

dotenv.config();



const STORAGE_BUCKET = process.env.STORAGE_BUCKET;

export async function downloadFromS3(s3Key, localPath) {
  if (!STORAGE_BUCKET) {
    console.error("Error: STORAGE_BUCKET is not set in .env");
    process.exit(1);
  }

  console.log(`Downloading ${s3Key} from S3 bucket ${STORAGE_BUCKET}...`);
  const command = new GetObjectCommand({ Bucket: STORAGE_BUCKET, Key: s3Key });
  const response = await s3.send(command);
  await pipeline(response.Body, createWriteStream(localPath));
  console.log("Download complete.");
}

export async function uploadDirectoryToS3(localDir, s3Prefix) {
  const files = readdirSync(localDir);
  for (const file of files) {
    const filePath = join(localDir, file);
    const key = join(s3Prefix, file).replace(/\\/g, "/"); // Fix Windows path issue
    console.log(`Uploading ${file} to S3 as ${key}...`);
    const fileContent = readFileSync(filePath);
    await s3.send(new PutObjectCommand({ Bucket: STORAGE_BUCKET, Key: key, Body: fileContent }));
  }
  console.log("All files uploaded to S3.");
}

//await downloadFromS3("private/users/693981e6e2c24e15cff00e15/69398df1cd1251e7a5c7eade/tempVideo.mp4","./temp/input.mp4")
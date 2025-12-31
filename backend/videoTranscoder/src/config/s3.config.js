import { S3Client } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
dotenv.config({ path: '.env' })

// AWS S3 or minIO
const {
    STORAGE_ENDPOINT,
    STORAGE_REGION,
    STORAGE_ACCESS_KEY,
    STORAGE_SECRET_KEY,
    STORAGE_FORCE_PATH_STYLE,
  } = process.env;

  console.log(STORAGE_ENDPOINT)
  
  export const s3 = new S3Client({
    region: STORAGE_REGION,
    credentials: {
      accessKeyId: STORAGE_ACCESS_KEY,
      secretAccessKey: STORAGE_SECRET_KEY,
    },
    requestTimeout: 360000,
    endpoint: STORAGE_ENDPOINT || undefined,
    forcePathStyle: STORAGE_FORCE_PATH_STYLE,
  });




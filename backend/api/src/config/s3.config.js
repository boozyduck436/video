import { S3Client } from "@aws-sdk/client-s3";
import { STSClient} from "@aws-sdk/client-sts";
import dotenv from 'dotenv';
dotenv.config({ path: './.env' })

// AWS S3 or minIO
const {
    STORAGE_ENDPOINT,
    STORAGE_REGION,
    STORAGE_ACCESS_KEY,
    STORAGE_SECRET_KEY,
    STORAGE_FORCE_PATH_STYLE,
    STORAGE_STS_USER,
    STORAGE_STS_PASSWORD
  } = process.env;
  
  const s3Client = new S3Client({
    region: STORAGE_REGION,
    credentials: {
      accessKeyId: STORAGE_ACCESS_KEY,
      secretAccessKey: STORAGE_SECRET_KEY,
    },
    endpoint: STORAGE_ENDPOINT || undefined,
    forcePathStyle: STORAGE_FORCE_PATH_STYLE
  });

  

  const stsClient = new STSClient({
    region: STORAGE_REGION,
    credentials: {
      accessKeyId: STORAGE_STS_USER,
      secretAccessKey: STORAGE_STS_PASSWORD
    },
    endpoint: STORAGE_ENDPOINT || undefined,
    forcePathStyle: String(STORAGE_FORCE_PATH_STYLE).toLowerCase(),
    });
  
  export  {s3Client,stsClient};






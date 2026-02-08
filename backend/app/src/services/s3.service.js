import {s3Client,s3PresignClient,stsClient} from '../config/s3.config.js';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import { ApiError } from '../utils/ApiError.js';
import { AssumeRoleCommand } from '@aws-sdk/client-sts';


const uploadObjectOnS3= async function (file,Key) {// uploding local file to s3 without using presigned url
  try {
      const fileBuffer = fs.readFileSync(file.path);
      
      const command = new PutObjectCommand({
        Bucket: process.env.STORAGE_BUCKET,
        Key: Key,
        ContentType: file.mimetype,
        Body: fileBuffer,
      });
    
      await s3Client.send(command);
      return {
        Key,
        url: `${process.env.STORAGE_EXTERNAL_ENDPOINT}/${process.env.STORAGE_BUCKET}/${Key}`|| null,
      };
  } catch (error) {
    throw new ApiError(500,`uploadOnS3 error: ${error}`)
  }
}


const generatePresignedDownloadUrl= async function (Key,time="300") {
  try {
      const command= new GetObjectCommand({
        Bucket: process.env.STORAGE_BUCKET,
        Key: Key,
      })
      let url= await getSignedUrl(s3PresignClient,command,{expiresIn: time})

      return url
  } catch (error) {

    throw new ApiError(500,`downloadOnS3 error: ${error}`)

  }

}

const generatePresignedUploadUrl= async function(ContentType,ContentLength,ChecksumSHA256,Key, time="300"){
  try {
    console.log("Content-Type being signed:", ContentType);
        const command = new PutObjectCommand({
            Bucket: process.env.STORAGE_BUCKET,
            Key: Key,
            ContentType: ContentType,
            ContentLength: ContentLength,
            ChecksumSHA256: ChecksumSHA256, // use Base64
            ChecksumAlgorithm: "SHA256",
          });
        
        let uploadUrl= await getSignedUrl(s3PresignClient,command,{
            expiresIn: time,
            signableHeaders: new Set(["content-type", "content-length", "host"])
          })


        return uploadUrl
        
  } catch (error) {
    throw new ApiError(500,`PresignedUploadUrl of S3 error: ${error}`)
    
  }
        
}

const deleteObjectOnS3= async function(Key){
  try {
      const command= new DeleteObjectCommand({
          Bucket: process.env.STORAGE_BUCKET,
          Key: Key
      });
      const del=await s3Client.send(command)
      return del
  } catch (error) {
    throw new ApiError(500,`deleteOnS3 error: ${error}`)
  }
}

const listObjectsByPrefixOnS3= async function(Prefix){
  try {

    const list= await s3Client.send(new ListObjectsV2Command({
      Bucket: process.env.STORAGE_BUCKET,
      Prefix: Prefix
    }))

    if (list.KeyCount==0) {
      console.log("No objects found.");

    }
    
    return list

    
  } catch (error) {
    throw new ApiError(500,`listing by prefix on s3 error: ${error}`)
    
  }
}

const deleteByPrefixOnS3= async function(Prefix){
  try {
      const list=await listObjectsByPrefixOnS3(Prefix)
      if(list.KeyCount>0){
        const objectsToDelete= list.Contents.map(x=>({ Key :x.Key}))
    
        const del= await s3Client.send(new DeleteObjectsCommand({
            Bucket:process.env.STORAGE_BUCKET,
            Delete: {Objects: objectsToDelete}
          }
    
        ))
        return del
    
      }else{
        return null
      }
  } catch (error) {
    throw new ApiError(500,`deleting by prefix error: ${error}`)
    
  }

  
  


}

const stsOnS3= async function () {
try {
    const command = new AssumeRoleCommand({
     RoleArn: "arn:aws:iam::123456789012:role/test", // any string for MinIO
     RoleSessionName: "minio-session",
     DurationSeconds: 900 // min 900 sec

    });

    const res = await stsClient.send(command);

    const endpoint = process.env.STORAGE_EXTERNAL_ENDPOINT || process.env.STORAGE_ENDPOINT || null;
    const forcePathStyle = String(process.env.STORAGE_FORCE_PATH_STYLE).toLowerCase() === "true";

    return {
      credentials: res.Credentials,
      endpoint,
      region: process.env.STORAGE_REGION || null,
      forcePathStyle,
      bucket: process.env.STORAGE_BUCKET || null,
    };

} catch (error) {
  throw new ApiError(`sts error: ${error}`)
  
}
  
}



export {
  uploadObjectOnS3,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  deleteObjectOnS3,
  deleteByPrefixOnS3,
  listObjectsByPrefixOnS3,
  stsOnS3
}

const STORAGE_BUCKET=process.env.STORAGE_BUCKET

export function removeBucketName(s3Key){
  const replaceString=STORAGE_BUCKET+"/"
  const newKey = s3Key.replace(replaceString, "");
  return newKey
}
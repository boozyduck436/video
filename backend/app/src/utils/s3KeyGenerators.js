import dotenv from 'dotenv';
import { getExtensionFromMime } from './mime.js';
dotenv.config({ path: './.env' })



function generateUserProfileImageKey(userId,mimeType) {
  const fileExtension= getExtensionFromMime(mimeType)
  return `users/${userId}/profile.${fileExtension}`;
}

function generateUserCoverImageKey(userId,mimeType) {
  const fileExtension= getExtensionFromMime(mimeType)
  return `users/${userId}/cover.${fileExtension}`;
}

function generateThumbnailKey(userId,videoId,mimeType) {
  const fileExtension= getExtensionFromMime(mimeType)
  return `users/${userId}/${videoId}/thumbnail.${fileExtension}`;
}

function generateTempVideoKey(userId,videoId,mimeType) {
  const fileExtension= getExtensionFromMime(mimeType)
  return `private/users/${userId}/${videoId}/tempVideo.${fileExtension}`;
}

function generateVideoKey(userId,videoId) {
  return `users/${userId}/${videoId}/`;
}

function generateUrl(Key){
  return `${process.env.STORAGE_ENDPOINT}/${process.env.STORAGE_BUCKET}/${Key}`
}
// testing
console.log(generateUserProfileImageKey("123","image/png"))

  export {
    generateUserProfileImageKey,
    generateUserCoverImageKey,
    generateThumbnailKey,
    generateTempVideoKey,
    generateVideoKey,
    generateUrl  
  }
import { ApiError } from './ApiError.js'

export const allowedMimeTypes = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
  'image/tiff',
  'image/heic',
  'image/heif',

  // Videos
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/x-matroska',
  'video/x-mkv',
  'video/quicktime',
  'video/x-msvideo',
  'video/mpeg',
  'video/3gpp',
  'video/3gpp2',
  'video/x-flv',
  'video/x-ms-wmv',
]

export const getExtensionFromMime = (mime) => {
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/svg+xml': 'svg',
    'image/tiff': 'tiff',
    'image/heic': 'heic',
    'image/heif': 'heif',

    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
    'video/x-matroska': 'mkv',
    'video/x-mkv': 'mkv',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/mpeg': 'mpeg',
    'video/3gpp': '3gp',
    'video/3gpp2': '3g2',
    'video/x-flv': 'flv',
    'video/x-ms-wmv': 'wmv',
  }

  if (!allowedMimeTypes.includes(mime)) {
    throw new ApiError(400, `Unsupported MIME type: ${mime}`)
  }

  return map[mime]
}

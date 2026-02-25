import dotenv from 'dotenv'
import { extname } from 'path'
import { downloadFromS3, uploadDirectoryToS3 } from './service/s3.service.js'
import { processHLS } from './service/ffmpeg.service.js'
import { generateOutputPrefix } from './utils/generateOutputPrefix.utils.js'
import { checkDirectoriesExist } from './utils/checkDirectoriesExist.utils.js'
import { fetchOneRabbitmqMessage, sendRabbitmqAck } from './service/rabbitmq.service.js'
import { removeBucketName } from './utils/removeBucketName.js'
import { fileTypeFromFile } from 'file-type'

dotenv.config({ quiet: true })
;(async () => {
  try {
    console.log('Starting Video Worker')

    const RabbitMQ = await fetchOneRabbitmqMessage()
    const { msg, channel, connection, key } = RabbitMQ
    const S3_INPUT_KEY = removeBucketName(key)
    const S3_OUTPUT_PREFIX = generateOutputPrefix(S3_INPUT_KEY) // S3 prefix for upload

    if (!RabbitMQ) {
      console.error("Error: rabbitmq message didn't received")
      process.exit(1)
    }

    // Validation: Check if the file is .mp4 before proceeding
    const fileExtension = extname(S3_INPUT_KEY).toLowerCase()
    if (fileExtension !== '.mp4') {
      console.error('Error: Only MP4 files are supported. The provided file is not an MP4.')
      await sendRabbitmqAck(msg, channel, connection)
      process.exit(1)
    }

    // check if required directories is exist, if not then creating it
    checkDirectoriesExist()

    // Configuration
    const LOCAL_DOWNLOAD_PATH = './tmp/input/video.mp4' // Local path for download (without extension)
    const LOCAL_OUTPUT_PATH = './tmp/output' // Local output path

    // Download from S3 to local
    await downloadFromS3(S3_INPUT_KEY, LOCAL_DOWNLOAD_PATH)

    // Verifying Magic Bytes to ensure that virus can not process and only .mp4 get process via ffmpeg
    console.log('Verifying Magic Bytes')

    // Reads the binary signature of the downloaded file
    const fileType = await fileTypeFromFile(LOCAL_DOWNLOAD_PATH)

    // check if file is video/mp4
    if (!fileType || fileType.mime !== 'video/mp4') {
      console.error('Security Alert: File Signature Mismatch')
      console.error(`Expected: video/mp4, Detected: ${fileType?.mime || 'Unknown'}`)

      //send Rabbitmq Ack so virus or fake .mp4 did not reprocess
      await sendRabbitmqAck(msg, channel, connection)

      process.exit(1)
    }

    // Process the video into HLS format
    console.log('Starting Transcoding')
    await processHLS(LOCAL_DOWNLOAD_PATH, LOCAL_OUTPUT_PATH)

    // Upload the output to S3
    console.log('Starting upload Directory')
    await uploadDirectoryToS3(LOCAL_OUTPUT_PATH, S3_OUTPUT_PREFIX)

    // send ack to rabbitmq
    console.log('Sending Rabbitmq Ack')
    await sendRabbitmqAck(msg, channel, connection)

    //proper exit
    console.log('Job Completed Successfully')
    process.exit(0)
  } catch (err) {
    console.error('System Error:', err)
    process.exit(1)
  }
})()

import dotenv from "dotenv";
import { extname } from "path";
import { downloadFromS3, uploadDirectoryToS3 } from "./service/s3.service.js";
import { processHLS } from "./service/ffmpeg.service.js"; 
import { generateOutputPrefix } from "./utils/generateOutputPrefix.utils.js";
import { checkDirectoriesExist } from "./utils/checkDirectoriesExist.utils.js";
import { fetchOneRabbitmqMessage, sendRabbitmqAck } from "./service/rabbitmq.service.js";
import { removeBucketName } from "./utils/removeBucketName.js";

dotenv.config();


(async () => {
  try {
    console.log("step 1")
    // Configuration
    const LOCAL_DOWNLOAD_PATH = "./tmp/input/video.mp4" ; // Local path for download (without extension)
    const LOCAL_OUTPUT_PATH = "./tmp/output" ; // Local output path


    const RabbitMQ=await fetchOneRabbitmqMessage()
    const {msg,channel,connection,key}=RabbitMQ
    const S3_INPUT_KEY=removeBucketName(key)
    const S3_OUTPUT_PREFIX = generateOutputPrefix(S3_INPUT_KEY) ; // S3 prefix for upload
    console.log("step 2")
    if(!RabbitMQ){
      console.error("Error: rabbitmq message didn't received")
      process.exit(1);
    }
  
    // Validation: Check if the file is .mp4 before proceeding
    const fileExtension = extname(S3_INPUT_KEY).toLowerCase();
    if (fileExtension !== '.mp4') {
      console.error("Error: Only MP4 files are supported. The provided file is not an MP4.");
      process.exit(1);
    }



    // check if required directories is exist, if not then creating it
    checkDirectoriesExist()

    // Download from S3 to local
    await downloadFromS3(S3_INPUT_KEY, LOCAL_DOWNLOAD_PATH);

    // Process the video into HLS format
    await processHLS(LOCAL_DOWNLOAD_PATH , LOCAL_OUTPUT_PATH);

    // Upload the output to S3
    await uploadDirectoryToS3(LOCAL_OUTPUT_PATH, S3_OUTPUT_PREFIX);

    // send ack to rabbitmq
    await sendRabbitmqAck(msg, channel, connection)
    
    //proper exit
    process.exit(0); 

  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();

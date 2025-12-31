import { spawn } from "child_process";
import { writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "fs";
import { basename, join } from "path";

const RESOLUTIONS = ["360", "480", "720", "1080"];
const WIDTHS = ["640", "854", "1280", "1920"];
const HEIGHTS = ["360", "480", "720", "1080"];
const VID_BITRATES = ["800k", "1400k", "2800k", "5000k"];
const AUDIO_BITRATE = "128k";

// Helper function to run FFmpeg
function runFFmpeg(cmd, args) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(cmd, args, { stdio: "inherit" }); // no shell: true

    ffmpeg.on("error", (err) => reject(err));
    ffmpeg.on("close", (code) => {
      if (code !== 0) reject(new Error(`FFmpeg exited with code ${code}`));
      else resolve();
    });
  });
}

// HLS Processing Logic
async function processHLS(INPUT, OUTPUT_PATH) {
  const BASENAME = basename(INPUT, ".mp4");

  if (!existsSync(OUTPUT_PATH)) mkdirSync(OUTPUT_PATH, { recursive: true });

  // Cleanup old files
  console.log("Removing old HLS files...");
  const files = readdirSync(OUTPUT_PATH);
  files.forEach((file) => {
    if (file.match(new RegExp(`(_${BASENAME}\\.m3u8|_${BASENAME}_.*\\.ts|master_${BASENAME}\\.m3u8)`))) {
      rmSync(join(OUTPUT_PATH, file));
    }
  });

  // Build FFmpeg filter_complex
  console.log("Building FFmpeg command...");
  let filterComplex = "";
  for (let i = 0; i < RESOLUTIONS.length; i++) {
    filterComplex += `[0:v]scale='trunc(iw*min(${WIDTHS[i]}/iw\\,${HEIGHTS[i]}/ih)/2)*2':'trunc(ih*min(${WIDTHS[i]}/iw\\,${HEIGHTS[i]}/ih)/2)*2'[v${i}];`;
  }

  // Build FFmpeg arguments
  const args = ["-i", INPUT, "-filter_complex", filterComplex];

  for (let i = 0; i < RESOLUTIONS.length; i++) {
    args.push("-map", `[v${i}]`);
    args.push("-c:v:" + i, "libx264");
    args.push("-b:v:" + i, VID_BITRATES[i]);
    args.push("-c:a:" + i, "aac");
    args.push("-b:a:" + i, AUDIO_BITRATE);

    const res = `${RESOLUTIONS[i]}p`;
    args.push("-f", "hls");
    args.push("-hls_time", "10");
    args.push("-hls_list_size", "0");
    args.push("-hls_segment_filename", `${OUTPUT_PATH}/${res}-${BASENAME}_%03d.ts`);
    args.push(`${OUTPUT_PATH}/${res}-${BASENAME}.m3u8`);
  }

  console.log("Running FFmpeg...");
  await runFFmpeg("ffmpeg", args);

  // Create master playlist
  console.log("Creating master playlist...");
  let master = "#EXTM3U\n";
  for (let i = 0; i < RESOLUTIONS.length; i++) {
    const res = `${RESOLUTIONS[i]}p`;
    const width = WIDTHS[i];
    const height = HEIGHTS[i];
    const bandwidth = parseInt(VID_BITRATES[i]) * 1000;
    master += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${width}x${height}\n`;
    master += `${res}-${BASENAME}.m3u8\n`;
  }

  writeFileSync(join(OUTPUT_PATH, `master_${BASENAME}.m3u8`), master);

  console.log("HLS streams generated successfully!");
  console.log(`Master playlist: ${OUTPUT_PATH}/master_${BASENAME}.m3u8`);
}

export { processHLS };

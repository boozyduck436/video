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
    // Log command for debugging
    //console.log(`Running: ${cmd} ${args.join(' ')}`);
    
    const ffmpeg = spawn(cmd, args, { stdio: "inherit" });

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
  try {
    const files = readdirSync(OUTPUT_PATH);
    files.forEach((file) => {
      if (file.match(new RegExp(`(_${BASENAME}\\.m3u8|_${BASENAME}_.*\\.ts|master_${BASENAME}\\.m3u8)`))) {
        rmSync(join(OUTPUT_PATH, file));
      }
    });
  } catch (e) {
    // ignore
  }

  // Build FFmpeg filter_complex
  let filterComplex = "";
  for (let i = 0; i < RESOLUTIONS.length; i++) {
    filterComplex += `[0:v]scale='trunc(iw*min(${WIDTHS[i]}/iw\\,${HEIGHTS[i]}/ih)/2)*2':'trunc(ih*min(${WIDTHS[i]}/iw\\,${HEIGHTS[i]}/ih)/2)*2'[v${i}];`;
  }
  filterComplex = filterComplex.slice(0, -1); // Remove trailing semicolon

  const args = ["-y", "-i", INPUT, "-filter_complex", filterComplex];

  for (let i = 0; i < RESOLUTIONS.length; i++) {
    // MAP STREAMS
    args.push("-map", `[v${i}]`);
    
    // CRITICAL FIX: Add '?' to make audio optional
    // If input has no audio, this won't crash the script
    args.push("-map", "0:a?"); 

    // VIDEO SETTINGS
    args.push("-c:v", "libx264");
    args.push("-b:v", VID_BITRATES[i]);
    args.push("-preset", "veryfast"); // Speed up encoding

    // AUDIO SETTINGS
    args.push("-c:a", "aac");
    args.push("-b:a", AUDIO_BITRATE);

    // HLS FLAGS
    const res = `${RESOLUTIONS[i]}p`;
    args.push("-f", "hls");
    args.push("-hls_time", "5");
    args.push("-hls_list_size", "0");
    args.push("-hls_segment_filename", join(OUTPUT_PATH, `${res}-${BASENAME}_%03d.ts`));
    args.push(join(OUTPUT_PATH, `${res}-${BASENAME}.m3u8`));
  }

  console.log(`args:\n\n ${args}`)
  console.log("Running FFmpeg...");
  await runFFmpeg("ffmpeg", args);

  // Create master playlist
  console.log("Creating master playlist...");
  let master = "#EXTM3U\n";
  master += "#EXT-X-VERSION:3\n";
  
  for (let i = 0; i < RESOLUTIONS.length; i++) {
    const res = `${RESOLUTIONS[i]}p`;
    // Note: If no audio, bandwidth calc might be slightly off, but acceptable
    const bandwidth = parseInt(VID_BITRATES[i]) * 1000 + 128000; 
    master += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${WIDTHS[i]}x${HEIGHTS[i]}\n`;
    master += `${res}-${BASENAME}.m3u8\n`;
  }

  writeFileSync(join(OUTPUT_PATH, `master_${BASENAME}.m3u8`), master);
  console.log(`HLS Master Playlist: ${join(OUTPUT_PATH, `master_${BASENAME}.m3u8`)}`);
}

export { processHLS };
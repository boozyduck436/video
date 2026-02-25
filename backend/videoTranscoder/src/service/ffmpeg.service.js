import { spawn } from 'child_process'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { basename, join } from 'path'

const RESOLUTIONS = ['360', '480', '720', '1080']
const WIDTHS = ['640', '854', '1280', '1920']
const HEIGHTS = ['360', '480', '720', '1080']
const VIDEO_BITRATES = ['800k', '1400k', '2800k', '5000k']
const AUDIO_BITRATE = '128k'

// Helper function to run FFmpeg
function runFFmpeg(cmd, args) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(cmd, args, { stdio: 'inherit' })

    ffmpeg.on('error', (err) => reject(err))
    ffmpeg.on('close', (code) => {
      if (code !== 0) reject(new Error(`FFmpeg exited with code ${code}`))
      else resolve()
    })
  })
}

// HLS Processing Logic
async function processHLS(INPUT, OUTPUT_PATH) {
  console.time('HLS_Processing_Time')

  const BASENAME = basename(INPUT, '.mp4')

  if (!existsSync(OUTPUT_PATH)) mkdirSync(OUTPUT_PATH, { recursive: true })

  //####################################
  // FFmpeg Command Composition start
  //####################################

  // INPUT
  const cmd = 'ffmpeg'
  const args = ['-y', '-loglevel', 'error', '-i', INPUT]

  // Define FFmpeg filter_complex
  let filterComplex = ''
  for (let i = 0; i < RESOLUTIONS.length; i++) {
    filterComplex += `[0:v]scale='trunc(iw*min(${WIDTHS[i]}/iw\\,${HEIGHTS[i]}/ih)/2)*2':'trunc(ih*min(${WIDTHS[i]}/iw\\,${HEIGHTS[i]}/ih)/2)*2'[v${i}];`
  }
  filterComplex = filterComplex.slice(0, -1) // Remove trailing semicolon
  args.push('-filter_complex', filterComplex)

  // MAP, ENCODE, AND PACKAGING
  for (let i = 0; i < RESOLUTIONS.length; i++) {
    const res = `${RESOLUTIONS[i]}p`
    args.push(
      // MAP STREAMS
      '-map',
      `[v${i}]`,
      '-map',
      '0:a?', // Add ? to make audio optional

      // VIDEO SETTINGS
      '-c:v',
      'libx264',
      '-b:v',
      VIDEO_BITRATES[i],
      '-preset',
      'veryfast', // Speed up encoding

      // AUDIO SETTINGS
      '-c:a',
      'aac',
      '-b:a',
      AUDIO_BITRATE,

      // it forces exact 5sec segments
      '-force_key_frames',
      'expr:gte(t,n_forced*5)',
      '-sc_threshold',
      '0',

      // HLS FLAGS
      '-f',
      'hls',
      '-hls_time',
      '5',
      '-hls_list_size',
      '0',
      '-hls_segment_filename',
      join(OUTPUT_PATH, `${res}_${BASENAME}_%03d.ts`),
      join(OUTPUT_PATH, `${res}_${BASENAME}.m3u8`)
    )
  }
  //####################################
  // FFmpeg command composition ends
  //####################################

  console.log('Running FFmpeg')
  await runFFmpeg(cmd, args)

  // Create master playlist
  console.log('Creating master playlist')
  let master = '#EXTM3U\n'
  master += '#EXT-X-VERSION:3\n'

  for (let i = 0; i < RESOLUTIONS.length; i++) {
    const res = `${RESOLUTIONS[i]}p`
    const bandwidth = parseInt(VIDEO_BITRATES[i]) * 1000 + parseInt(AUDIO_BITRATE) * 1000
    master += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${WIDTHS[i]}x${HEIGHTS[i]}\n`
    master += `${res}_${BASENAME}.m3u8\n`
  }

  writeFileSync(join(OUTPUT_PATH, `master_${BASENAME}.m3u8`), master)

  console.timeEnd('HLS_Processing_Time')
  console.log(`HLS Master Playlist: ${join(OUTPUT_PATH, `master_${BASENAME}.m3u8`)}`)
}

export { processHLS }

const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);

/**
 * Extract all frames from a video file
 * @param {string} videoPath - Path to input video
 * @param {string} outputDir - Directory to save frames
 * @returns {Promise<{frameCount: number, fps: number}>}
 */
function extractFrames(videoPath, outputDir) {
  return new Promise((resolve, reject) => {
    let frameCount = 0;
    let fps = 30; // default
    
    ffmpeg(videoPath)
      .on('codecData', (data) => {
        fps = data.video_fps || 30;
      })
      .on('filenames', (filenames) => {
        frameCount = filenames.length;
      })
      .on('end', () => {
        resolve({ frameCount, fps });
      })
      .on('error', reject)
      .output(path.join(outputDir, 'frame_%06d.png'))
      .outputOptions(['-vsync', '0', '-q:v', '2'])
      .run();
  });
}

/**
 * Create a video from a sequence of frames
 * @param {string} framesDir - Directory containing frames (named sequentially)
 * @param {string} outputPath - Output video file path
 * @param {number} fps - Frames per second
 * @returns {Promise<void>}
 */
function createVideoFromFrames(framesDir, outputPath, fps = 30) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(path.join(framesDir, 'frame_%06d.png'))
      .inputFPS(fps)
      .output(outputPath)
      .outputOptions(['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23'])
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

/**
 * Get video metadata
 * @param {string} videoPath
 * @returns {Promise<{duration: number, fps: number, resolution: string}>}
 */
function getVideoMetadata(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      resolve({
        duration: metadata.format.duration,
        fps: videoStream.r_frame_rate,
        resolution: `${videoStream.width}x${videoStream.height}`
      });
    });
  });
}

module.exports = {
  extractFrames,
  createVideoFromFrames,
  getVideoMetadata
};
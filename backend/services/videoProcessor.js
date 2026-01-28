const ffmpeg = require('../ffmpeg/ffmpeg-wrapper');
const { removeBackground } = require('./backgroundRemoval');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const rename = promisify(fs.rename);

/**
 * Process a video: extract frames, remove background from each, reassemble
 * @param {string} videoPath - Input video file path
 * @param {string} outputDir - Directory for temporary files and final output
 * @param {Function} progressCallback - Callback to report progress (0-100)
 * @returns {Promise<string>} - Path to processed video file
 */
async function processVideo(videoPath, outputDir, progressCallback) {
  const frameDir = path.join(outputDir, 'frames');
  const processedFrameDir = path.join(outputDir, 'processed_frames');
  const outputVideoPath = path.join(outputDir, 'output.mp4');

  // Clean/create directories
  [frameDir, processedFrameDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  try {
    // 1. Extract frames
    progressCallback(10, 'Extracting video frames...');
    const { frameCount, fps } = await ffmpeg.extractFrames(videoPath, frameDir);
    
    // 2. Process each frame
    progressCallback(20, 'Removing background from frames...');
    const frames = (await readdir(frameDir)).filter(f => f.endsWith('.png')).sort();
    
    for (let i = 0; i < frames.length; i++) {
      const framePath = path.join(frameDir, frames[i]);
      const processedPath = path.join(processedFrameDir, frames[i]);
      await removeBackground(framePath, processedPath);
      
      // Update progress
      const progress = 20 + (i / frames.length) * 60;
      progressCallback(Math.round(progress), `Processed frame ${i + 1}/${frames.length}`);
    }
    
    // 3. Reassemble video
    progressCallback(85, 'Reassembling video...');
    await ffmpeg.createVideoFromFrames(processedFrameDir, outputVideoPath, fps);
    
    progressCallback(100, 'Video processing complete!');
    return outputVideoPath;
  } finally {
    // Cleanup temporary frames (optional, can be kept for debugging)
    // await cleanupDirectory(frameDir);
    // await cleanupDirectory(processedFrameDir);
  }
}

/**
 * Clean up a directory recursively
 * @param {string} dirPath
 */
async function cleanupDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    const files = await readdir(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        await cleanupDirectory(filePath);
      } else {
        await unlink(filePath);
      }
    }
    fs.rmdirSync(dirPath);
  }
}

module.exports = {
  processVideo,
  cleanupDirectory
};
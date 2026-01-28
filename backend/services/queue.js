const Queue = require('bull');
const path = require('path');
const { processVideo } = require('./videoProcessor');
const { removeBackground } = require('./backgroundRemoval');
const { cleanupDirectory } = require('./videoProcessor');
const fs = require('fs');
const { promisify } = require('util');

const exists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const TEMP_DIR = process.env.TEMP_DIR || './temp';

// Create queues
const imageQueue = new Queue('image-processing', REDIS_URL);
const videoQueue = new Queue('video-processing', REDIS_URL);

// Ensure temp directory exists
(async () => {
  if (!await exists(TEMP_DIR)) await mkdir(TEMP_DIR, { recursive: true });
})();

/**
 * Create a new processing job
 * @param {'image'|'video'} type - Job type
 * @param {string} filePath - Path to uploaded file
 * @returns {Promise<Bull.Job>}
 */
async function createJob(type, filePath) {
  const queue = type === 'image' ? imageQueue : videoQueue;
  const job = await queue.add({ type, filePath }, { attempts: 3, backoff: 5000 });
  return job;
}

/**
 * Get job by ID
 * @param {string} jobId
 * @returns {Promise<Bull.Job|null>}
 */
async function getJob(jobId) {
  let job = await imageQueue.getJob(jobId);
  if (!job) job = await videoQueue.getJob(jobId);
  return job;
}

/**
 * Remove job by ID
 * @param {string} jobId
 * @returns {Promise<boolean>}
 */
async function removeJob(jobId) {
  const job = await getJob(jobId);
  if (!job) return false;
  await job.remove();
  return true;
}

// Image processing handler
imageQueue.process(async (job) => {
  const { filePath } = job.data;
  const jobDir = path.join(TEMP_DIR, `job_${job.id}`);
  if (!await exists(jobDir)) await mkdir(jobDir, { recursive: true });
  
  const outputPath = path.join(jobDir, 'output.png');
  
  await job.progress(0, 'Starting background removal...');
  await removeBackground(filePath, outputPath);
  await job.progress(100, 'Background removal complete!');
  
  return { outputPath };
});

// Video processing handler
videoQueue.process(async (job) => {
  const { filePath } = job.data;
  const jobDir = path.join(TEMP_DIR, `job_${job.id}`);
  if (!await exists(jobDir)) await mkdir(jobDir, { recursive: true });
  
  const outputPath = path.join(jobDir, 'output.mp4');
  
  // Progress callback
  const progressCallback = (progress, message) => {
    job.progress(progress, message);
  };
  
  await processVideo(filePath, jobDir, progressCallback);
  
  return { outputPath };
});

// Cleanup completed jobs after 1 hour
imageQueue.on('completed', async (job) => {
  setTimeout(async () => {
    const jobDir = path.join(TEMP_DIR, `job_${job.id}`);
    await cleanupDirectory(jobDir);
  }, 3600000);
});

videoQueue.on('completed', async (job) => {
  setTimeout(async () => {
    const jobDir = path.join(TEMP_DIR, `job_${job.id}`);
    await cleanupDirectory(jobDir);
  }, 3600000);
});

module.exports = {
  createJob,
  getJob,
  removeJob,
  imageQueue,
  videoQueue
};
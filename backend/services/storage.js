const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const unlink = promisify(fs.unlink);
const exists = promisify(fs.exists);

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const TEMP_DIR = process.env.TEMP_DIR || './temp';

// Allowed MIME types
const allowedImageTypes = (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp').split(',');
const allowedVideoTypes = (process.env.ALLOWED_VIDEO_TYPES || 'video/mp4,video/quicktime,video/x-msvideo').split(',');

/**
 * Get a unique filename in the specified directory
 * @param {string} dir - Directory path
 * @param {string} extension - File extension (including dot)
 * @returns {string} - Full path to unique file
 */
function getUniqueFilePath(dir, extension) {
  const { v4: uuidv4 } = require('uuid');
  let filePath;
  do {
    filePath = path.join(dir, `${uuidv4()}${extension}`);
  } while (fs.existsSync(filePath));
  return filePath;
}

/**
 * Delete a file if it exists
 * @param {string} filePath
 * @returns {Promise<boolean>} - True if file was deleted
 */
async function deleteFile(filePath) {
  try {
    if (await exists(filePath)) {
      await unlink(filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Failed to delete file ${filePath}:`, err);
    return false;
  }
}

/**
 * Clean up old temporary files (older than 24 hours)
 * @param {string} dir - Directory to clean
 * @param {number} maxAgeMs - Maximum age in milliseconds (default 24h)
 */
async function cleanupOldFiles(dir, maxAgeMs = 24 * 60 * 60 * 1000) {
  if (!await exists(dir)) return;
  
  const files = fs.readdirSync(dir);
  const now = Date.now();
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (now - stat.mtimeMs > maxAgeMs) {
      await deleteFile(filePath);
    }
  }
}

module.exports = {
  allowedImageTypes,
  allowedVideoTypes,
  getUniqueFilePath,
  deleteFile,
  cleanupOldFiles
};
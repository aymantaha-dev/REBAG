const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5050';

/**
 * Remove background from an image file using the ML microservice
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to save output PNG
 * @returns {Promise<string>} - Path to output file
 */
async function removeBackground(inputPath, outputPath) {
  try {
    const formData = new FormData();
    const fileStream = fs.createReadStream(inputPath);
    formData.append('image', fileStream);

    const response = await axios.post(`${ML_SERVICE_URL}/remove-bg`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'stream'
    });

    // Ensure output directory exists
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(outputPath));
      writer.on('error', reject);
    });
  } catch (err) {
    throw new Error(`Background removal failed: ${err.message}`);
  }
}

/**
 * Check if the ML service is reachable
 * @returns {Promise<boolean>}
 */
async function checkMLService() {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 5000 });
    return response.data.status === 'ok';
  } catch (err) {
    return false;
  }
}

/**
 * Check Redis connection (placeholder - actual check in queue.js)
 * @returns {Promise<boolean>}
 */
async function checkRedis() {
  // Actual check is done in queue.js
  return true;
}

module.exports = {
  removeBackground,
  checkMLService,
  checkRedis
};
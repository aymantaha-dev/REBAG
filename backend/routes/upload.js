const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { createJob } = require('../services/queue');
const { allowedImageTypes, allowedVideoTypes } = require('../services/storage');

const router = express.Router();

// Ensure upload directories exist
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const imageUploadDir = path.join(uploadDir, 'images');
const videoUploadDir = path.join(uploadDir, 'videos');
[imageUploadDir, videoUploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Configure multer storage
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, imageUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, videoUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: parseInt(process.env.MAX_IMAGE_SIZE) || 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (allowedImageTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid image file type'));
  }
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: parseInt(process.env.MAX_VIDEO_SIZE) || 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (allowedVideoTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid video file type'));
  }
});

// Upload image
router.post('/image', imageUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new Error('No file uploaded');
    const job = await createJob('image', req.file.path);
    res.json({
      success: true,
      jobId: job.id,
      message: 'Image upload accepted. Processing started.'
    });
  } catch (err) {
    next(err);
  }
});

// Upload video
router.post('/video', videoUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new Error('No file uploaded');
    const job = await createJob('video', req.file.path);
    res.json({
      success: true,
      jobId: job.id,
      message: 'Video upload accepted. Processing started.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
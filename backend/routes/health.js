const express = require('express');
const fs = require('fs');
const path = require('path');
const { checkRedis, checkMLService } = require('../services/backgroundRemoval');

const router = express.Router();

router.get('/', async (req, res) => {
  const checks = {
    backend: 'ok',
    redis: 'unknown',
    ml_service: 'unknown',
    disk: 'unknown'
  };

  // Check Redis
  try {
    checks.redis = await checkRedis() ? 'ok' : 'unreachable';
  } catch (err) {
    checks.redis = 'error';
  }

  // Check ML service
  try {
    checks.ml_service = await checkMLService() ? 'ok' : 'unreachable';
  } catch (err) {
    checks.ml_service = 'error';
  }

  // Check disk space
  try {
    const tempDir = process.env.TEMP_DIR || './temp';
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    checks.disk = 'ok';
  } catch (err) {
    checks.disk = 'error';
  }

  const allOk = Object.values(checks).every(v => v === 'ok');
  res.status(allOk ? 200 : 503).json({
    success: allOk,
    service: 'REBAG',
    timestamp: new Date().toISOString(),
    checks
  });
});

module.exports = router;
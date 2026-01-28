const express = require('express');
const { getJob, removeJob } = require('../services/queue');

const router = express.Router();

// Get job status and result
router.get('/:jobId', async (req, res, next) => {
  try {
    const job = await getJob(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    const { id, data, opts, returnvalue, finishedOn, failedReason } = job;
    const status = await job.getState();

    res.json({
      success: true,
      job: {
        id,
        type: data.type,
        status,
        progress: job.progress(),
        result: returnvalue,
        error: failedReason,
        finishedOn
      }
    });
  } catch (err) {
    next(err);
  }
});

// Delete job (cleanup)
router.delete('/:jobId', async (req, res, next) => {
  try {
    const removed = await removeJob(req.params.jobId);
    res.json({ success: true, removed });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
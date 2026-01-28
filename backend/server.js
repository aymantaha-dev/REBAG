const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const uploadRoute = require('./routes/upload');
const jobsRoute = require('./routes/jobs');
const healthRoute = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Static files for frontend
app.use(express.static(path.join(__dirname, '../frontend')));
// Static access to processed files (for download)
app.use('/processed', express.static(path.join(__dirname, 'temp/processed')));

// Routes
app.use('/api/upload', uploadRoute);
app.use('/api/jobs', jobsRoute);
app.use('/api/health', healthRoute);

// Default route
app.get('/api', (req, res) => {
  res.json({
    message: 'REBAG API',
    version: '1.0.0',
    endpoints: {
      upload: '/api/upload',
      jobs: '/api/jobs',
      health: '/api/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`REBAG backend listening on port ${PORT}`);
  console.log(`Frontend available at http://localhost:${PORT}`);
});
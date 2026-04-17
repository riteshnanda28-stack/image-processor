const express = require('express');
const multer = require('multer');
const Queue = require('bull');
const Image = require('../models/Image');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Configure storage for uploaded files
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
          fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: (req, file, cb) => {
          // Accept image files only
      if (file.mimetype.startsWith('image/')) {
              cb(null, true);
      } else {
              cb(new Error('Only image files are allowed'));
      }
    }
});

// Initialize Bull queue for image processing
const imageProcessingQueue = new Queue('image-processing', {
    redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD
    }
});

// POST - Upload and queue image for processing
router.post('/upload', authenticateToken, upload.single('image'), async (req, res) => {
    try {
          if (!req.file) {
                  return res.status(400).json({ error: 'No file uploaded' });
          }

      // Create image record in database
      const image = new Image({
              userId: req.user.id,
              originalFileName: req.file.originalname,
              originalUrl: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
              status: 'pending',
              metadata: {
                        fileSize: req.file.size,
                        mimeType: req.file.mimetype,
                        uploadedAt: new Date()
              }
      });

      const savedImage = await image.save();

      // Add job to queue for processing
      const job = await imageProcessingQueue.add({
              imageId: savedImage._id,
              userId: req.user.id,
              originalUrl: savedImage.originalUrl,
              fileName: req.file.originalname
      }, {
              attempts: 3,
              backoff: {
                        type: 'exponential',
                        delay: 2000
              },
              removeOnComplete: false,
              removeOnFail: false
      });

      // Update image with job ID
      savedImage.jobId = job.id;
          await savedImage.save();

      res.status(201).json({
              success: true,
              imageId: savedImage._id,
              jobId: job.id,
              message: 'Image uploaded and queued for processing'
      });
    } catch (error) {
          console.error('Upload error:', error);
          res.status(500).json({ error: error.message });
    }
});

// GET - Get image status and processing result
router.get('/:imageId', authenticateToken, async (req, res) => {
    try {
          const image = await Image.findOne({
                  _id: req.params.imageId,
                  userId: req.user.id
          });

      if (!image) {
              return res.status(404).json({ error: 'Image not found' });
      }

      // Get job details if processing is in progress
      let jobDetails = null;
          if (image.jobId) {
                  const job = await imageProcessingQueue.getJob(image.jobId);
                  if (job) {
                            const state = await job.getState();
                            jobDetails = {
                                        state,
                                        progress: job.progress(),
                                        attempts: job.attemptsMade
                            };
                  }
          }

      res.json({
              imageId: image._id,
              status: image.status,
              originalFileName: image.originalFileName,
              processedUrl: image.processedUrl,
              metadata: image.metadata,
              jobDetails,
              error: image.processingError,
              createdAt: image.createdAt,
              updatedAt: image.updatedAt
      });
    } catch (error) {
          console.error('Get image error:', error);
          res.status(500).json({ error: error.message });
    }
});

// GET - List all images for authenticated user
router.get('/', authenticateToken, async (req, res) => {
    try {
          const page = parseInt(req.query.page) || 1;
          const limit = parseInt(req.query.limit) || 10;
          const skip = (page - 1) * limit;

      const images = await Image.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-originalUrl'); // Exclude large image data from list

      const total = await Image.countDocuments({ userId: req.user.id });

      res.json({
              images,
              pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit)
              }
      });
    } catch (error) {
          console.error('List images error:', error);
          res.status(500).json({ error: error.message });
    }
});

// DELETE - Delete an image
router.delete('/:imageId', authenticateToken, async (req, res) => {
    try {
          const image = await Image.findOneAndDelete({
                  _id: req.params.imageId,
                  userId: req.user.id
          });

      if (!image) {
              return res.status(404).json({ error: 'Image not found' });
      }

      // Remove associated job from queue if exists
      if (image.jobId) {
              const job = await imageProcessingQueue.getJob(image.jobId);
              if (job) {
                        await job.remove();
              }
      }

      res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
          console.error('Delete image error:', error);
          res.status(500).json({ error: error.message });
    }
});

module.exports = router;

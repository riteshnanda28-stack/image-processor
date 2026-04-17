const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
    },
    originalFileName: {
          type: String,
          required: true
    },
    originalUrl: {
          type: String,
          required: true
    },
    processedUrl: {
          type: String,
      default: null
    },
    status: {
          type: String,
          enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    processedAt: {
          type: Date,
      default: null
    },
    jobId: {
          type: String,
      default: null
    },
    metadata: {
          width: Number,
          height: Number,
          fileSize: Number,
          mimeType: String
    },
    processingError: {
          type: String,
      default: null
    },
    createdAt: {
          type: Date,
      default: Date.now
    },
    updatedAt: {
          type: Date,
      default: Date.now
    }
});

module.exports = mongoose.model('Image', imageSchema);

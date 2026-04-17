const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({ 
        message: 'Image Processor API',
            version: '1.0.0',
                endpoints: {
                      health: '/health',
                            auth: '/api/auth',
                                  images: '/api/images'
                                      }
                                        });
                                        });

app.use('/api/auth', authRoutes);

                                        // Error handling middleware
                                        app.use((err, req, res, next) => {
                                          console.error(err.stack);
                                            res.status(500).json({ error: 'Internal server error' });
                                            });

                                            const PORT = process.env.PORT || 5000;

                                            app.listen(PORT, () => {
                                              console.log(`Server running on port ${PORT}`);
                                              });

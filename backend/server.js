const app = require('./src/app');
const connectDB = require('./src/config/database');

// Load environment variables
require('dotenv').config();

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
    Server started on port ${PORT}
    Environment: ${process.env.NODE_ENV}
    URL: http://localhost:${PORT}
    Database: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}
    Started at: ${new Date().toLocaleString()}
    `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Error: ${err.message}`);
  // Close server and exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`Error: ${err.message}`);
  console.log('Shutting down due to uncaught exception');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

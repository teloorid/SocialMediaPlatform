const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Connection options for better performance and reliability
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // bufferMaxEntries: 0,
      bufferCommands: false,
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`
        MongoDB Connected successfully.
        Host: ${conn.connection.host}
        Database: ${conn.connection.name}
        Connection State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}
        Environment: ${process.env.NODE_ENV}
        Connected at: ${new Date().toLocaleString()}
        `);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    // If the Node process ends, close the Mongoose connection
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });
  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.log('Check your connection string and network connectivity');
    process.exit(1);
  }
};

module.exports = connectDB;

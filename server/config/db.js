const mongoose = require('mongoose');

const buildMongoUri = () => {
  if (process.env.MONGO_URI) {
    return process.env.MONGO_URI;
  }
  const host = process.env.MONGO_HOST || '127.0.0.1';
  const port = process.env.MONGO_PORT || '27017';
  const dbName = process.env.MONGO_DB || 'socketio-chat';
  return `mongodb://${host}:${port}/${dbName}`;
};

const connectDB = async () => {
  try {
    const uri = buildMongoUri();
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      retryWrites: true,
    });
    console.log('[DB] Connected to MongoDB');
  } catch (error) {
    console.error('[DB] Connection error', error);
    process.exit(1);
  }
};

module.exports = connectDB;


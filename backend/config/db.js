const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (uri && uri.trim() !== '') {
    try {
      await mongoose.connect(uri);
      console.log('✅ Connected to MongoDB Atlas / Remote Database');
      return;
    } catch (err) {
      console.warn('⚠️ Could not connect to provided MONGO_URI. Falling back to MongoDB Memory Server...', err.message);
    }
  }

  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log(`✅ Connected to In-Memory MongoDB Server at ${mongoUri}`);
  } catch (err) {
    console.error('❌ Failed to start MongoDB Memory Server:', err);
    process.exit(1);
  }
}

module.exports = connectDB;

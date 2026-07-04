import mongoose from 'mongoose';

/**
 * Connect to MongoDB Atlas.
 * The connection string should include the database name (e.g. /trackmyspend).
 * Mongoose will create the database and collections automatically on first write.
 */
export async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('FATAL: MONGO_URI environment variable is not set.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log(`✅ Connected to MongoDB — database: ${mongoose.connection.db.databaseName}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }

  // Log disconnection events for observability
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });
}

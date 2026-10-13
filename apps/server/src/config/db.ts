import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../middleware/logger';

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('MongoDB connected successfully', {
      host: conn.connection.host,
      dbName: conn.connection.name,
    });
    return conn;
  } catch (error: any) {
    logger.error('FATAL: MongoDB connection failed on startup', {
      error: error?.message || String(error),
    });
    throw new Error(`MongoDB connection failed: ${error?.message || String(error)}`);
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

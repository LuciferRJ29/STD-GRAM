import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Missing MONGODB_URI environment variable');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Cache the connection across hot-reloads / serverless invocations.
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI as string, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

export default connectDB;

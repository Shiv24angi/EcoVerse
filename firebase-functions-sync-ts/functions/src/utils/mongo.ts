import { MongoClient, Db } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config();

const uri: string = process.env.MONGODB_URI!;
const dbName: string = process.env.MONGO_DB_NAME || "carbontracker";

let cachedClient: MongoClient | null = null;
let dbInstance: Db | null = null;

export async function connectToMongo(): Promise<Db> {
  if (dbInstance && cachedClient) {
    try {
      await cachedClient.db(dbName).command({ ping: 1 });
      return dbInstance;
    } catch {
      console.warn("🔌 MongoDB connection stale, reconnecting...");
      cachedClient = null;
      dbInstance = null;
    }
  }

  console.warn("🔌 Connecting to MongoDB...");
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    cachedClient = client;
    dbInstance = client.db(dbName);
    console.warn(`✅ MongoDB connected to: ${dbName}`);
    return dbInstance;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw error;
  }
}

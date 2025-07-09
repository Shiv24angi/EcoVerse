import { MongoClient, Db } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config();

const uri: string = process.env.MONGODB_URI!;
const dbName: string = process.env.MONGO_DB_NAME || "carbontracker";

let dbInstance: Db | null = null;

export async function connectToMongo(): Promise<Db> {
  if (dbInstance) return dbInstance;

  console.log("🔌 Connecting to MongoDB...");
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    dbInstance = client.db(dbName);
    console.log(`✅ MongoDB connected to: ${dbName}`);
    return dbInstance;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw error;
  }
}

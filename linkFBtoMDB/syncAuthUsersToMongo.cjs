require('dotenv').config({ path: '../.env.local' });
const admin = require('firebase-admin');
const { MongoClient } = require('mongodb');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const mongoClient = new MongoClient(process.env.MONGODB_URI);
const dbName = 'EcoVerseDB'; // or your DB name
const collectionName = 'auth_users'; // new MongoDB collection

async function getAllUsers(nextPageToken) {
  const result = [];
  const listUsers = async (token) => {
    const list = await auth.listUsers(1000, token);
    list.users.forEach(userRecord => {
      result.push({
        _id: userRecord.uid,
        email: userRecord.email || '',
        createdAt: userRecord.metadata.creationTime,
      });
    });
    if (list.pageToken) {
      await listUsers(list.pageToken);
    }
  };
  await listUsers(nextPageToken);
  return result;
}

async function syncToMongo() {
  try {
    const users = await getAllUsers();

    await mongoClient.connect();
    const db = mongoClient.db(dbName);
    const collection = db.collection(collectionName);

    const bulkOps = users.map(user => ({
      updateOne: {
        filter: { _id: user._id },
        update: { $set: user },
        upsert: true,
      }
    }));

    const result = await collection.bulkWrite(bulkOps);
    console.log(`✅ Synced ${result.upsertedCount + result.modifiedCount} auth users to MongoDB.`);

    await mongoClient.close();
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

syncToMongo();

require('dotenv').config({ path: '../.env.local' });
const admin = require('firebase-admin');
const { MongoClient } = require('mongodb');

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const mongoURI = process.env.MONGODB_URI;
const mongoClient = new MongoClient(mongoURI);

const dbNameFromURI = new URL(mongoURI).pathname.replace(/^\/+/, '').split('?')[0];


async function syncAllCollections() {
  try {
    await mongoClient.connect();
    const mongoDB = mongoClient.db(dbNameFromURI);

    const collections = await db.listCollections(); // ✅ INSIDE async function

    for (const collectionRef of collections) {
      const collectionName = collectionRef.id;
      const snapshot = await db.collection(collectionName).get();

      const bulkOps = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        data._id = doc.id;
        bulkOps.push({
          updateOne: {
            filter: { _id: doc.id },
            update: { $set: data },
            upsert: true,
          },
        });
      });

      if (bulkOps.length > 0) {
        const mongoCollection = mongoDB.collection(collectionName);
        const result = await mongoCollection.bulkWrite(bulkOps);
        console.log(`✅ Synced ${result.upsertedCount + result.modifiedCount} docs to MongoDB → ${collectionName}`);
      } else {
        console.log(`⚠️ No documents found in Firestore collection: ${collectionName}`);
      }
    }

    await mongoClient.close();
    console.log('✅ All collections synced successfully!');
  } catch (err) {
    console.error('❌ Error syncing collections:', err);
  }
}

// ✅ Call the async function from global scope
syncAllCollections();

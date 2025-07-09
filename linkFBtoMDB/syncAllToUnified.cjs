require('dotenv').config({ path: '../.env.local' });

const admin = require('firebase-admin');
const { MongoClient } = require('mongodb');

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

const mongoClient = new MongoClient(process.env.MONGODB_URI);
const mongoDBName = 'carbontracker';
const unifiedCollectionName = 'all_users';

async function syncUnified() {
  try {
    await mongoClient.connect();
    const mongoDB = mongoClient.db(mongoDBName);
    const collection = mongoDB.collection(unifiedCollectionName);

    const now = new Date();

    // ✅ 1. Sync Firestore users
    const firestoreSnap = await db.collection('users').get();
    const firestoreUsers = firestoreSnap.docs.map(doc => ({
      _id: doc.id,
      ...doc.data(),
      source: 'firestore',
      syncedAt: now,
    }));

    // ✅ 2. Sync Auth users
    const authUsers = [];
    let nextPageToken = undefined;

    do {
      const list = await auth.listUsers(1000, nextPageToken);
      list.users.forEach(userRecord => {
        authUsers.push({
          _id: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName || '',
          source: 'auth',
          syncedAt: now,
        });
      });
      nextPageToken = list.pageToken;
    } while (nextPageToken);

    // ✅ 3. Merge both into unified collection
    const bulkOps = [];

    [...firestoreUsers, ...authUsers].forEach(user => {
      bulkOps.push({
        updateOne: {
          filter: { _id: user._id },
          update: { $set: user },
          upsert: true,
        },
      });
    });

    if (bulkOps.length > 0) {
      const result = await collection.bulkWrite(bulkOps);
      console.log(`✅ Synced ${result.upsertedCount + result.modifiedCount} users to '${unifiedCollectionName}'`);
    } else {
      console.log('⚠️ No users to sync.');
    }

    await mongoClient.close();
  } catch (err) {
    console.error('❌ Error during unified sync:', err);
  }
}

syncUnified();

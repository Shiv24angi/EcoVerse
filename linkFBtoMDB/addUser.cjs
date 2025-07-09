const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function addUser(name, email) {
  try {
    const docRef = await db.collection('users').add({
      name,
      email,
    });
    console.log(`✅ Added user with ID: ${docRef.id}`);
  } catch (err) {
    console.error('❌ Error adding user:', err);
  }
}

addUser('Harshit', 'harshitbhatia206@gmail.com');

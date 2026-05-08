/**
 * Firebase Seed Script
 * Run this after Firebase setup to import initial data
 * 
 * Usage:
 * 1. Setup Firebase project
 * 2. Run: node seed-script.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize admin (requires service account key)
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedCategories() {
  console.log('Seeding categories...');
  const categories = require('./categories.json');
  
  await db.collection('categories').doc('config').set({
    ...categories,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log('✓ Categories seeded');
}

async function seedUsers() {
  console.log('Seeding users...');
  const users = require('./users.json');
  
  for (const userData of users) {
    // Create Firebase Auth user
    try {
      const userRecord = await admin.auth().createUser({
        email: userData.email,
        password: 'password123', // Default password, should be changed
        displayName: userData.nickname,
        emailVerified: true
      });
      
      // Create Firestore user document
      await db.collection('users').doc(userRecord.uid).set({
        ...userData,
        uid: userRecord.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: null
      });
      
      console.log(`✓ User created: ${userData.username} (${userRecord.uid})`);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log(`⚠ User already exists: ${userData.email}`);
      } else {
        console.error(`✗ Failed to create user ${userData.username}:`, error.message);
      }
    }
  }
  
  console.log('✓ Users seeded');
}

async function seedSettings() {
  console.log('Seeding settings...');
  
  await db.collection('settings').doc('app').set({
    name: 'ICIT Workload',
    version: '1.0.0',
    lockTime: '23:59',
    allowLateEntry: true,
    lateEntryHours: 24,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log('✓ Settings seeded');
}

async function main() {
  try {
    console.log('🌱 Starting Firebase seed...\n');
    
    await seedCategories();
    await seedUsers();
    await seedSettings();
    
    console.log('\n✅ Seed completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Change default passwords for all users');
    console.log('2. Verify data in Firebase Console');
    console.log('3. Test login with admin account');
    
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

main();

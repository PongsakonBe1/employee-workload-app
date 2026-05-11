// Script สร้าง Superadmin ใน Firestore
// ใช้ Firebase Admin SDK

const admin = require('firebase-admin');

// อ่าน Service Account Key (ต้อง download จาก Firebase Console ก่อน)
// Project Settings > Service Accounts > Generate new private key
const serviceAccount = require('./serviceAccountKey.json');

// หรือใช้ Application Default Credentials
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // หรือใช้: admin.credential.applicationDefault(),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

async function createSuperadmin() {
  try {
    // ข้อมูล Superadmin
    const superadminData = {
      email: 'pongsakon.be1@gmail.com',
      role: 'superadmin',
      active: true,
      displayName: 'พงศกร',
      fullName: 'พงศกร ราวังวง',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // สร้าง document ด้วย email เป็น ID (หรือใช้ UID จริงถ้ามี)
    const docRef = db.collection('users').doc('pongsakon.be1@gmail.com');
    
    await docRef.set(superadminData);
    
    console.log('✅ Superadmin created successfully!');
    console.log('Email: pongsakon.be1@gmail.com');
    console.log('Role: superadmin');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating superadmin:', error);
    process.exit(1);
  }
}

createSuperadmin();

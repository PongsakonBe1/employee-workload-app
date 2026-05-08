# Frontend Firebase Migration Guide

## เปลี่ยนจาก REST API → Firebase SDK

### สิ่งที่ต้องเปลี่ยน
| ปัจจุบัน | ใหม่ |
|---------|------|
| `apiFetch()` | `firebase.firestore()` |
| JWT Token | Firebase Auth |
| MongoDB | Firestore |
| `/api/auth/login` | `signInWithEmailAndPassword()` |
| `/api/worklogs` | `db.collection('worklogs')` |

---

## Step 1: Install Firebase SDK

```bash
cd C:\Users\ICIT-Admin\employee-workload-app\frontend
npm install firebase
```

---

## Step 2: Create Firebase Config

สร้างไฟล์ `lib/firebase.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "icit-workload-app-xxxxx.firebaseapp.com",
  projectId: "icit-workload-app-xxxxx",
  storageBucket: "icit-workload-app-xxxxx.appspot.com",
  messagingSenderId: "XXXXXXXXXXX",
  appId: "1:XXXXXXXXXXX:web:XXXXXXXXXXX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

**หมายเหตุ**: เอา config จาก Firebase Console → Project Settings → General → Your apps → Web app

---

## Step 3: Update AuthProvider

แก้ไข `components/AuthProvider.js`:

```javascript
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  signOut 
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get additional user data from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            ...userDoc.data()
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function login(username, password) {
    // Convert username to email
    const email = `${username}@icit.kmutnb.ac.th`;
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  }

  async function logout() {
    await signOut(auth);
  }

  const value = {
    user,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
```

---

## Step 4: Update Worklogs Page

แก้ไข `app/worklogs/page.js` ใช้ Firestore แทน apiFetch:

```javascript
// แทน import apiFetch
import { db } from "../../lib/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  getDocs,
  updateDoc,
  deleteDoc,
  doc 
} from "firebase/firestore";

// แทน function load()
async function load(page = 1) {
  setLoading(true);
  try {
    let q = query(
      collection(db, "worklogs"),
      orderBy(sortConfig.key, sortConfig.direction),
      limit(20)
    );

    if (user?.role !== "admin") {
      q = query(q, where("employeeId", "==", user.uid));
    }

    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setData({ items, total: items.length, page, pages: 1 });
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}

// แทน saveEdit
async function saveEdit(id) {
  try {
    await updateDoc(doc(db, "worklogs", id), {
      ...editForm,
      updatedAt: new Date()
    });
    setEditingId(null);
    load(data.page);
  } catch (err) {
    setActionError(err.message);
  }
}

// แทน executeDelete
async function executeDelete(id) {
  try {
    await deleteDoc(doc(db, "worklogs", id));
    setDeleteConfirmId(null);
    load(data.page);
  } catch (err) {
    setActionError(err.message);
  }
}
```

---

## Step 5: Update New Worklog Form

แก้ไข `app/worklogs/new/page.js`:

```javascript
// แทน import
import { db } from "../../../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// แทน onSubmit
async function onSubmit(event) {
  event.preventDefault();
  setSaving(true);
  setError("");
  setMessage("");

  try {
    const validation = validateWorklogForm(form);
    if (!validation.valid) {
      throw new Error(Object.values(validation.errors)[0]);
    }

    await addDoc(collection(db, "worklogs"), {
      date: form.date,
      time: form.time,
      recipient: sanitizeInput(form.recipient),
      dutyGroup: form.dutyGroup,
      mainDuty: form.mainDuty,
      minorTask: form.minorTask,
      comment: sanitizeInput(form.comment),
      employeeId: user.uid,
      employeeNickname: user.nickname,
      status: "บันทึกแล้ว",
      createdAt: serverTimestamp()
    });

    clearDraft();
    setMessage(t("form.saved"));
    setForm(current => ({
      ...current,
      recipient: "",
      minorTask: "",
      mainDuty: "",
      dutyGroup: "main",
      comment: "",
      time: nowTime()
    }));
    
    setTimeout(() => setMessage(""), 3000);
  } catch (err) {
    setError(err.message);
  } finally {
    setSaving(false);
  }
}
```

---

## Step 6: Update Dashboard

แก้ไข `app/dashboard/page.js`:

```javascript
// แทน import
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

// แทน useEffect
useEffect(() => {
  async function loadStats() {
    const worklogsRef = collection(db, "worklogs");
    
    // Query based on fiscal year
    const q = user?.role === "admin" 
      ? query(worklogsRef)  // Admin sees all
      : query(worklogsRef, where("employeeId", "==", user.uid));

    const snapshot = await getDocs(q);
    const worklogs = snapshot.docs.map(doc => doc.data());
    
    // Calculate stats (client-side)
    const total = worklogs.length;
    const byEmployee = {}; // Calculate from data
    const byMainDuty = {}; // Calculate from data
    
    setData({
      total,
      byEmployee: Object.entries(byEmployee).map(([label, count]) => ({ label, count })),
      byMainDuty: Object.entries(byMainDuty).map(([label, count]) => ({ label, count })),
      recent: worklogs.slice(0, 5),
      scope: user?.role === "admin" ? "all" : "user"
    });
  }

  if (user) {
    loadStats();
  }
}, [fiscalYear, user]);
```

---

## Step 7: Update Categories (Minor Tasks)

แก้ไข `lib/commentSuggestions.js` ให้ดึงจาก Firestore:

```javascript
// ถ้าต้องการดึง categories จาก Firestore แทนไฟล์ static
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

export async function loadCategories() {
  const docRef = doc(db, "categories", "config");
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
}
```

---

## 🔧 Real-time Updates (Optional)

ถ้าต้องการให้ data อัพเดตแบบ real-time:

```javascript
import { onSnapshot } from "firebase/firestore";

// แทน useEffect ที่ใช้ load()
useEffect(() => {
  const q = query(collection(db, "worklogs"), orderBy("date", "desc"));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setData({ items, total: items.length });
  });

  return () => unsubscribe(); // Cleanup
}, []);
```

---

## ⚠️ สิ่งที่ต้องระวัง

### 1. Security Rules
ต้องมี Firestore Rules ที่ถูกต้อง (ดู `firebase/firestore.rules`)

### 2. Offline Support
Firestore มี offline persistence อัตโนมัติ (ดีกว่า REST API)

### 3. Batch Operations
ถ้าต้องการ bulk delete ใช้ `writeBatch()`:

```javascript
import { writeBatch } from "firebase/firestore";

const batch = writeBatch(db);
selectedIds.forEach(id => {
  batch.delete(doc(db, "worklogs", id));
});
await batch.commit();
```

---

## ✅ Migration Checklist

- [ ] Install Firebase SDK
- [ ] Create firebase.js config
- [ ] Update AuthProvider
- [ ] Update Worklogs page (read/write/delete)
- [ ] Update New Worklog form (create)
- [ ] Update Dashboard (stats)
- [ ] Update Admin pages (users, audit logs)
- [ ] Test login/logout
- [ ] Test CRUD operations
- [ ] Test offline functionality

---

## 🎯 Next Steps

หลังจาก migration เสร็จ:
1. ลบ `lib/api.js` (REST API client)
2. ลบ backend/ folder (MongoDB ไม่ใช้แล้ว)
3. Deploy frontend ไป Firebase Hosting (optional)
4. ทดสอบทั้งระบบ

ดู Hosting setup ใน: [../firebase/HOSTING.md](../firebase/HOSTING.md)

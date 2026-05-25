"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db, googleProvider, authReady } from "../lib/firebase";
import { logSystemAction, SystemActions } from "../lib/systemLog";

// Email ที่อนุญาตให้ login ได้โดยไม่ต้องเป็น @icit.kmutnb.ac.th
const WHITELIST_EMAILS = [
  "pongsagon.be1@gmail.com",
  "pongsakon.be1@gmail.com", // เพิ่ม spelling ที่ถูกต้อง
  // เพิ่ม email อื่นๆ ที่นี่
];

// กำหนด role เริ่มต้นสำหรับแต่ละ email (ถ้าไม่มีในระบบ)
const EMAIL_ROLES = {
  "pongsagon.be1@gmail.com": "superadmin",
  "pongsakon.be1@gmail.com": "superadmin", // เพิ่ม spelling ที่ถูกต้อง
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // โหลด user จาก localStorage ก่อน (restore ทันที)
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("icit_user");
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [showNameAlert, setShowNameAlert] = useState(false);

  useEffect(() => {
    let isFirstCall = true;
    let timeoutId = null;
    let unsubscribe = () => {};

    async function init() {
      // รอให้ setPersistence เสร็จก่อน — ป้องกัน race condition บน iOS
      await authReady;

      // handle redirect result สำหรับ iOS Standalone (signInWithRedirect)
      try {
        const redirectResult = await getRedirectResult(auth);
        // redirect result handled by onAuthStateChanged
      } catch (err) {
        console.error("[Auth] getRedirectResult error:", err);
      }

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          if (isFirstCall) {
            timeoutId = setTimeout(() => {
              if (!auth.currentUser) {
                localStorage.removeItem("icit_user");
                setUser(null);
                setLoading(false);
              }
            }, 500);

            isFirstCall = false;
            return;
          }

          localStorage.removeItem("icit_user");
          setUser(null);
          setPendingApproval(false);
          setLoading(false);
          return;
        }

        // ถ้า user login ให้ clear timeout ที่รออยู่
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        isFirstCall = false;

        try {
          // รอให้ Auth state พร้อม (สำคัญ!)
          await new Promise((resolve) => setTimeout(resolve, 500));

          await firebaseUser.getIdTokenResult();

          // 1. ลองหา user ด้วย UID ก่อน
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          let userData = userDoc.exists() ? userDoc.data() : null;

          // 2. ถ้าไม่เจอ ให้ลองหาด้วย email
          if (!userData) {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", firebaseUser.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const existingUser = querySnapshot.docs[0];
              const oldUid = existingUser.id; // UID เก่าจาก seed
              userData = existingUser.data();

              // สร้าง document ใหม่ด้วย uid จาก Google
              await setDoc(doc(db, "users", firebaseUser.uid), {
                ...userData,
                uid: firebaseUser.uid,
                lastLoginAt: new Date(),
                migratedFrom: oldUid,
              });
              // Migrate worklogs จาก old UID ไป new UID
              await migrateWorklogs(oldUid, firebaseUser.uid);
            }
          } else {
            // อัพเดต lastLoginAt (ไม่ให้ block login ถ้า fail)
            updateDoc(doc(db, "users", firebaseUser.uid), {
              lastLoginAt: new Date(),
            }).catch((e) => console.warn("[Auth] lastLoginAt update skipped:", e.code));
          }

          // 3. ถ้ามี user data แล้ว
          if (userData) {
            if (userData.active) {
              const fullUser = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                ...userData,
              };
              setUser(fullUser);
              // บันทึกลง localStorage สำหรับ restore เร็วขึ้น
              localStorage.setItem("icit_user", JSON.stringify(fullUser));
              setPendingApproval(false);
              if (!userData.displayName) {
                setShowNameAlert(true);
              }
            } else {
              await signOut(auth);
              localStorage.removeItem("icit_user");
              setUser(null);
              setPendingApproval(false);
            }
            setLoading(false);
            return;
          }

          // 4. ถ้ายังไม่มีในระบบ -> สร้างใหม่ (First time login)
          const isWhitelisted = WHITELIST_EMAILS.includes(firebaseUser.email);
          const isICIT = firebaseUser.email?.endsWith("@icit.kmutnb.ac.th");

          // แสดง alert สำหรับ first time login
          setShowNameAlert(true);

          if (isWhitelisted) {
            const newUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              nickname:
                firebaseUser.displayName || firebaseUser.email.split("@")[0],
              fullName: firebaseUser.displayName || "",
              displayName: firebaseUser.displayName || "",
              photoURL: firebaseUser.photoURL || "",
              role: EMAIL_ROLES[firebaseUser.email] || "staff",
              active: true,
              createdAt: new Date(),
              lastLoginAt: new Date(),
              username: firebaseUser.email.split("@")[0],
            };

            await setDoc(doc(db, "users", firebaseUser.uid), newUser);
            const fullNewUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...newUser,
            };
            setUser(fullNewUser);
            localStorage.setItem("icit_user", JSON.stringify(fullNewUser));
            setPendingApproval(false);
          } else if (isICIT) {
            const pendingUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              nickname:
                firebaseUser.displayName || firebaseUser.email.split("@")[0],
              fullName: firebaseUser.displayName || "",
              displayName: firebaseUser.displayName || "",
              photoURL: firebaseUser.photoURL || "",
              requestedAt: new Date(),
              status: "pending",
            };

            await setDoc(
              doc(db, "pendingUsers", firebaseUser.uid),
              pendingUser,
            );
            setPendingApproval(true);
            localStorage.removeItem("icit_user");
            setUser(null);
          } else {
            await signOut(auth);
            setUser(null);
            setPendingApproval(false);
          }
        } catch (err) {
          console.error("[Auth] Error:", err);
          // ถ้าเป็น Firestore error (permission, unavailable, เป็นต้น) หรือ error ไม่มี code → อย่า signOut
          // signOut เฉพาะ auth errors ที่ชัดเจนเท่านั้น
          const isFirestoreErr = err.code?.startsWith("firestore/") || err.code?.includes("permission") || err.code?.includes("unavailable") || !err.code;
          const isExplicitAuthErr = err.code?.startsWith("auth/");
          if (isExplicitAuthErr && !isFirestoreErr) {
            await signOut(auth);
            setUser(null);
            setPendingApproval(false);
          }
        }

        setLoading(false);
      });
    }

    init();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  // ฟังก์ชันย้าย worklogs จาก old UID ไป new UID
  async function migrateWorklogs(oldUid, newUid) {
    try {
      const worklogsRef = collection(db, "worklogs");
      const q = query(worklogsRef, where("employeeId", "==", oldUid));
      const snapshot = await getDocs(q);

      if (snapshot.empty) return;

      // อัพเดตแต่ละ worklog
      const updatePromises = snapshot.docs.map(async (docSnapshot) => {
        const worklogRef = doc(db, "worklogs", docSnapshot.id);
        await updateDoc(worklogRef, {
          employeeId: newUid,
          migratedFrom: oldUid,
          migratedAt: new Date(),
        });
      });

      await Promise.all(updatePromises);
    } catch (err) {
      console.error("[Auth] Error migrating worklogs:", err);
      // ไม่ throw error เพื่อไม่ให้ block การ login
    }
  }

  async function loginWithGoogle() {
    // iOS Safari standalone: ITP บล็อก cross-domain cookies ใน redirect flow
    // ทำให้ getRedirectResult() return null → ต้องใช้ popup
    const isIOSStandalone =
      typeof window !== "undefined" && window.navigator.standalone === true;

    if (isIOSStandalone) {
      const result = await signInWithPopup(auth, googleProvider);
      logSystemAction(SystemActions.LOGIN, "User logged in via Google").catch(() => {});
      return result.user;
    }

    // ทุก platform อื่น (Android PWA, Android browser, PC browser):
    // ใช้ redirect — ไม่ถูกบล็อกโดย popup blocker, ทำงานได้ดีบน mobile
    await signInWithRedirect(auth, googleProvider);
  }

  async function logout() {
    await signOut(auth);
    // Redirect to home page after logout
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }

  // ฟังก์ชันสำหรับ admin อนุมัติ user - ใช้ Firestore โดยตรง
  async function approveUser(uid, role = "staff") {
    const pendingRef = doc(db, "pendingUsers", uid);
    const pendingDoc = await getDoc(pendingRef);
    const pendingData = pendingDoc.data();

    if (pendingDoc.exists()) {
      const userRef = doc(db, "users", uid);
      const newUser = {
        email: pendingData.email,
        displayName: pendingData.displayName || pendingData.email.split("@")[0],
        role: role,
        active: true,
        createdAt: new Date(),
        approvedAt: new Date(),
        approvedBy: user.uid,
      };

      // สร้าง user ใหม่
      await setDoc(userRef, newUser);
      // ลบจาก pending
      await deleteDoc(pendingRef);

      // Log action
      await logSystemAction(
        SystemActions.APPROVE_USER,
        `Approved user ${pendingData.email} as ${role}`,
        uid,
      );

      // สร้าง notification แจ้ง admin ทุกคน
      const adminNotif = {
        userId: "all", // ส่งถึงทุกคน
        title: "มีการอนุมัติผู้ใช้ใหม่",
        message: `${pendingData.nickname || pendingData.email} ได้รับการอนุมัติเป็น ${role} โดย ${user?.email || "system"}`,
        type: "info",
        read: false,
        timestamp: new Date(),
      };
      await addDoc(collection(db, "notifications"), adminNotif);

      return true;
    }
    return false;
  }

  // ฟังก์ชันสำหรับ admin ปฏิเสธ user
  async function rejectUser(uid) {
    try {
      // ดึงข้อมูลก่อนลบเพื่อ log
      const pendingRef = doc(db, "pendingUsers", uid);
      const pendingDoc = await getDoc(pendingRef);
      const pendingData = pendingDoc.data();

      await deleteDoc(pendingRef);

      // Log action
      await logSystemAction(
        SystemActions.REJECT_USER,
        `Rejected user ${pendingData?.email || uid}`,
        uid,
      );

      return true;
    } catch (err) {
      console.error("[Auth] Error rejecting user:", err);
      throw err;
    }
  }

  const value = {
    user,
    setUser,
    loading,
    pendingApproval,
    showNameAlert,
    setShowNameAlert,
    loginWithGoogle,
    logout,
    approveUser,
    rejectUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Alert สำหรับ first-time login - ให้ตั้งชื่อ */}
      {showNameAlert && user && !user.displayName && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="text-2xl">👋</div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900 mb-1">
                  ยินดีต้อนรับ! กรุณาตั้งชื่อที่ใช้ลงงาน
                </p>
                <p className="text-sm text-amber-800 mb-3">
                  ชื่อนี้จะแสดงใน Dashboard และรายงานงาน เช่น "พงศกร", "สมชาย"
                </p>
                <button
                  onClick={() => {
                    setShowNameAlert(false);
                    window.location.href = "/profile";
                  }}
                  className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                >
                  ไปตั้งชื่อเลย →
                </button>
                <button
                  onClick={() => setShowNameAlert(false)}
                  className="ml-2 text-amber-700 text-sm hover:underline"
                >
                  ไว้ทีหลัง
                </button>
              </div>
              <button
                onClick={() => setShowNameAlert(false)}
                className="text-amber-500 hover:text-amber-700"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
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

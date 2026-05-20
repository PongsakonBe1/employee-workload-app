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
    console.log("[Auth] AuthProvider mounted, starting auth state listener...");
    let isFirstCall = true;
    let timeoutId = null;
    let unsubscribe = () => {};

    async function init() {
      // รอให้ setPersistence เสร็จก่อน — ป้องกัน race condition บน iOS
      await authReady;

      // handle redirect result สำหรับ iOS Standalone (signInWithRedirect)
      try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user) {
          console.log(
            "[Auth] Redirect result received:",
            redirectResult.user.email,
          );
        }
      } catch (err) {
        console.error("[Auth] getRedirectResult error:", err);
      }

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        console.log(
          "[Auth] onAuthStateChanged fired:",
          firebaseUser?.email || "null",
        );

        if (!firebaseUser) {
          // ถ้าเป็นการเรียกครั้งแรก ให้รอสักครู่เพื่อ restore session
          if (isFirstCall) {
            console.log("[Auth] First call with null, waiting for session...");

            timeoutId = setTimeout(() => {
              // ถ้ายังไม่มี user ให้ clear localStorage
              if (!auth.currentUser) {
                console.log("[Auth] No session found, clearing storage");
                localStorage.removeItem("icit_user");
                setUser(null);
                setLoading(false);
              }
            }, 500); // ลดเหลือ 500ms เท่านั้น

            isFirstCall = false;
            return;
          }

          // Logout จริง ๆ
          console.log("[Auth] User logged out");
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

          const idTokenResult = await firebaseUser.getIdTokenResult();
          console.log("[Auth] Token ready:", !!idTokenResult.token);

          // 1. ลองหา user ด้วย UID ก่อน
          console.log("[Auth] Looking for user with UID:", firebaseUser.uid);
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          let userData = userDoc.exists() ? userDoc.data() : null;
          console.log("[Auth] Found by UID:", userData ? "Yes" : "No");

          // 2. ถ้าไม่เจอ ให้ลองหาด้วย email
          if (!userData) {
            console.log(
              "[Auth] Looking for user by email:",
              firebaseUser.email,
            );
            // ใช้ simple query แทน
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", firebaseUser.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              // เจอ user ที่มี email ตรงกัน แต่ uid ไม่ตรง
              console.log("[Auth] Found by email, migrating...");
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
              console.log(
                "[Auth] Migrated user to new UID:",
                firebaseUser.uid,
                "from:",
                oldUid,
              );

              // Migrate worklogs จาก old UID ไป new UID
              await migrateWorklogs(oldUid, firebaseUser.uid);
            }
          } else {
            // อัพเดต lastLoginAt
            await updateDoc(doc(db, "users", firebaseUser.uid), {
              lastLoginAt: new Date(),
            });
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
              console.log("[Auth] User logged in:", userData.role);

              // ตรวจสอบว่าต้องตั้งชื่อหรือไม่
              if (!userData.displayName) {
                console.log(
                  "[Auth] First time login - need to set display name",
                );
                setShowNameAlert(true);
              }
            } else {
              console.log("[Auth] User inactive, signing out");
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

          console.log("[Auth] New user (first time login):", {
            isWhitelisted,
            isICIT,
            email: firebaseUser.email,
          });

          // แสดง alert สำหรับ first time login
          setShowNameAlert(true);

          if (isWhitelisted) {
            // Whitelist email -> สร้าง user ได้เลยไม่ต้องรออนุมัติ
            console.log("[Auth] Creating whitelist user...");
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
            console.log("[Auth] Whitelist user created");

            const fullNewUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...newUser,
            };
            setUser(fullNewUser);
            localStorage.setItem("icit_user", JSON.stringify(fullNewUser));
            setPendingApproval(false);
          } else if (isICIT) {
            // ICIT domain -> สร้าง pending user
            console.log("[Auth] Creating pending user...");
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
            console.log("[Auth] Pending user created");
            setPendingApproval(true);
            localStorage.removeItem("icit_user");
            setUser(null);
          } else {
            // ไม่อนุญาต
            console.log("[Auth] Email not allowed:", firebaseUser.email);
            await signOut(auth);
            setUser(null);
            setPendingApproval(false);
          }
        } catch (err) {
          console.error("[Auth] Error:", err);
          await signOut(auth);
          setUser(null);
          setPendingApproval(false);
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
      console.log("[Auth] Migrating worklogs from", oldUid, "to", newUid);

      // หา worklogs ที่มี employeeId เป็น oldUid
      const worklogsRef = collection(db, "worklogs");
      const q = query(worklogsRef, where("employeeId", "==", oldUid));
      const snapshot = await getDocs(q);

      console.log("[Auth] Found", snapshot.size, "worklogs to migrate");

      if (snapshot.empty) {
        console.log("[Auth] No worklogs to migrate");
        return;
      }

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
      console.log("[Auth] Migrated", snapshot.size, "worklogs successfully");
    } catch (err) {
      console.error("[Auth] Error migrating worklogs:", err);
      // ไม่ throw error เพื่อไม่ให้ block การ login
    }
  }

  async function loginWithGoogle() {
    // PWA Standalone detection:
    // - iOS Safari: window.navigator.standalone === true
    // - Android PWA / Chrome: matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone =
      typeof window !== "undefined" && window.navigator.standalone === true;
    const isAndroidStandalone =
      typeof window !== "undefined" &&
      window.matchMedia("(display-mode: standalone)").matches;
    const isPWAStandalone = isIOSStandalone || isAndroidStandalone;

    if (isPWAStandalone) {
      // Redirect flow — หน้าจะถูก redirect ไป Google แล้วกลับมา
      // getRedirectResult() ใน useEffect จะจัดการ result
      console.log("[Auth] PWA standalone mode detected, using signInWithRedirect");
      await signInWithRedirect(auth, googleProvider);
      return; // ไม่ return user ทันที เพราะจะมี redirect
    }

    const result = await signInWithPopup(auth, googleProvider);
    await logSystemAction(SystemActions.LOGIN, "User logged in via Google");
    return result.user;
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

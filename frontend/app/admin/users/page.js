"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Shield,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  UserPlus,
} from "lucide-react";
import { AppShell } from "../../../components/AppShell";
import { useAuth } from "../../../components/AuthProvider";
import { db } from "../../../lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  setDoc,
  serverTimestamp,
  addDoc,
  limit,
} from "firebase/firestore";

function sanitizePhotoURL(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    const allowed = [
      "lh3.googleusercontent.com",
      "lh4.googleusercontent.com",
      "lh5.googleusercontent.com",
      "lh6.googleusercontent.com",
      "googleusercontent.com",
    ];
    if (parsed.protocol !== "https:") return null;
    if (!allowed.some((d) => parsed.hostname.endsWith(d))) return null;
    return url;
  } catch {
    return null;
  }
}

export default function AdminUsersPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user, approveUser, rejectUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [roleChangeRequests, setRoleChangeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("active"); // "active" | "pending" | "role-requests"

  // Redirect non-admin users (allow admin and superadmin)
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isSuperAdmin = user?.role === "superadmin";

  // Debug: log user state changes
  useEffect(() => {
    console.log("[AdminUsers] User state changed:", {
      user: user?.email,
      role: user?.role,
      isAdmin,
      loading,
    });
  }, [user, isAdmin, loading]);

  useEffect(() => {
    // รอ loading เสร็จก่อนค่อย redirect (กัน redirect ระหว่างโหลด)
    if (!loading && user && !isAdmin) {
      console.log("[AdminUsers] Non-admin user, redirecting...");
      router.replace("/dashboard");
    }
  }, [user, isAdmin, loading, router]);

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "superadmin") {
      console.log("[AdminUsers] User is admin/superadmin, loading data...");
      loadUsers();
      loadPendingUsers();
      // โหลดคำขอเพิ่มสิทธิ์ (เฉพาะ superadmin)
      if (user?.role === "superadmin") {
        loadRoleChangeRequests();
      }
    } else if (user) {
      console.log("[AdminUsers] User role:", user?.role);
      // ถ้ามี user แต่ไม่ใช่ admin ให้หยุด loading
      setLoading(false);
    }
  }, [user]);

  // Force stop loading ถ้าเกิน 5 วินาที (กัน loading ค้าง)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log("[AdminUsers] Force stopping loading after timeout");
        setLoading(false);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  async function loadRoleChangeRequests() {
    try {
      console.log("[AdminUsers] Loading role change requests...");
      const q = query(
        collection(db, "adminPromotionRequests"),
        where("status", "==", "pending"),
      );
      const snapshot = await getDocs(q);
      const requests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("[AdminUsers] Role change requests loaded:", requests.length);
      setRoleChangeRequests(requests);
    } catch (err) {
      console.error("[AdminUsers] Error loading role change requests:", err);
      console.error("[AdminUsers] Error code:", err.code);
      console.error("[AdminUsers] Error message:", err.message);
      // ไม่ throw error เพื่อให้โหลดส่วนอื่นได้
    }
  }

  // สำหรับ Admin: ขอเพิ่มสิทธิ์ staff เป็น admin
  async function requestAdminPromotion(staffUser) {
    try {
      // สร้างคำขอใน collection
      await addDoc(collection(db, "adminPromotionRequests"), {
        userId: staffUser.id,
        userEmail: staffUser.email,
        userNickname: staffUser.nickname,
        userFullName: staffUser.fullName,
        requestedBy: user.uid,
        requestedByEmail: user.email,
        requestedAt: serverTimestamp(),
        status: "pending",
        currentRole: staffUser.role,
        requestedRole: "admin",
      });

      // สร้าง notification ให้ superadmin
      await addDoc(collection(db, "notifications"), {
        type: "admin_promotion_request",
        title: "คำขอเพิ่มสิทธิ์เป็น Admin",
        message: `${user.nickname} ขอเพิ่มสิทธิ์ ${staffUser.nickname} (${staffUser.email}) เป็น Admin`,
        userId: "superadmin", // จะถูกแทนที่ด้วยการค้นหา superadmin จริง
        read: false,
        createdAt: serverTimestamp(),
        data: {
          requestType: "admin_promotion",
          requestedUserId: staffUser.id,
          requestedBy: user.uid,
        },
      });

      alert("ส่งคำขอเพิ่มสิทธิ์ไปยัง Superadmin แล้ว");
      await loadRoleChangeRequests();
    } catch (err) {
      console.error("Error requesting promotion:", err);
      setError("ไม่สามารถส่งคำขอได้: " + err.message);
    }
  }

  // สำหรับ Superadmin: อนุมัติคำขอ
  async function approveRoleChangeRequest(request) {
    try {
      // อัพเดต role ของ user
      await updateDoc(doc(db, "users", request.userId), {
        role: "admin",
        updatedAt: serverTimestamp(),
        promotedBy: user.uid,
        promotedAt: serverTimestamp(),
      });

      // อัพเดตสถานะคำขอ
      await updateDoc(doc(db, "adminPromotionRequests", request.id), {
        status: "approved",
        approvedBy: user.uid,
        approvedAt: serverTimestamp(),
      });

      // สร้าง notification ให้ admin ที่ขอ
      await addDoc(collection(db, "notifications"), {
        type: "admin_promotion_approved",
        title: "อนุมัติคำขอเพิ่มสิทธิ์",
        message: `คำขอเพิ่มสิทธิ์ ${request.userNickname} เป็น Admin ได้รับการอนุมัติแล้ว`,
        userId: request.requestedBy,
        read: false,
        createdAt: serverTimestamp(),
      });

      await loadUsers();
      await loadRoleChangeRequests();
      alert("อนุมัติคำขอสำเร็จ");
    } catch (err) {
      console.error("Error approving request:", err);
      setError("ไม่สามารถอนุมัติได้: " + err.message);
    }
  }

  // สำหรับ Superadmin: ปฏิเสธคำขอ
  async function rejectRoleChangeRequest(request) {
    try {
      await updateDoc(doc(db, "adminPromotionRequests", request.id), {
        status: "rejected",
        rejectedBy: user.uid,
        rejectedAt: serverTimestamp(),
      });

      // สร้าง notification ให้ admin ที่ขอ
      await addDoc(collection(db, "notifications"), {
        type: "admin_promotion_rejected",
        title: "ปฏิเสธคำขอเพิ่มสิทธิ์",
        message: `คำขอเพิ่มสิทธิ์ ${request.userNickname} เป็น Admin ถูกปฏิเสธ`,
        userId: request.requestedBy,
        read: false,
        createdAt: serverTimestamp(),
      });

      await loadRoleChangeRequests();
      alert("ปฏิเสธคำขอสำเร็จ");
    } catch (err) {
      console.error("Error rejecting request:", err);
      setError("ไม่สามารถปฏิเสธได้: " + err.message);
    }
  }

  async function loadUsers() {
    try {
      console.log("[AdminUsers] Loading users...");
      const usersQuery = query(collection(db, "users"), limit(100));
      const usersSnapshot = await getDocs(usersQuery);
      console.log("[AdminUsers] Users loaded:", usersSnapshot.size);
      const usersData = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
    } catch (err) {
      console.error("[AdminUsers] Error loading users:", err);
      console.error("[AdminUsers] Error code:", err.code);
      console.error("[AdminUsers] Error message:", err.message);
      if (err.code === "permission-denied") {
        setError("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ใช้ กรุณาตรวจสอบ Firestore Rules");
      } else {
        setError("โหลดข้อมูลผู้ใช้ไม่สำเร็จ: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadPendingUsers() {
    try {
      console.log("[AdminUsers] Loading pending users...");
      const pendingQuery = query(collection(db, "pendingUsers"), limit(100));
      const pendingSnapshot = await getDocs(pendingQuery);
      console.log("[AdminUsers] Pending users loaded:", pendingSnapshot.size);
      const pendingData = pendingSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPendingUsers(pendingData);
    } catch (err) {
      console.error("[AdminUsers] Error loading pending users:", err);
      console.error("[AdminUsers] Error code:", err.code);
      // ไม่ throw error เพื่อให้โหลดส่วนอื่นได้
    }
  }

  async function handleApprove(uid) {
    try {
      await approveUser(uid);
      await loadUsers();
      await loadPendingUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReject(uid) {
    try {
      await rejectUser(uid);
      await loadPendingUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleUserActive(uid, currentActive) {
    try {
      await updateDoc(doc(db, "users", uid), {
        active: !currentActive,
      });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  // กรอง user ซ้ำ (อาจเกิดจากการ migrate UID) และแสดงเฉพาะ active users
  const uniqueUsers = users.filter(
    (user, index, self) =>
      index ===
      self.findIndex((u) => u.email === user.email || u.id === user.id),
  );

  const filteredUsers = uniqueUsers.filter(
    (u) =>
      (u.displayName?.toLowerCase() || "").includes(
        searchQuery.toLowerCase(),
      ) ||
      (u.nickname?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (u.fullName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (u.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()),
  );

  const filteredPending = pendingUsers.filter(
    (u) =>
      (u.nickname?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (u.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()),
  );

  // รอให้ loading เสร็จก่อนแสดงผล
  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="apple-panel px-8 py-6 text-center">
            <div className="animate-pulse">
              <div className="h-8 w-8 bg-slate-200 rounded-full mx-auto mb-3"></div>
            </div>
            <p className="text-slate-600">{t("common.loading")}</p>
            <p className="text-xs text-slate-400 mt-2">กำลังโหลดข้อมูล...</p>
            <button
              onClick={() => {
                console.log("[AdminUsers] Manual refresh clicked");
                setLoading(false);
                loadUsers();
              }}
              className="mt-4 text-xs text-blue-600 hover:text-blue-700 underline"
            >
              คลิกที่นี่ถ้ารอนานเกินไป
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  // ถ้าไม่ใช่ admin ให้แสดงข้อความแทน (ไม่ redirect เพราะ AppShell จัดการแล้ว)
  if (!user || !isAdmin) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="apple-panel px-8 py-6 text-center">
            <p className="text-slate-600">ไม่มีสิทธิ์เข้าถึง</p>
            <p className="text-xs text-slate-400 mt-2">
              คุณต้องเป็นผู้ดูแลระบบจึงจะเข้าถึงหน้านี้ได้
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Admin
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              จัดการผู้ใช้
            </h1>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "active"
              ? "bg-slate-950 text-white"
              : "bg-white/70 text-slate-600 hover:bg-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <User size={16} />
            ผู้ใช้งาน ({uniqueUsers.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === "pending"
              ? "bg-amber-500 text-white"
              : "bg-white/70 text-slate-600 hover:bg-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock size={16} />
            รออนุมัติ ({pendingUsers.length})
            {pendingUsers.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {pendingUsers.length}
              </span>
            )}
          </div>
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab("role-requests")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === "role-requests"
                ? "bg-purple-500 text-white"
                : "bg-white/70 text-slate-600 hover:bg-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield size={16} />
              คำขอเพิ่มสิทธิ์ ({roleChangeRequests.length})
              {roleChangeRequests.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {roleChangeRequests.length}
                </span>
              )}
            </div>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="apple-panel mb-6 p-4">
        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            className="apple-input pl-11"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาพนักงาน..."
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Pending Users Table */}
      {activeTab === "pending" && (
        <div className="apple-panel overflow-hidden mb-6">
          <div className="p-4 bg-amber-50 border-b border-amber-100">
            <h2 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <UserPlus size={16} />
              คำขอใช้งานที่รออนุมัติ ({pendingUsers.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/60 text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">ชื่อ</th>
                  <th className="px-5 py-4">อีเมล</th>
                  <th className="px-5 py-4">ขอเมื่อ</th>
                  <th className="px-5 py-4">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPending.map((u) => {
                  const safePhoto = sanitizePhotoURL(u.photoURL);
                  return (
                  <tr key={u.id} className="bg-white/45">
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-950">
                      <div className="flex items-center gap-3">
                        {safePhoto && (
                          <img
                            src={safePhoto}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div>
                          <div>{u.displayName || u.nickname}</div>
                          {u.fullName && u.fullName !== u.displayName && (
                            <div className="text-xs text-slate-500">
                              {u.fullName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{u.email}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {u.requestedAt?.toDate?.().toLocaleString("th-TH") || "-"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(u.id)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} />
                          อนุมัติ
                        </button>
                        <button
                          onClick={() => handleReject(u.id)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1"
                        >
                          <XCircle size={12} />
                          ปฏิเสธ
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredPending.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              ไม่มีคำขอใช้งานที่รออนุมัติ
            </div>
          )}
        </div>
      )}

      {/* Active Users Table */}
      {activeTab === "active" && (
        <div className="apple-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/60 text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">ชื่อที่ใช้ลงงาน</th>
                  <th className="px-5 py-4">ชื่อเต็ม</th>
                  <th className="px-5 py-4">อีเมล</th>
                  <th className="px-5 py-4">สิทธิ์</th>
                  <th className="px-5 py-4">สถานะ</th>
                  <th className="px-5 py-4">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="bg-white/45">
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-950">
                      <div>
                        <div>{u.displayName || u.nickname || "-"}</div>
                        {u.displayName &&
                          u.nickname &&
                          u.displayName !== u.nickname && (
                            <div className="text-xs text-slate-400">
                              {u.nickname}
                            </div>
                          )}
                        {!u.displayName && (
                          <div className="text-xs text-amber-500">
                            ยังไม่ได้ตั้งชื่อลงงาน
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {u.fullName || "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{u.email}</td>
                    <td className="px-5 py-4">
                      {u.role === "superadmin" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                          <Shield size={12} />
                          Superadmin
                        </span>
                      ) : u.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
                          <Shield size={12} />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          <User size={12} />
                          Staff
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {u.active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <CheckCircle2 size={14} />
                          ใช้งาน
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                          <XCircle size={14} />
                          ไม่ใช้งาน
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        {u.role !== "admin" &&
                          u.role !== "superadmin" &&
                          u.id !== user?.uid && (
                            <>
                              <button
                                onClick={() => toggleUserActive(u.id, u.active)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                                  u.active
                                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                                    : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                }`}
                              >
                                {u.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                              </button>
                              {u.active && (
                                <button
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `ขอเพิ่มสิทธิ์ ${u.displayName || u.nickname} เป็น Admin?\n\nคำขอนี้จะถูกส่งไปยัง Superadmin สำหรับการอนุมัติ`,
                                      )
                                    ) {
                                      requestAdminPromotion(u);
                                    }
                                  }}
                                  className="rounded-lg px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center gap-1"
                                >
                                  <Shield size={12} />
                                  ขอเป็น Admin
                                </button>
                              )}
                            </>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              {t("common.noData")}
            </div>
          )}
        </div>
      )}

      {/* Role Change Requests Table - เฉพาะ Superadmin */}
      {activeTab === "role-requests" && isSuperAdmin && (
        <div className="apple-panel overflow-hidden mb-6">
          <div className="p-4 bg-purple-50 border-b border-purple-100">
            <h2 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
              <Shield size={16} />
              คำขอเพิ่มสิทธิ์เป็น Admin ({roleChangeRequests.length})
            </h2>
            <p className="text-xs text-purple-600 mt-1">
              Admin ขอเพิ่มสิทธิ์พนักงานเป็น Admin ต้องรอการอนุมัติจากคุณ
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/60 text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">พนักงานที่ขอเพิ่มสิทธิ์</th>
                  <th className="px-5 py-4">ขอโดย</th>
                  <th className="px-5 py-4">วันที่ขอ</th>
                  <th className="px-5 py-4">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roleChangeRequests.map((req) => (
                  <tr key={req.id} className="bg-white/45">
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium text-slate-950">
                            {req.userNickname}
                          </div>
                          <div className="text-xs text-slate-500">
                            {req.userEmail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <div>{req.requestedByEmail}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {req.requestedAt?.toDate?.().toLocaleString("th-TH") ||
                        "-"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveRoleChangeRequest(req)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} />
                          อนุมัติ
                        </button>
                        <button
                          onClick={() => rejectRoleChangeRequest(req)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1"
                        >
                          <XCircle size={12} />
                          ปฏิเสธ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {roleChangeRequests.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              ไม่มีคำขอเพิ่มสิทธิ์ที่รออนุมัติ
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="apple-panel p-4">
          <p className="text-sm text-slate-500">พนักงานทั้งหมด</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {users.length}
          </p>
        </div>
        <div className="apple-panel p-4">
          <p className="text-sm text-slate-500">ใช้งานอยู่</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {users.filter((u) => u.active).length}
          </p>
        </div>
        <div className="apple-panel p-4">
          <p className="text-sm text-slate-500">ไม่ใช้งาน</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {users.filter((u) => !u.active).length}
          </p>
        </div>
        <div className="apple-panel p-4 bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-600">รออนุมัติ</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">
            {pendingUsers.length}
          </p>
        </div>
      </div>
    </AppShell>
  );
}

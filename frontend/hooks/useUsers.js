"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";

/**
 * Hook สำหรับดึงรายชื่อ users (staff, admin, superadmin)
 */
export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Method 1: Query without orderBy (no complex index needed)
      try {
        const q = query(
          collection(db, "users"),
          where("role", "in", ["staff", "admin", "superadmin"])
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setUsers(data);
        return data;
      } catch (err1) {
        // Fallback: Get all users and filter in JS
        const q3 = query(collection(db, "users"));
        const snapshot3 = await getDocs(q3);
        const allUsers = snapshot3.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const filtered = allUsers
          .filter((u) => ["staff", "admin", "superadmin"].includes(u.role))
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setUsers(filtered);
        return filtered;
      }
    } catch (err) {
      console.error("[useUsers] All methods failed:", err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    fetchUsers,
  };
}

export default useUsers;

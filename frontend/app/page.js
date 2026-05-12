"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log("[Home] Redirect check:", {
      user: user?.email,
      role: user?.role,
      loading,
    });
    if (!loading) {
      if (!user) {
        console.log("[Home] No user, redirect to /login");
        router.push("/login");
      } else if (user.role === "admin" || user.role === "superadmin") {
        console.log("[Home] Admin user, redirect to /dashboard");
        router.push("/dashboard");
      } else {
        // Staff and other roles go to worklogs/new (new record page)
        console.log("[Home] Staff user, redirect to /worklogs/new");
        router.push("/worklogs/new");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
        <p className="mt-4 text-slate-600">กำลังโหลด...</p>
      </div>
    </div>
  );
}

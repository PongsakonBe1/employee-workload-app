"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";
import { worklogEntryPath } from "../lib/authUtils";

export default function Home() {
  const router = useRouter();
  const { user, loading, pendingApproval } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (pendingApproval) router.replace("/pending");
    else router.replace(user ? worklogEntryPath(user.role) : "/login");
  }, [user, loading, pendingApproval, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
        <p className="mt-4 text-slate-600">กำลังโหลด...</p>
      </div>
    </div>
  );
}

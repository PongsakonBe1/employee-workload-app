"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { useAuth } from "../../components/AuthProvider";
import { worklogEntryPath } from "../../lib/authUtils";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, pendingApproval, loginWithGoogle } = useAuth();
  const [error, setError] = useState("");
  const [loginStatus, setLoginStatus] = useState("");

  useEffect(() => {
    if (loading) return;
    if (pendingApproval) router.replace("/pending");
    else if (user) router.replace(worklogEntryPath(user.role));
  }, [user, pendingApproval, loading, router]);

  async function handleGoogleLogin() {
    const isAndroidStandalone = window.matchMedia("(display-mode: standalone)").matches &&
      window.navigator.standalone !== true;
    setError("");
    setLoginStatus(isAndroidStandalone ? "กำลังเปิด Google…" : "กำลังเข้าสู่ระบบ…");

    try {
      await loginWithGoogle();
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        setError("ยกเลิกการเข้าสู่ระบบ");
      } else if (err.code === "auth/popup-blocked") {
        setError("กรุณาอนุญาตหน้าต่างป๊อปอัปในเบราว์เซอร์ แล้วลองใหม่");
      } else if (err.code === "auth/unauthorized-domain") {
        setError("โดเมนนี้ไม่ได้รับอนุญาต กรุณาติดต่อผู้ดูแลระบบ");
      } else {
        setError("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      }
      setLoginStatus("");
    }
  }

  return (
    <main className="flex min-h-[100svh] items-center justify-center px-5 py-10">
      <section className="apple-panel w-full max-w-md p-6 sm:p-10" aria-labelledby="login-title">
        <div className="mb-7 flex items-center gap-3">
          <Image src="/labboy-logo.png" alt="" width={36} height={36} className="shrink-0 rounded-xl" />
          <span className="text-sm font-semibold">labboy Workload</span>
        </div>
        <h1 id="login-title" className="text-3xl font-semibold tracking-tight">เข้าสู่ระบบ</h1>
        <p id="login-account" className="mt-3 text-sm leading-relaxed text-[var(--ui-sub)]">
          ใช้บัญชี Google ของ ICIT (@icit.kmutnb.ac.th)
        </p>
        {error && (
          <p role="alert" className="mt-5 rounded-xl bg-[var(--ui-red)] px-4 py-3 text-sm text-[var(--ui-red-ink)]">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || Boolean(loginStatus)}
          aria-describedby="login-account"
          className="apple-button mt-6 w-full"
        >
          <LogIn size={18} aria-hidden="true" />
          {loginStatus || "เข้าสู่ระบบด้วย Google"}
        </button>
        <span className="sr-only" role="status">{loginStatus}</span>
      </section>
    </main>
  );
}

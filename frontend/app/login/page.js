"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../../components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "พงศกร", password: "icit1234" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(form.username, form.password);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="apple-panel overflow-hidden p-8 sm:p-12">
          <div className="mb-10 inline-flex items-center gap-3 rounded-full bg-slate-950 px-4 py-2 text-white">
            <div className="relative h-8 w-16">
              <Image src="/icit-logo.png" alt="ICIT logo" fill className="object-contain" />
            </div>
            <span className="text-sm font-semibold">Workload Recorder</span>
          </div>

          <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-7xl">
            Record IT service work with less friction.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Designed for ICIT technical staff to record daily computer-room service, support requests,
            DL exam supervision, and annual fiscal-year CSV exports.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {["Main duties", "Minor tasks", "FY CSV export"].map((item) => (
              <div key={item} className="rounded-3xl bg-white/70 p-4 text-sm font-semibold text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit} className="apple-panel p-8">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-950 text-white">
            <ShieldCheck size={26} />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Sign in</h2>
          <p className="mt-2 text-sm text-slate-500">
            Current demo uses simple username/password. Replace this with ICIT SSO later.
          </p>

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-8">
            <label className="apple-label">Username</label>
            <input
              className="apple-input"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              placeholder="พงศกร"
              autoComplete="username"
            />
          </div>

          <div className="mt-5">
            <label className="apple-label">Password</label>
            <input
              className="apple-input"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button disabled={loading} className="apple-button mt-8 w-full">
            {loading ? "Signing in…" : "Continue"}
          </button>

          <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-500">
            Demo admin: <strong>admin</strong> / <strong>admin1234</strong><br />
            Demo staff: <strong>พงศกร</strong> / <strong>icit1234</strong>
          </p>
        </form>
      </section>
    </main>
  );
}

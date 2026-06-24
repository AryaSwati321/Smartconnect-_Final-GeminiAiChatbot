// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [otpStage, setOtpStage] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingUserId, setPendingUserId] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        alert(data.msg || "Login failed");
        setLoading(false);
        return;
      }

      if (data.requiresOtp) {
        setOtpStage(true);
        setPendingUserId(data.userId);
        setLoading(false);
        return;
      }

      login(data.token, data.user);
      if (data.user.role === "admin") navigate("/admin");
      else if (data.user.role === "vendor" || data.user.role === "provider") navigate("/provider");
      else navigate("/user/profile");
    } catch (err) {
      console.error(err);
      alert("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (!pendingUserId) return;
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: pendingUserId, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.msg || "OTP verification failed");
        setLoading(false);
        return;
      }
      login(data.token, data.user);
      if (data.user.role === "admin") navigate("/admin");
      else if (data.user.role === "vendor" || data.user.role === "provider") navigate("/provider");
      else navigate("/user/profile");
    } catch (err) {
      console.error(err);
      alert("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(900px_at_20%_20%,rgba(99,102,241,0.18),transparent),radial-gradient(700px_at_80%_10%,rgba(14,165,233,0.18),transparent)]" />
      <div className="relative w-full max-w-md rounded-3xl bg-white/95 backdrop-blur shadow-2xl ring-1 ring-white/60 overflow-hidden">
        <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500/30 to-sky-400/20 blur-2xl" />
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white text-lg font-bold shadow-lg">
              SC
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
              <p className="text-sm text-slate-500">Sign in to continue</p>
            </div>
          </div>

          {!otpStage ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  placeholder="you@example.com"
                  aria-label="Email"
                />
              </label>

              <label className="block space-y-1">
                <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                  <span>Password</span>
                  <button type="button" className="text-xs text-indigo-500 hover:text-indigo-600">
                    Forgot?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  placeholder="••••••••"
                  aria-label="Password"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className={`w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-white text-sm font-semibold transition shadow-lg ${
                  loading
                    ? "bg-indigo-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:shadow-xl hover:-translate-y-[1px]"
                }`}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      ></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-slate-600">Enter the 6-digit OTP sent to your email.</p>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">OTP</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  placeholder="123456"
                  aria-label="OTP"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className={`w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-white text-sm font-semibold transition shadow-lg ${
                  loading
                    ? "bg-indigo-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:shadow-xl hover:-translate-y-[1px]"
                }`}
              >
                {loading ? "Verifying..." : "Verify & Sign in"}
              </button>
            </form>
          )}

          <div className="text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <button
              onClick={() => navigate("/register")}
              className="font-semibold text-indigo-600 hover:text-indigo-700 underline-offset-4 hover:underline"
            >
              Create one
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

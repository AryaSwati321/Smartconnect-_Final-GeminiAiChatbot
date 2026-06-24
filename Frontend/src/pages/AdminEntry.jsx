// src/pages/AdminEntry.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminEntry() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user && user.role === "admin") {
    return <AdminPage />;
  }

  return <AdminLogin onSuccess={() => navigate("/admin", { replace: true })} />;
}

function AdminPage() {
  const { user } = useAuth();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-100">
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-lg w-full text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
          {user?.name ? `${user.name} Dashboard` : 'Arya Swati Dashboard'}
        </h2>
        <p className="text-gray-600 mt-3">
          {`Welcome ${user?.name || 'Arya Swati'} — replace this with your full admin interface.`}
        </p>
      </div>
    </div>
  );
}

function AdminLogin({ onSuccess }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

      const { token, user } = data;
      if (user.role !== "admin") {
        alert("This login is not an admin account");
        setLoading(false);
        return;
      }

      login(token, user);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      alert("Network error");
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-100 px-4">
      <div className="bg-white shadow-2xl rounded-2xl px-8 py-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl shadow-md">
            A
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
            Admin Login Page
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            Sign in to manage Smart Connect vendors and operations
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-semibold py-2.5 rounded-lg shadow-md hover:shadow-lg hover:scale-[1.02] transition-transform duration-150 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign in as Admin"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-8">
          © {new Date().getFullYear()} Smart Connect. All rights reserved.
        </p>
      </div>
    </div>
  );
}

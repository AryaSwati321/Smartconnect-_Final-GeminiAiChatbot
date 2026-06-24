// src/pages/DescribeProblem.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function DescribeProblem() {
  const [text, setText] = useState("");
  const [_file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const auth = useAuth();
  const token = auth?.token || auth?.user?.token || localStorage.getItem("token");

  const _keywords = [ /* same small mapping used earlier */ ];

  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return alert("Please describe the problem.");
    setLoading(true);
    try {
      // Try server suggestion
      try {
        // If you want to send file: use FormData; here we attempt JSON first
        const resp = await apiFetch("/api/search/suggest", { method: "POST", body: { text } }, token);
        const categories = resp?.categories ?? [];
        return nav("/categories", { state: { suggested: categories } });
      } catch {
        // fallback: local keywords (simple)
        const lower = text.toLowerCase();
        const local = [
          { id: "plumbing", name: "Plumbing", score: lower.match(/leak|pipe|drain|tap/g)?.length || 0 },
          { id: "electric", name: "Electrical", score: lower.match(/wiring|light|switch|electric/g)?.length || 0 },
          { id: "computer", name: "Computer Repair", score: lower.match(/computer|laptop|software|data/g)?.length || 0 },
        ].filter(s => s.score > 0).sort((a,b)=>b.score-a.score);
        nav("/categories", { state: { suggested: local } });
      }
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow">
        <h2 className="text-2xl font-semibold mb-2">Describe your problem</h2>
        <form onSubmit={submit} className="space-y-4">
          <textarea value={text} onChange={e=>setText(e.target.value)} rows={6}
            className="w-full border p-3 rounded" placeholder="Describe the issue..."/>
          <input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} />
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-sky-600 text-white rounded" disabled={loading}>{loading ? "Finding..." : "Find services"}</button>
            <button type="button" className="px-3 py-2 border rounded" onClick={()=>{ setText(""); setFile(null); }}>Reset</button>
          </div>
        </form>
      </div>
    </div>
  );
}

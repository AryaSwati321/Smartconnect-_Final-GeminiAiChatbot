// ProvidersPanel.jsx (or inline inside AdminPage)
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ProvidersPanel() {
  // ✅ define filter state (fixes "filter is not defined")
  const [filter, setFilter] = useState("pending"); // "pending" | "verified" | "blocked"
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const loadProviders = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await axios.get(
        `${API}/api/admin/providers?status=${filter}`,
        { headers }
      );
      setProviders(res.data?.providers ?? []);
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.msg || "Failed to load providers");
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ reload when filter changes
  useEffect(() => {
    loadProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="mt-6 bg-white border rounded-xl">
      <div className="flex items-center justify-between p-4">
        <h3 className="font-semibold">Providers</h3>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="blocked">Blocked</option>
          </select>
          <button onClick={loadProviders} className="border rounded px-3 py-2">
            Refresh
          </button>
        </div>
      </div>

      {err && <div className="px-4 pb-2 text-sm text-red-600">{err}</div>}
      {loading ? (
        <div className="p-4 text-sm text-gray-500">Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left">Vendor</th>
                <th className="p-3 text-left">Contact</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {providers.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-6 text-center text-slate-500">
                    No providers
                  </td>
                </tr>
              ) : (
                providers.map((p) => (
                  <tr key={p._id} className="border-t">
                    <td className="p-3">{p.businessName || p.name || "—"}</td>
                    <td className="p-3">{p.userRef?.email || "—"}</td>
                    <td className="p-3 capitalize">{p.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

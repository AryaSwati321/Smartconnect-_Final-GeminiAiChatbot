// src/pages/ProviderAvailability.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ApprovalModal from "../Components/ApprovalModal";

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

export default function ProviderAvailability() {
  const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [avail, setAvail] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [vendorApproved, setVendorApproved] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState("pending");
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        
        // First, fetch vendor approval status
        const meRes = await axios.get(`${API}/api/providers/me`, { headers });
        const approved = meRes.data?.vendorApproved || false;
        const status = meRes.data?.approvalStatus || "pending";
        
        setVendorApproved(approved);
        setApprovalStatus(status);
        
        // If not approved, show modal and don't load availability
        if (!approved) {
          setShowApprovalModal(true);
          setLoading(false);
          return;
        }
        
        // If approved, load existing availability
        try {
          const r = await axios.get(`${API}/api/providers/availability`, { headers });
          // ensure defaults exist for all days, merge with existing data
          const base = {};
          DAYS.forEach(d => {
            base[d.key] = {
              enabled: false,
              start: "10:00",
              end: "18:00",
              ...(r.data?.[d.key] || {})
            };
          });
          setAvail(base);
        } catch {
          // If availability fetch fails, just use defaults
          const base = {};
          DAYS.forEach(d => {
            base[d.key] = {
              enabled: false,
              start: "10:00",
              end: "18:00"
            };
          });
          setAvail(base);
        }
      } catch (_e) {
        setError(_e?.response?.data?.msg || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setRow = (key, patch) =>
    setAvail((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const save = async () => {
    // Double-check approval before saving
    if (!vendorApproved) {
      setShowApprovalModal(true);
      return;
    }
    
    try {
      setSaving(true);
      setError("");
      await axios.put(`${API}/api/providers/availability`, avail, { headers });
      alert("Availability saved ✅");
    } catch (e) {
      const errorMsg = e?.response?.data?.msg || e?.response?.data?.message || "Failed to save availability";
      setError(errorMsg);
      
      // If it's a 403 (not approved), show modal
      if (e?.response?.status === 403) {
        setShowApprovalModal(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const setDefault = () => {
    const next = { ...avail };
    ["mon","tue","wed","thu","fri","sat"].forEach(d => {
      next[d] = { enabled: true, start: "10:00", end: "18:00" };
    });
    next["sun"] = { enabled: false, start: "10:00", end: "18:00" };
    setAvail(next);
  };

  if (loading) return <div className="p-6">Loading…</div>;

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      navigate("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleContactAdmin = () => {
    window.location.href = "mailto:ADMIN.SMARTCONNECT@GMAIL.COM?subject=Vendor%20Account%20Approval%20Inquiry";
  };

  return (
    <>
      {/* Approval Modal */}
      <ApprovalModal
        isOpen={showApprovalModal}
        approvalStatus={approvalStatus}
        onClose={() => setShowApprovalModal(false)}
        onContact={handleContactAdmin}
      />

      {/* Main Content - Only show if approved */}
      {vendorApproved ? (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Vendor Availability</h1>
          <p className="text-slate-600">Set your weekly working hours.</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="h-fit rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>

      {!!error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
          {error}
        </div>
      )}

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-left">Day</th>
              <th className="p-2 text-left">Enabled</th>
              <th className="p-2 text-left">Start</th>
              <th className="p-2 text-left">End</th>
            </tr>
          </thead>
          <tbody>
            {DAYS.map(({ key, label }) => (
              <tr key={key} className="border-t">
                <td className="p-2">{label}</td>
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={!!avail[key]?.enabled}
                    onChange={(e) => setRow(key, { enabled: e.target.checked })}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="time"
                    value={avail[key]?.start || "10:00"}
                    onChange={(e) => setRow(key, { start: e.target.value })}
                    className="border rounded px-2 py-1"
                    disabled={!avail[key]?.enabled}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="time"
                    value={avail[key]?.end || "18:00"}
                    onChange={(e) => setRow(key, { end: e.target.value })}
                    className="border rounded px-2 py-1"
                    disabled={!avail[key]?.enabled}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 justify-end">
        <button onClick={setDefault} className="px-3 py-2 border rounded-lg">
          Set Mon–Sat 10:00–18:00
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Availability"}
        </button>
      </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Vendor Availability</h1>
              <p className="text-slate-600">Set your weekly working hours.</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="h-fit rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 text-center space-y-3">
            <p className="text-lg font-semibold text-amber-900">
              ⏳ This feature is pending admin approval
            </p>
            <p className="text-amber-800">
              Once your vendor account is verified, you'll be able to set your working hours.
            </p>
            <button
              onClick={() => setShowApprovalModal(true)}
              className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700"
            >
              View Approval Status
            </button>
          </div>
        </div>
      )}
    </>
  );
}

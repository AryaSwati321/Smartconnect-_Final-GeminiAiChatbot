import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function ServiceRequestCard({ booking }) {
  const statusColors = {
    pending: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", label: "text-amber-600" },
    accepted: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", label: "text-blue-600" },
    on_the_way: { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-800", label: "text-cyan-600" },
    in_progress: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-800", label: "text-indigo-600" },
    completed: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", label: "text-emerald-600" },
  };

  const colors = statusColors[booking.status] || statusColors.pending;
  const requestDate = new Date(booking.createdAt);

  return (
    <div className="rounded-xl bg-white shadow border border-slate-200 overflow-hidden hover:shadow-md transition">
      <div className={`${colors.bg} border-b ${colors.border} p-4`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-bold text-slate-900">{booking.category?.name || "Service"}</h3>
            <p className="text-sm text-slate-600 mt-1">🔵 {booking.user?.name || "Customer"}</p>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colors.text} ${colors.bg} border ${colors.border}`}>
            {booking.status.replace("_", " ").toUpperCase()}
          </span>
        </div>
      </div>

      <div className="p-4 grid md:grid-cols-3 gap-3 text-sm">
        {/* Request Date */}
        <div>
          <p className={`text-xs font-semibold ${colors.label} uppercase`}>📅 Request Date</p>
          <p className="text-slate-900 mt-1 font-medium">{requestDate.toLocaleDateString()}</p>
          <p className="text-slate-500 text-xs">{requestDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        {/* Customer Contact */}
        <div>
          <p className={`text-xs font-semibold ${colors.label} uppercase`}>👤 Customer</p>
          <p className="text-slate-900 mt-1 font-medium">{booking.user?.name}</p>
          {booking.user?.phone && <p className="text-slate-500 text-xs">📱 {booking.user.phone}</p>}
        </div>

        {/* Amount */}
        <div>
          <p className={`text-xs font-semibold ${colors.label} uppercase`}>💰 Amount</p>
          {booking.totalAmount ? (
            <p className="text-slate-900 mt-1 font-bold">
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: booking.currency || "INR",
              }).format(booking.totalAmount)}
            </p>
          ) : (
            <p className="text-slate-500 mt-1">Not specified</p>
          )}
        </div>

        {/* Address */}
        <div className="md:col-span-3">
          <p className={`text-xs font-semibold ${colors.label} uppercase`}>📍 Location</p>
          <p className="text-slate-900 mt-1">{booking.address || "Address not provided"}</p>
        </div>
      </div>

      {/* Status Timeline */}
      {booking.history && booking.history.length > 0 && (
        <div className="border-t border-slate-200 px-4 py-3 bg-slate-50">
          <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Recent Activity</p>
          <div className="text-xs text-slate-600 space-y-1">
            {booking.history.slice(0, 3).map((entry, idx) => (
              <p key={idx}>
                <span className="font-medium text-slate-700">{entry.action}</span> - {entry.note || "Status updated"}
              </p>
            ))}
            {booking.history.length > 3 && (
              <p className="text-slate-500 italic">... and {booking.history.length - 3} more entries</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServiceRequestHistory() {
  const auth = useAuth();
  const token = auth?.token || localStorage.getItem("token");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  // Fetch service request history
  useEffect(() => {
    if (auth?.user?.role !== "vendor") {
      navigate("/login");
      return;
    }

    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch("/api/bookings/vendor/service-request-history", {}, token);
        if (mounted) {
          setBookings(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch service request history", err);
        if (mounted) setBookings([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token, auth?.user?.role, navigate]);

  // Filter and search
  const filteredBookings = bookings.filter((booking) => {
    const statusMatch = selectedStatus === "all" || booking.status === selectedStatus;
    const searchMatch = 
      booking.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.user?.phone?.includes(searchQuery) ||
      booking.category?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return statusMatch && searchMatch;
  });

  // Calculate statistics
  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === "pending").length,
    accepted: bookings.filter(b => b.status === "accepted").length,
    in_progress: bookings.filter(b => ["on_the_way", "in_progress"].includes(b.status)).length,
    completed: bookings.filter(b => b.status === "completed").length,
  };

  if (auth?.user?.role !== "vendor") {
    return (
      <div className="p-6 text-center text-red-600">
        Only vendors can access this page
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Service Requests</p>
          <h1 className="text-4xl font-bold text-slate-900 mt-2">Request History</h1>
          <p className="text-sm text-slate-600 mt-2">
            View all service requests raised for your business
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs font-semibold text-slate-700 mt-1 uppercase">Total Requests</p>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-900">{stats.pending}</p>
            <p className="text-xs font-semibold text-amber-700 mt-1 uppercase">Pending</p>
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-900">{stats.accepted}</p>
            <p className="text-xs font-semibold text-blue-700 mt-1 uppercase">Accepted</p>
          </div>
          <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4 text-center">
            <p className="text-2xl font-bold text-indigo-900">{stats.in_progress}</p>
            <p className="text-xs font-semibold text-indigo-700 mt-1 uppercase">In Progress</p>
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-900">{stats.completed}</p>
            <p className="text-xs font-semibold text-emerald-700 mt-1 uppercase">Completed</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 bg-white rounded-lg shadow p-4 border border-slate-200">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                🔍 Search Requests
              </label>
              <input
                type="text"
                placeholder="Search by customer name, phone, or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                📊 Filter by Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="on_the_way">On The Way</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="text-slate-600 mt-4">Loading service requests...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center border border-slate-200">
            <p className="text-slate-500 text-lg">No service requests found</p>
            <p className="text-slate-400 mt-2">
              {searchQuery ? "Try adjusting your search" : "No requests match the selected filter"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 mb-4">
              Showing <span className="font-semibold">{filteredBookings.length}</span> of <span className="font-semibold">{bookings.length}</span> requests
            </p>
            {filteredBookings.map((booking) => (
              <ServiceRequestCard key={booking._id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

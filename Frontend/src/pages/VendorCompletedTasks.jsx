import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function CompletedTaskCard({ booking }) {
  const completedDate = booking.updatedAt ? new Date(booking.updatedAt) : new Date(booking.createdAt);
  const bookingDate = new Date(booking.createdAt);
  
  // Calculate completion time
  const completionTime = Math.floor((completedDate - bookingDate) / (1000 * 60)); // minutes

  return (
    <div className="rounded-2xl bg-white shadow-lg ring-1 ring-slate-100/80 overflow-hidden hover:shadow-xl transition">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-4 border-b border-emerald-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-slate-900">{booking.category?.name || "Service"}</h3>
            <p className="text-sm text-slate-600 mt-1">
              🔵 {booking.user?.name || "Customer"}
            </p>
            {booking.user?.phone && (
              <p className="text-xs text-slate-500 mt-1">📱 {booking.user.phone}</p>
            )}
          </div>
          <div>
            <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800">
              ✓ Completed
            </span>
            <p className="text-xs text-slate-500 mt-2">
              {bookingDate.toLocaleDateString()} {bookingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid md:grid-cols-2 gap-4 p-4">
        {/* Address */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-600 uppercase">📍 Service Location</p>
          <p className="text-sm text-slate-900 mt-2 line-clamp-2">
            {booking.address || "Address not provided"}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {booking.user?.defaultAddress || ""}
          </p>
        </div>

        {/* Completion Info */}
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
          <p className="text-xs font-semibold text-emerald-600 uppercase">⏱️ Completion Time</p>
          <p className="text-2xl font-bold text-emerald-900 mt-2">
            {completionTime} mins
          </p>
          <p className="text-xs text-emerald-700 mt-1">
            Completed at {completedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Customer Info */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <p className="text-xs font-semibold text-blue-600 uppercase">👤 Customer Details</p>
          <p className="text-sm text-blue-900 mt-2 font-semibold">{booking.user?.name}</p>
          <p className="text-xs text-blue-700 mt-1">{booking.user?.email}</p>
          {booking.user?.phone && (
            <p className="text-xs text-blue-700">📱 {booking.user.phone}</p>
          )}
        </div>

        {/* Order Value */}
        {booking.totalAmount && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-xs font-semibold text-emerald-600 uppercase">💰 Service Amount</p>
            <p className="text-lg font-bold text-emerald-900 mt-2">
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: booking.currency || "INR",
              }).format(booking.totalAmount)}
            </p>
          </div>
        )}
      </div>

      {/* Task History */}
      <div className="border-t border-slate-200 px-4 py-3 bg-slate-50">
        <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Task Progress</p>
        <div className="flex items-center justify-between text-center">
          {["Pending", "Accepted", "In Progress", "Completed"].map((stage, idx) => (
            <div key={stage} className="flex flex-col items-center flex-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                idx < 4 ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-600"
              }`}>
                {idx + 1}
              </div>
              <p className="text-xs text-slate-600 mt-1">{stage}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function VendorCompletedTasks() {
  const auth = useAuth();
  const token = auth?.token || localStorage.getItem("token");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, this-week, this-month
  const navigate = useNavigate();

  // Fetch completed tasks
  useEffect(() => {
    if (auth?.user?.role !== "vendor") {
      navigate("/login");
      return;
    }

    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch("/api/bookings/vendor/completed-tasks", {}, token);
        if (mounted) {
          setBookings(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch completed tasks", err);
        if (mounted) setBookings([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token, auth?.user?.role, navigate]);

  // Filter tasks
  const filteredBookings = bookings.filter((booking) => {
    if (filter === "all") return true;
    
    const completedDate = new Date(booking.updatedAt || booking.createdAt);
    const now = new Date();
    const daysOld = (now - completedDate) / (1000 * 60 * 60 * 24);

    if (filter === "this-week") return daysOld <= 7;
    if (filter === "this-month") return daysOld <= 30;
    
    return true;
  });

  // Calculate statistics
  const totalCompleted = bookings.length;
  const totalEarnings = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const avgCompletionTime = bookings.reduce((sum, b) => {
    const completedDate = new Date(b.updatedAt || b.createdAt);
    const bookingDate = new Date(b.createdAt);
    return sum + (completedDate - bookingDate) / (1000 * 60);
  }, 0) / Math.max(bookings.length, 1);

  if (auth?.user?.role !== "vendor") {
    return (
      <div className="p-6 text-center text-red-600">
        Only vendors can access this page
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Completed Tasks</p>
          <h1 className="text-4xl font-bold text-slate-900 mt-2">✓ Task History</h1>
          <p className="text-sm text-slate-600 mt-2">
            View all completed service requests and track your earnings
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-6">
            <p className="text-xs font-semibold text-emerald-600 uppercase">Total Completed</p>
            <p className="text-3xl font-bold text-emerald-900 mt-2">{totalCompleted}</p>
            <p className="text-xs text-emerald-700 mt-1">Tasks completed</p>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-6">
            <p className="text-xs font-semibold text-blue-600 uppercase">Total Earnings</p>
            <p className="text-3xl font-bold text-blue-900 mt-2">
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0,
              }).format(totalEarnings)}
            </p>
            <p className="text-xs text-blue-700 mt-1">From completed tasks</p>
          </div>

          <div className="rounded-lg bg-purple-50 border border-purple-200 p-6">
            <p className="text-xs font-semibold text-purple-600 uppercase">Avg Completion</p>
            <p className="text-3xl font-bold text-purple-900 mt-2">
              {Math.round(avgCompletionTime)} mins
            </p>
            <p className="text-xs text-purple-700 mt-1">Average task duration</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { value: "all", label: "All Tasks" },
            { value: "this-week", label: "This Week" },
            { value: "this-month", label: "This Month" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === tab.value
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            <p className="text-slate-600 mt-4">Loading completed tasks...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center">
            <p className="text-slate-500 text-lg">No completed tasks yet</p>
            <p className="text-slate-400 mt-2">Your completed tasks will appear here</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredBookings.map((booking) => (
              <CompletedTaskCard key={booking._id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

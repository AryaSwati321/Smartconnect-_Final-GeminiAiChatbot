// src/pages/VendorPendingBookings.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function VendorPendingBookings() {
  const auth = useAuth();
  const token = auth?.token || auth?.user?.token || localStorage.getItem("token");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (auth?.user?.role !== "vendor") {
      navigate("/login");
      return;
    }

    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch("/api/bookings/vendor/pending", {}, token);
        if (mounted) setBookings(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch pending bookings", err);
        if (mounted) setBookings([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token, auth?.user?.role, navigate]);

  if (auth?.user?.role !== "vendor") {
    return <div className="p-6 text-center text-red-600">Only vendors can access this page</div>;
  }

  if (loading) {
    return <div className="p-6 text-center">Loading pending bookings...</div>;
  }

  if (!bookings.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7f9ff] via-white to-[#e8f6ff] px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="text-center py-12">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Pending Bookings</p>
            <h1 className="text-3xl font-bold text-slate-900 mt-2">No Pending Requests</h1>
            <p className="text-sm text-slate-600 mt-2">
              You don't have any pending booking requests at the moment. Check back later!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f9ff] via-white to-[#e8f6ff] px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Vendor Dashboard</p>
          <h1 className="text-3xl font-bold text-slate-900 mt-2">Pending Requests ({bookings.length})</h1>
          <p className="text-sm text-slate-600 mt-1">
            Review and respond to customer booking requests
          </p>
        </div>

        <div className="grid gap-5">
          {bookings.map((booking) => {
            const user = booking.user || {};
            const category = booking.category || {};
            const userDisplay = user.name || user.fullName || "Customer";
            const categoryName = category.name || booking.serviceType || "Service";

            return (
              <div
                key={booking._id}
                className="rounded-2xl bg-white shadow-lg ring-1 ring-slate-100/80 p-6 hover:shadow-xl transition"
              >
                <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900">
                          {categoryName}
                        </h3>
                        <p className="text-sm text-slate-600">
                          Requested by <strong>{userDisplay}</strong>
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                        ⏳ Awaiting Your Response
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs uppercase text-slate-500 font-semibold">Customer Contact</p>
                        <p className="text-slate-900 mt-1">
                          📞 {user.phone || "Not provided"}
                        </p>
                        <p className="text-slate-600 text-xs">
                          📧 {user.email || "Not provided"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase text-slate-500 font-semibold">Service Location</p>
                        <p className="text-slate-900 mt-1">
                          {booking.address || "Address not provided"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase text-slate-500 font-semibold">Requested Time</p>
                        <p className="text-slate-900 mt-1">
                          {booking.bookingTime ? new Date(booking.bookingTime).toLocaleString() : "Not specified"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase text-slate-500 font-semibold">Request Time</p>
                        <p className="text-slate-900 mt-1">
                          {booking.createdAt ? new Date(booking.createdAt).toLocaleString() : "Just now"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 w-full lg:w-auto lg:flex-col">
                    <button
                      onClick={() => navigate(`/booking/${booking._id}`)}
                      className="flex-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold shadow-lg hover:shadow-xl transition inline-flex items-center justify-center gap-2"
                    >
                      ✓ Accept
                    </button>
                    <button
                      onClick={() => navigate(`/booking/${booking._id}`)}
                      className="flex-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-slate-300 to-slate-200 text-slate-900 font-semibold shadow-lg hover:shadow-xl transition inline-flex items-center justify-center gap-2"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

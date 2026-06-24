import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import { createSocket, disconnectSocket } from "../lib/socket";

function formatDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "N/A";
  }
}

const activeBookingStatuses = [
  "pending",
  "requested",
  "accepted",
  "on_the_way",
  "in_progress",
  "completion_requested",
];

function formatStatus(status) {
  return String(status || "pending").replace(/_/g, " ");
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [selectedService, setSelectedService] = useState("");
  const [location, setLocation] = useState(null);
  const [radius, setRadius] = useState(5);
  const [nearbyVendors, setNearbyVendors] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchingVendors, setSearchingVendors] = useState(false);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      setError("");
      try {
        const [categoryRes, bookingRes] = await Promise.all([
          apiFetch("/api/categories"),
          apiFetch("/api/bookings"),
        ]);

        const categoryList = Array.isArray(categoryRes)
          ? categoryRes
          : categoryRes.categories || [];
        setCategories(categoryList);
        if (categoryList.length) setSelectedService(categoryList[0].name);

        const bookingList = Array.isArray(bookingRes) ? bookingRes : [];
        setBookings(bookingList);

        const derivedNotifications = bookingList
          .slice(0, 6)
          .map((booking) => {
            const latestHistory = booking.history?.[booking.history.length - 1];
            return {
              id: booking._id,
              title: `Booking ${booking.status}`,
              message:
                latestHistory?.note ||
                `Your ${booking.category?.name || "service"} booking is ${booking.status}.`,
              at: latestHistory?.at || booking.updatedAt || booking.createdAt,
            };
          });
        setNotifications(derivedNotifications);
      } catch (err) {
        setError(err.message || "Failed to load dashboard data.");
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  useEffect(() => {
    const userId = user?.id || user?._id;
    if (!userId) return;

    const socket = createSocket(localStorage.getItem("token"));
    socket.emit("joinUser", { userId });

    const onUserNotification = (payload) => {
      const item = {
        id: `socket-${Date.now()}-${Math.random()}`,
        title: payload?.type ? `Booking ${payload.type.replace("booking_", "")}` : "Booking update",
        message: payload?.message || "Your booking has an update.",
        at: payload?.at || new Date().toISOString(),
      };
      setNotifications((prev) => [item, ...prev].slice(0, 20));
    };

    const onBookingUpdate = (payload) => {
      if (!payload?.bookingId) return;
      setBookings((prev) =>
        prev.map((booking) =>
          String(booking._id) === String(payload.bookingId)
            ? { ...booking, status: payload.status || booking.status, updatedAt: payload.updatedAt || booking.updatedAt }
            : booking
        )
      );
    };

    socket.on("user:notification", onUserNotification);
    socket.on("booking:update", onBookingUpdate);

    return () => {
      socket.off("user:notification", onUserNotification);
      socket.off("booking:update", onBookingUpdate);
      disconnectSocket();
    };
  }, [user]);

  const bookingSummary = useMemo(() => {
    const summary = {
      total: bookings.length,
      active: 0,
      completed: 0,
    };
    for (const booking of bookings) {
      if (booking.status === "completed") summary.completed += 1;
      if (activeBookingStatuses.includes(booking.status)) {
        summary.active += 1;
      }
    }
    return summary;
  }, [bookings]);

  const currentOrder = useMemo(() => {
    const active = bookings
      .filter((booking) => activeBookingStatuses.includes(String(booking.status || "").toLowerCase()))
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
    return active[0] || null;
  }, [bookings]);

  const latestCompletedOrder = useMemo(() => {
    const completed = bookings
      .filter((booking) => String(booking.status || "").toLowerCase() === "completed")
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
    return completed[0] || null;
  }, [bookings]);

  const displayedBookings = useMemo(() => {
    return [...bookings]
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      )
      .slice(0, 8);
  }, [bookings]);

  const useCurrentLocation = () => {
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => setError("Unable to fetch your location.")
    );
  };

  const findNearbyVendors = async () => {
    if (!selectedService) {
      setError("Please select a service first.");
      return;
    }
    if (!location) {
      setError("Please set your location first.");
      return;
    }

    setSearchingVendors(true);
    setError("");
    try {
      const res = await apiFetch(
        `/api/providers/search?service=${encodeURIComponent(selectedService)}&lat=${location.lat}&lng=${location.lng}&radius=${radius}`
      );
      setNearbyVendors(res.results || []);
    } catch (err) {
      setError(err.message || "Unable to load nearby vendors.");
    } finally {
      setSearchingVendors(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      navigate("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const confirmCompletion = async (bookingId) => {
    try {
      const updated = await apiFetch(`/api/bookings/${bookingId}/confirm-completion`, {
        method: "POST",
      });

      setBookings((prev) =>
        prev.map((booking) =>
          String(booking._id) === String(bookingId) ? { ...booking, ...updated } : booking
        )
      );
      alert("Service completion confirmed. The provider can now finalize the booking.");
    } catch (err) {
      alert(err.message || "Failed to confirm completion");
    }
  };

  const getStatusColor = (status) => {
    const statusMap = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      requested: "bg-blue-100 text-blue-800 border-blue-200",
      accepted: "bg-purple-100 text-purple-800 border-purple-200",
      on_the_way: "bg-orange-100 text-orange-800 border-orange-200",
      in_progress: "bg-indigo-100 text-indigo-800 border-indigo-200",
      completion_requested: "bg-amber-100 text-amber-800 border-amber-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };
    return statusMap[status?.toLowerCase()] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,200,200,0.1)_0%,transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(0,150,150,0.1)_0%,transparent_50%)]"></div>
      </div>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Hero Section */}
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl"></div>
          
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-4">
                <span className="text-emerald-300 text-sm">🏠</span>
                <span className="text-xs font-medium text-emerald-100 tracking-wide">USER DASHBOARD</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                Welcome back, <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">{user?.name || "User"}</span>
              </h1>
              <p className="text-gray-300 max-w-2xl text-sm sm:text-base">
                Search services, discover nearby vendors, track booking history, check notifications, and use chatbot support from one screen.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium hover:bg-white/20 transition-all duration-300 disabled:opacity-60"
            >
              <span className="w-4 h-4 inline-block group-hover:rotate-12 transition-transform">⏻</span>
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 animate-in slide-in-from-top-2 fade-in duration-300">
            <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm flex-1">{error}</p>
              <button onClick={() => setError("")} className="hover:bg-red-100 rounded-lg p-1 transition">✕</button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full blur-xl"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Bookings</p>
                <p className="text-3xl font-bold text-gray-900">{bookingSummary.total}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-lg">📅</span>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 w-0 group-hover:w-full transition-all duration-500"></div>
          </div>
          
          <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full blur-xl"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Active Bookings</p>
                <p className="text-3xl font-bold text-emerald-600">{bookingSummary.active}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-xl">⏱</span>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 w-0 group-hover:w-full transition-all duration-500"></div>
          </div>
          
          <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/5 to-transparent rounded-full blur-xl"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Completed</p>
                <p className="text-3xl font-bold text-purple-600">{bookingSummary.completed}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-xl">✅</span>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-purple-500 to-purple-600 w-0 group-hover:w-full transition-all duration-500"></div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Service Search Card */}
          <div className="group rounded-2xl bg-white p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg">
                <span className="text-sm">🔍</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Search Service</h2>
                <p className="text-sm text-gray-500">Start a new service request workflow</p>
              </div>
            </div>
            <div className="space-y-3">
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all"
              >
                <option value="">Select a service category</option>
                {categories.map((cat) => (
                  <option key={cat._id || cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    selectedService
                      ? `/search?service=${encodeURIComponent(selectedService)}`
                      : "/search"
                  )
                }
                className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 font-semibold text-white transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              >
                Browse Service Providers →
              </button>
            </div>
          </div>

          {/* Nearby Vendors Card */}
          <div className="group rounded-2xl bg-white p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
                <span className="text-sm">🧭</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Nearby Vendors</h2>
                <p className="text-sm text-gray-500">Find verified providers around you</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <button
                type="button"
                onClick={useCurrentLocation}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-medium text-gray-700 hover:bg-gray-100 transition-all"
              >
                <span className="text-sm">📍</span>
                <span className="text-sm">Location</span>
              </button>
              <input
                type="number"
                min="1"
                max="25"
                value={radius}
                onChange={(e) => setRadius(Math.max(1, Number(e.target.value) || 1))}
                className="rounded-xl border-gray-200 bg-gray-50 px-3 py-2.5 text-center outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                placeholder="Radius (km)"
              />
              <button
                type="button"
                onClick={findNearbyVendors}
                disabled={searchingVendors}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2.5 font-semibold text-white hover:shadow-lg transition-all disabled:opacity-50"
              >
                {searchingVendors ? "..." : "Find"}
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {nearbyVendors.slice(0, 4).map((vendor) => (
                <div
                  key={vendor.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3 hover:shadow-md transition-all"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{vendor.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">{vendor.distanceKm ?? "--"} km away</span>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500 text-xs">⭐</span>
                        <span className="text-xs font-medium text-gray-700">{Number(vendor.rating || 0).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">Book</button>
                </div>
              ))}
              {!nearbyVendors.length && (
                <p className="text-center text-sm text-gray-400 py-4">No nearby vendors found. Set your location to search.</p>
              )}
            </div>
          </div>
        </div>

        {/* Three Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Booking History Section */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                      <span className="text-lg">📈</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Booking History</h2>
                      <p className="text-sm text-gray-500">Your recent service bookings</p>
                    </div>
                  </div>
                  <Link to="/booking/new" className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:shadow-lg transition-all">
                    + New Booking
                  </Link>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Current Order Highlight */}
                {(currentOrder || latestCompletedOrder) && (
                  <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-5 mb-6">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1">
                        <div className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-semibold mb-2">
                          <span className="text-xs">⏱</span>
                          {currentOrder ? "CURRENT ORDER" : "RECENTLY COMPLETED"}
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          {currentOrder?.serviceType || latestCompletedOrder?.serviceType || currentOrder?.category?.name || "Service Booking"}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(currentOrder?.status || latestCompletedOrder?.status)}`}>
                            {formatStatus(currentOrder?.status || latestCompletedOrder?.status)}
                          </span>
                          <span className="text-sm text-gray-600">
                            Vendor: {currentOrder?.assignedProvider?.businessName || latestCompletedOrder?.assignedProvider?.businessName || "Not assigned"}
                          </span>
                        </div>
                      </div>
                      {currentOrder ? (
                        <button
                          onClick={() => navigate(`/tracking/${currentOrder._id}`)}
                          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white font-medium hover:shadow-lg transition-all"
                        >
                          Track Order →
                        </button>
                      ) : latestCompletedOrder && (
                        <button
                          onClick={() => navigate(`/booking/${latestCompletedOrder._id}`)}
                          className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-all"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Bookings List */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {displayedBookings.map((booking) => (
                    <div
                      key={booking._id}
                      className="group rounded-xl border border-gray-100 bg-gray-50/50 p-4 hover:shadow-md transition-all hover:border-gray-200"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Vendor</p>
                          <p className="font-medium text-gray-900 text-sm">
                            {booking.assignedProvider?.businessName || booking.vendor?.businessName || "Not assigned"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Service</p>
                          <p className="text-sm text-gray-700">{booking.serviceType || booking.category?.name || "Service"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Date</p>
                          <p className="text-sm text-gray-700">{formatDate(booking.bookingTime || booking.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                            {formatStatus(booking.status)}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Rating</p>
                          <div className="flex items-center gap-1">
                            {booking.feedback?.rating ? (
                              <>
                                <span className="text-yellow-500 text-sm">⭐</span>
                                <span className="text-sm font-medium text-gray-700">{booking.feedback.rating}/5</span>
                              </>
                            ) : (
                              <span className="text-sm text-gray-400">Not rated</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => navigate(`/booking/${booking._id}`)}
                          className="px-4 py-1.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                        >
                          View Order
                        </button>
                        {String(booking.status || "").toLowerCase() !== "completed" && (
                          <button
                            onClick={() => navigate(`/tracking/${booking._id}`)}
                            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:shadow-lg transition-all"
                          >
                            Track Order
                          </button>
                        )}
                        {String(booking.status || "").toLowerCase() === "completion_requested" && (
                          <button
                            onClick={() => confirmCompletion(booking._id)}
                            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium hover:shadow-lg transition-all"
                          >
                            Mark Service Complete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {!bookings.length && !isLoading && (
                    <div className="text-center py-12">
                      <div className="inline-flex p-4 rounded-full bg-gray-100 mb-3">
                        <span className="text-2xl">📅</span>
                      </div>
                      <p className="text-gray-500">No booking history found</p>
                      <Link to="/booking/new" className="inline-block mt-3 text-indigo-600 font-medium hover:underline">
                        Make your first booking →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notifications & Chatbot Section */}
          <div className="space-y-6">
            {/* Notifications Card */}
            <div className="rounded-2xl bg-white shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg">
                    <span className="text-sm">🔔</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                    <p className="text-sm text-gray-500">Stay updated with your bookings</p>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-3 max-h-[400px] overflow-y-auto">
                {notifications.map((note) => (
                  <div key={note.id} className="rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-3 hover:shadow-md transition-all">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 mt-1.5"></div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{note.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{note.message}</p>
                        <p className="text-xs text-gray-400 mt-2">{formatDate(note.at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {!notifications.length && !isLoading && (
                  <div className="text-center py-8">
                    <span className="text-3xl">🔔</span>
                    <p className="text-sm text-gray-400">No new notifications</p>
                  </div>
                )}
              </div>
            </div>

            {/* Chatbot Support Card */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                    <span className="text-lg">💬</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Chatbot Support</h3>
                </div>
                <p className="text-indigo-100 text-sm mb-4">
                  Need help with bookings, payments, or providers? Our AI assistant is here 24/7.
                </p>
                <button
                  type="button"
                  className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-indigo-600 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                >
                  💬 Start Conversation
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

import React, { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createSocket, disconnectSocket } from "../lib/socket";
import ApprovalModal from "../Components/ApprovalModal";
import VendorWorkInProgress from "./VendorWorkInProgress";
import VendorCompletedTasks from "./VendorCompletedTasks";
import ServiceRequestHistory from "./ServiceRequestHistory";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function formatDate(value) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "N/A";
  }
}

function _distanceKm(from, to) {
  if (!from || !to) return null;
  const [fromLat, fromLng] = from;
  const [toLat, toLng] = to;
  if ([fromLat, fromLng, toLat, toLng].some((x) => !Number.isFinite(x))) return null;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLat)) *
      Math.cos(toRad(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(r * c * 10) / 10;
}

function statusPillClass(status) {
  const s = String(status || "").toLowerCase();
  if (["pending", "requested"].includes(s)) return "bg-amber-100 text-amber-800 border-amber-200";
  if (["accepted", "on_the_way", "in_progress"].includes(s)) return "bg-sky-100 text-sky-800 border-sky-200";
  if (["completed"].includes(s)) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (["rejected", "cancelled", "blocked"].includes(s)) return "bg-rose-100 text-rose-800 border-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

const sections = [
  { id: "new", label: "New Bookings" },
  { id: "work-progress", label: "Work In Progress" },
  { id: "completed-tasks", label: "Completed Tasks" },
  { id: "service-request-history", label: "Service Requests History" },
  { id: "reviews", label: "Reviews" },
  { id: "notifications", label: "Notifications" },
  { id: "profile", label: "Vendor Profile Settings" },
];

export default function ProviderPage() {
  const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [businessName, setBusinessName] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [description, setDescription] = useState("");
  const [_reviewsCount, setReviewsCount] = useState(0);
  const [priceEstimateMin, setPriceEstimateMin] = useState("");
  const [priceEstimateMax, setPriceEstimateMax] = useState("");

  const [_providerId, setProviderId] = useState("");
  const [avgRating, setAvgRating] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [activeSection, setActiveSection] = useState("new");
  const [loggingOut, setLoggingOut] = useState(false);
  const [vendorApproved, setVendorApproved] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState("pending");
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(true);

  const _providerPoint = useMemo(() => {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
    return [latNum, lngNum];
  }, [lat, lng]);

  const loadProviderProfile = async () => {
    try {
      const me = await axios.get(`${API}/api/providers/me`, { headers });
      if (!me.data) return;

      setProviderId(me.data._id || "");
      setBusinessName(me.data.businessName || "");
      setDescription(me.data.description || "");
      setReviewsCount(Number(me.data.reviewsCount || 0));
      setAvgRating(Number(me.data.avgRating || 0));
      setPriceEstimateMin(
        me.data.priceEstimateMin === null || me.data.priceEstimateMin === undefined
          ? ""
          : me.data.priceEstimateMin
      );
      setPriceEstimateMax(
        me.data.priceEstimateMax === null || me.data.priceEstimateMax === undefined
          ? ""
          : me.data.priceEstimateMax
      );
      setLat(me.data.lat || "");
      setLng(me.data.lng || "");
      setSelectedCat(me.data.category?._id || me.data.category || "");
      setReviews(Array.isArray(me.data.reviews) ? me.data.reviews : []);
      setVendorApproved(me.data.vendorApproved || false);
      setApprovalStatus(me.data.approvalStatus || "pending");
    } catch (err) {
      console.error("Load profile error:", err);
    }
  };

  const loadBookings = async () => {
    try {
      setLoadingBookings(true);
      const res = await axios.get(`${API}/api/bookings`, { headers });
      if (Array.isArray(res.data)) {
        setBookings(res.data);
      }
    } catch (err) {
      console.error("Load bookings error:", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const loadCategories = async () => {
    try {
      setCategoryLoading(true);
      const catRes = await axios.get(`${API}/api/categories`, { headers });
      // FIX: Backend returns { categories: [...] }, not an array
      if (catRes.data && Array.isArray(catRes.data.categories)) {
        setCategories(catRes.data.categories);
      } else if (Array.isArray(catRes.data)) {
        setCategories(catRes.data);
      }
    } catch (err) {
      console.error("Load categories error:", err);
    } finally {
      setCategoryLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadProviderProfile();
      await loadBookings();
      await loadCategories();
      const socket = createSocket(token);
      
      // Listen for new notifications
      socket.on("newNotification", (notif) => {
        setNotifications((prev) => [notif, ...prev].slice(0, 20));
      });
      
      // Listen for booking status updates (real-time refresh)
      socket.on("bookingUpdated", (updatedBooking) => {
        console.log("Booking updated via socket:", updatedBooking);
        setBookings((prev) =>
          prev.map((b) => (b._id === updatedBooking._id ? updatedBooking : b))
        );
      });
      
      // Listen for new bookings
      socket.on("newBooking", (newBooking) => {
        console.log("New booking via socket:", newBooking);
        setBookings((prev) => [newBooking, ...prev]);
      });
      
      // Listen for booking acceptance/rejection
      socket.on("bookingStatusChanged", (data) => {
        console.log("Booking status changed via socket:", data);
        loadBookings(); // Refresh all bookings to ensure accuracy
      });
      
      return () => disconnectSocket(socket);
    })();
  }, [token]);

  // Initialize map when modal opens
  useEffect(() => {
    if (showMapModal && mapRef.current && !mapInstanceRef.current) {
      setTimeout(() => {
        const mapContainer = mapRef.current;
        if (!mapContainer) return;

        const initialLat = lat ? Number(lat) : 20;
        const initialLng = lng ? Number(lng) : 78;

        const map = L.map(mapContainer).setView([initialLat, initialLng], 13);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map);

        // Add marker if location exists
        if (lat && lng) {
          markerRef.current = L.marker([Number(lat), Number(lng)])
            .addTo(map)
            .bindPopup("Your Location");
        }

        // Click to place marker
        map.on("click", (e) => {
          const { lat: newLat, lng: newLng } = e.latlng;

          if (markerRef.current) {
            map.removeLayer(markerRef.current);
          }

          markerRef.current = L.marker([newLat, newLng])
            .addTo(map)
            .bindPopup("Selected Location")
            .openPopup();

          setLat(newLat.toFixed(6));
          setLng(newLng.toFixed(6));
        });

        mapInstanceRef.current = map;

        // Fit map to marker if location exists
        if (markerRef.current) {
          map.setView([Number(lat), Number(lng)], 13);
        }
      }, 100);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [showMapModal, lat, lng]);

  const saveProfile = async () => {
    try {
      const payload = {
        businessName,
        category: selectedCat,
        description,
        priceEstimateMin: priceEstimateMin ? Number(priceEstimateMin) : undefined,
        priceEstimateMax: priceEstimateMax ? Number(priceEstimateMax) : undefined,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
      };
      const res = await axios.put(`${API}/api/providers/me`, payload, { headers });
      alert(res.data.message || "Profile saved ✅");
      loadProviderProfile();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to save");
    }
  };

  const setMyLocation = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude.toFixed(6));
      setLng(pos.coords.longitude.toFixed(6));
    });
  };

  const _addNotification = (payload) => {
    const item = { id: `${Date.now()}-${Math.random()}`, ...payload };
    setNotifications((prev) => [item, ...prev].slice(0, 20));
  };

  const takeBookingAction = async (bookingId, action) => {
    try {
      if (!vendorApproved) {
        setShowApprovalModal(true);
        return;
      }

      if (action === "location" && (!lat || !lng)) {
        alert("Please set vendor location first.");
        return;
      }

      setActionLoadingId(`${bookingId}:${action}`);
      const payload =
        action === "location"
          ? { lat: Number(lat), lng: Number(lng) }
          : {};

      await axios.post(`${API}/api/bookings/${bookingId}/${action}`, payload, { headers });
      await loadBookings();
    } catch (e) {
      alert(e?.response?.data?.msg || e.message || "Action failed");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleContactAdmin = () => {
    window.location.href = "mailto:ADMIN.SMARTCONNECT@GMAIL.COM?subject=Vendor%20Account%20Approval%20Inquiry";
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

  const newRequests = bookings.filter((b) => ["pending", "requested"].includes(b.status));
  const acceptedBookings = bookings.filter((b) => b.status === "accepted");
  const onTheWayBookings = bookings.filter((b) => b.status === "on_the_way");
  const inProgressBookings = bookings.filter((b) => b.status === "in_progress");
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const rejectedBookings = bookings.filter((b) => b.status === "rejected");
  // serviceRequests includes all bookings that are not pending/requested
  const serviceRequests = bookings.filter((b) => !["pending", "requested"].includes(b.status));

  const summary = {
    newBookings: newRequests.length,
    active: inProgressBookings.length,
    accepted: acceptedBookings.length,
    onTheWay: onTheWayBookings.length,
    completed: completedBookings.length,
    rejected: rejectedBookings.length,
    reviews: reviews.length,
    notifications: notifications.length,
  };

  return (
    <>
      <ApprovalModal
        isOpen={showApprovalModal}
        approvalStatus={approvalStatus}
        onClose={() => setShowApprovalModal(false)}
        onContact={handleContactAdmin}
      />

      {/* Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Set Your Service Location</h2>
              <button
                onClick={() => setShowMapModal(false)}
                className="text-2xl text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-600">Click on the map to select your location</p>
            <div
              ref={mapRef}
              className="h-96 w-full rounded-lg border border-slate-200"
            />
            <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <div className="text-sm">
                {lat && lng ? (
                  <span className="text-slate-700">
                    📍 <strong>Location Set:</strong> {lat}, {lng}
                  </span>
                ) : (
                  <span className="text-slate-500">Click on map or use geolocation</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={setMyLocation}
                  className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                >
                  📍 Use My Current Location
                </button>
                <button
                  onClick={() => setShowMapModal(false)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-900 p-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-3xl bg-gradient-to-r from-emerald-500/90 via-teal-500/90 to-cyan-500/90 p-6 text-white shadow-2xl ring-1 ring-white/20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-emerald-100">Vendor Workspace</p>
                <h1 className="mt-2 text-3xl font-bold drop-shadow-sm">Vendor Dashboard</h1>
                <p className="mt-2 max-w-3xl text-emerald-50">
                  Track bookings, respond faster, and keep your profile in the green.
                </p>
                <div className="mt-3 flex items-center gap-3 text-sm text-emerald-50/90">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white font-bold">
                    {(user?.name || user?.email || "V").slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <div className="font-semibold">{user?.name || "Vendor"}</div>
                    <div className="text-emerald-50/70">{user?.email}</div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="h-fit rounded-xl border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-60 shadow-lg"
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </header>

          {!vendorApproved && (
            <section className="rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 text-white font-bold">
                  ⚠
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-amber-900">Admin Approval Pending</h3>
                  <p className="mt-2 text-sm text-amber-800">
                    Your vendor account is currently pending admin verification. Once approved, you'll be able to:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-800 list-disc list-inside">
                    <li>Accept and manage service bookings</li>
                    <li>Update your service availability</li>
                    <li>View and respond to customer bookings</li>
                  </ul>
                </div>
              </div>
            </section>
          )}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white/90 p-4 shadow-lg ring-1 ring-amber-100 border border-amber-50">
              <p className="text-sm text-slate-500">New Bookings</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{summary.newBookings}</p>
            </div>
            <div className="rounded-2xl bg-white/90 p-4 shadow-lg ring-1 ring-blue-100 border border-blue-50">
              <p className="text-sm text-slate-500">Accepted</p>
              <p className="mt-2 text-3xl font-bold text-blue-700">{summary.accepted}</p>
            </div>
            <div className="rounded-2xl bg-white/90 p-4 shadow-lg ring-1 ring-purple-100 border border-purple-50">
              <p className="text-sm text-slate-500">On The Way</p>
              <p className="mt-2 text-3xl font-bold text-purple-700">{summary.onTheWay}</p>
            </div>
            <div className="rounded-2xl bg-white/90 p-4 shadow-lg ring-1 ring-sky-100 border border-sky-50">
              <p className="text-sm text-slate-500">In Progress</p>
              <p className="mt-2 text-3xl font-bold text-sky-700">{summary.active}</p>
            </div>
            <div className="rounded-2xl bg-white/90 p-4 shadow-lg ring-1 ring-emerald-100 border border-emerald-50">
              <p className="text-sm text-slate-500">Completed</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">{summary.completed}</p>
            </div>
            <div className="rounded-2xl bg-white/90 p-4 shadow-lg ring-1 ring-red-100 border border-red-50">
              <p className="text-sm text-slate-500">Reviews</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{summary.reviews}</p>
            </div>
            <div className="rounded-2xl bg-white/90 p-4 shadow-lg ring-1 ring-indigo-100 border border-indigo-50">
              <p className="text-sm text-slate-500">Notifications</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">{summary.notifications}</p>
            </div>
            {summary.rejected > 0 && (
              <div className="rounded-2xl bg-white/90 p-4 shadow-lg ring-1 ring-rose-100 border border-rose-50">
                <p className="text-sm text-slate-500">Rejected</p>
                <p className="mt-2 text-3xl font-bold text-rose-700">{summary.rejected}</p>
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white/90 p-3 shadow-lg ring-1 ring-slate-200 border border-slate-100">
            <div className="flex flex-wrap gap-2">
              {sections.map((item) => {
                const isBookingSection = ["new", "work-progress", "completed-tasks", "service-request-history", "reviews", "notifications"].includes(item.id);
                const isDisabled = isBookingSection && !vendorApproved;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => !isDisabled && setActiveSection(item.id)}
                    disabled={isDisabled}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      isDisabled
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed opacity-50"
                        : activeSection === item.id
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </section>

          {activeSection === "profile" && (
            <section className="rounded-2xl bg-white/95 p-5 shadow-xl ring-1 ring-indigo-50 border border-indigo-50 space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">Vendor Profile Settings</h2>

              {!vendorApproved && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <p className="text-sm font-semibold text-blue-900">
                    ℹ️ You can update your profile now. However, you cannot set availability or accept bookings until your account is approved by admin.
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium">Business Name</label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Business name"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Service Category</label>
                <select
                  value={selectedCat}
                  onChange={(e) => setSelectedCat(e.target.value)}
                  disabled={categoryLoading}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                >
                  <option value="">{categoryLoading ? "Loading categories..." : "Select category"}</option>
                  {categories && categories.length > 0 ? (
                    categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))
                  ) : (
                    <option disabled>No categories available</option>
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  rows={3}
                  placeholder="Short service description"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Price Min (in Rupees)</label>
                  <input
                    type="number"
                    min="0"
                    value={priceEstimateMin}
                    onChange={(e) => setPriceEstimateMin(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="e.g., 100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Price Max (in Rupees)</label>
                  <input
                    type="number"
                    min="0"
                    value={priceEstimateMax}
                    onChange={(e) => setPriceEstimateMax(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="e.g., 500"
                  />
                </div>
              </div>

              {/* Location Section with Map Integration */}
              <div className="space-y-3 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-900">Service Location</label>
                    <p className="text-xs text-slate-600">Click "Set Location" to choose your service area on the map</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMapModal(true)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                  >
                    🗺️ Set Location
                  </button>
                </div>
                {lat && lng && (
                  <div className="flex items-center gap-2 rounded-lg bg-white p-2">
                    <span className="text-lg">📍</span>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-500">Location Set</p>
                      <p className="text-sm font-semibold text-slate-900">{lat}, {lng}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLat("");
                        setLng("");
                      }}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <a
                  href={vendorApproved ? "/provider/availability" : "#"}
                  onClick={(e) => !vendorApproved && e.preventDefault()}
                  className={`rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium ${
                    vendorApproved ? "hover:bg-slate-50 cursor-pointer" : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  Set Availability
                </a>
                <button
                  onClick={saveProfile}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Save Profile
                </button>
              </div>
            </section>
          )}

          {activeSection === "new" && !vendorApproved && (
            <section className="rounded-2xl bg-white/95 p-5 shadow-xl ring-1 ring-amber-50 border border-amber-50">
              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
                <p className="text-sm font-semibold text-amber-900">
                  ✓ This section will be available once your vendor account is approved by admin.
                </p>
              </div>
            </section>
          )}

          {activeSection === "new" && vendorApproved && (
            <section className="rounded-2xl bg-white/95 p-5 shadow-xl ring-1 ring-amber-50 border border-amber-50 space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">New Booking Requests</h2>
              {loadingBookings ? (
                <div className="py-8 text-center">
                  <p className="text-slate-600">Loading bookings...</p>
                </div>
              ) : newRequests.length === 0 ? (
                <div className="py-8 rounded-lg bg-blue-50 border border-blue-200 text-center">
                  <p className="text-slate-600">No new booking requests at this moment.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {newRequests.map((booking) => (
                    <div key={booking._id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{booking.serviceType || "Service Request"}</h3>
                          <p className="text-sm text-slate-600 mt-1">
                            📍 {booking.address || "Location: To be confirmed"}
                          </p>
                          <p className="text-sm text-slate-500 mt-1">
                            🕐 {formatDate(booking.bookingTime || booking.createdAt)}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${statusPillClass(booking.status)}`}>
                          {booking.status?.toUpperCase() || "PENDING"}
                        </div>
                      </div>

                      {booking.description && (
                        <div className="mb-3 rounded-lg bg-slate-50 p-3">
                          <p className="text-sm text-slate-700">
                            <strong>Issue:</strong> {booking.description}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => takeBookingAction(booking._id, "accept")}
                          disabled={actionLoadingId === `${booking._id}:accept`}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
                        >
                          {actionLoadingId === `${booking._id}:accept` ? "Accepting..." : "✓ Accept"}
                        </button>
                        <button
                          onClick={() => takeBookingAction(booking._id, "reject")}
                          disabled={actionLoadingId === `${booking._id}:reject`}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition"
                        >
                          {actionLoadingId === `${booking._id}:reject` ? "Rejecting..." : "✕ Reject"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeSection === "work-progress" && !vendorApproved && (
            <section className="rounded-2xl bg-white/95 p-5 shadow-xl ring-1 ring-slate-100 border border-slate-100">
              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
                <p className="text-sm font-semibold text-amber-900">
                  ✓ This section will be available once your vendor account is approved by admin.
                </p>
              </div>
            </section>
          )}

          {activeSection === "work-progress" && vendorApproved && (
            <VendorWorkInProgress />
          )}

          {activeSection === "completed-tasks" && !vendorApproved && (
            <section className="rounded-2xl bg-white/95 p-5 shadow-xl ring-1 ring-slate-100 border border-slate-100">
              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
                <p className="text-sm font-semibold text-amber-900">
                  ✓ This section will be available once your vendor account is approved by admin.
                </p>
              </div>
            </section>
          )}

          {activeSection === "completed-tasks" && vendorApproved && (
            <VendorCompletedTasks />
          )}

          {activeSection === "service-request-history" && !vendorApproved && (
            <section className="rounded-2xl bg-white/95 p-5 shadow-xl ring-1 ring-slate-100 border border-slate-100">
              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
                <p className="text-sm font-semibold text-amber-900">
                  ✓ This section will be available once your vendor account is approved by admin.
                </p>
              </div>
            </section>
          )}

          {activeSection === "service-request-history" && vendorApproved && (
            <ServiceRequestHistory />
          )}

          {activeSection === "history" && !vendorApproved && (
            <section className="rounded-2xl bg-white/95 p-5 shadow-xl ring-1 ring-slate-100 border border-slate-100">
              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
                <p className="text-sm font-semibold text-amber-900">
                  ✓ This section will be available once your vendor account is approved by admin.
                </p>
              </div>
            </section>
          )}

          {activeSection === "history" && vendorApproved && (
            <section className="rounded-2xl bg-white/95 p-5 shadow-xl ring-1 ring-slate-100 border border-slate-100 space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">Service Requests History</h2>
              {loadingBookings ? (
                <div className="py-8 text-center">
                  <p className="text-slate-600">Loading bookings...</p>
                </div>
              ) : serviceRequests.length === 0 ? (
                <div className="py-8 rounded-lg bg-blue-50 border border-blue-200 text-center">
                  <p className="text-slate-600">No service requests in history.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {serviceRequests.map((booking) => (
                    <div key={booking._id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{booking.serviceType || "Service"}</h3>
                          <p className="text-sm text-slate-600 mt-1">
                            📍 {booking.address || "Location confirmed"}
                          </p>
                          <p className="text-sm text-slate-500 mt-1">
                            🕐 {formatDate(booking.bookingTime || booking.createdAt)}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${statusPillClass(booking.status)}`}>
                          {booking.status?.toUpperCase() || "UNKNOWN"}
                        </div>
                      </div>
                      {booking.description && (
                        <p className="text-xs text-slate-600 mt-2">
                          <strong>Details:</strong> {booking.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeSection === "reviews" && !vendorApproved && (
            <section className="rounded-2xl bg-white/95 p-5 shadow-xl ring-1 ring-amber-50 border border-amber-50">
              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
                <p className="text-sm font-semibold text-amber-900">
                  ✓ This section will be available once your vendor account is approved by admin.
                </p>
              </div>
            </section>
          )}

          {activeSection === "reviews" && vendorApproved && (
            <section className="rounded-2xl bg-white/95 p-5 shadow-xl ring-1 ring-emerald-100 border border-emerald-50 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Customer Reviews</h2>
                  <p className="text-sm text-slate-600 mt-1">Overall Rating: <strong className="text-lg text-amber-600">★ {avgRating.toFixed(1)}</strong></p>
                </div>
              </div>
              {reviews.length === 0 ? (
                <div className="py-8 rounded-lg bg-blue-50 border border-blue-200 text-center">
                  <p className="text-slate-600">No reviews yet. Great work!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{review.user?.name || "Customer"}</p>
                          <p className="text-sm text-slate-500">★ {review.rating || 5} stars</p>
                        </div>
                        <p className="text-xs text-slate-500">{formatDate(review.createdAt)}</p>
                      </div>
                      <p className="text-slate-700">{review.review}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeSection === "notifications" && !vendorApproved && (
            <section className="rounded-2xl bg-white/95 p-5 shadow-xl ring-1 ring-emerald-50 border border-emerald-50">
              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
                <p className="text-sm font-semibold text-amber-900">
                  ✓ This section will be available once your vendor account is approved by admin.
                </p>
              </div>
            </section>
          )}

          {activeSection === "notifications" && vendorApproved && (
            <section className="rounded-2xl bg-white/95 p-5 shadow-xl ring-1 ring-indigo-100 border border-indigo-50 space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">Recent Notifications</h2>
              {notifications.length === 0 ? (
                <div className="py-8 rounded-lg bg-blue-50 border border-blue-200 text-center">
                  <p className="text-slate-600">No notifications at this moment.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notif) => (
                    <div key={notif.id} className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 transition">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 text-lg">
                          {notif.type === "booking" ? "📅" : notif.type === "message" ? "💬" : "🔔"}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{notif.title || notif.message}</p>
                          {notif.description && (
                            <p className="text-sm text-slate-600 mt-1">{notif.description}</p>
                          )}
                          <p className="text-xs text-slate-500 mt-2">
                            {formatDate(notif.timestamp || new Date().toISOString())}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}

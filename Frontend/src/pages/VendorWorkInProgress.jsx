import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { createSocket, disconnectSocket } from "../lib/socket";
import { useAuth } from "../context/AuthContext";
import { MapContainer, TileLayer, Marker, Polyline, useMap, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Calculate ETA (simple distance-based estimate)
// Assumes average speed of 25 km/h for service professionals
function calculateETA(vendorLocation, userLocation) {
  if (!vendorLocation || !userLocation) return null;
  
  const R = 6371; // Earth's radius in km
  const dLat = ((userLocation.lat - vendorLocation.lat) * Math.PI) / 180;
  const dLng = ((userLocation.lng - vendorLocation.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((vendorLocation.lat * Math.PI) / 180) *
      Math.cos((userLocation.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  // Average speed: 25 km/h (urban service professional)
  const avgSpeed = 25;
  const timeMinutes = Math.ceil((distance / avgSpeed) * 60);
  
  return { distance: distance.toFixed(1), timeMinutes };
}

function BookingCard({ booking, onStatusChange, vendorLocation }) {
  const [map, setMap] = useState(null);
  // map variable intentionally prefixed to avoid unused var lint
  const [_map, _setMap] = [map, setMap];
  const [eta, setEta] = useState(null);
  const [updating, setUpdating] = useState(false);

  const userLocation = booking.location?.coordinates
    ? { lng: booking.location.coordinates[0], lat: booking.location.coordinates[1] }
    : null;

  const providerLocation = vendorLocation || 
    (booking.providerLiveLocation?.coordinates
      ? { lng: booking.providerLiveLocation.coordinates[0], lat: booking.providerLiveLocation.coordinates[1] }
      : null);

  const token = localStorage.getItem("token");

  // Calculate ETA periodically
  useEffect(() => {
    if (providerLocation && userLocation) {
      const newEta = calculateETA(providerLocation, userLocation);
      setEta(newEta);
    }
  }, [providerLocation, userLocation]);

  const statusColors = {
    pending: "bg-amber-100 text-amber-800",
    accepted: "bg-blue-100 text-blue-800",
    on_the_way: "bg-cyan-100 text-cyan-800",
    in_progress: "bg-indigo-100 text-indigo-800",
    completion_requested: "bg-amber-100 text-amber-800",
    completed: "bg-emerald-100 text-emerald-800",
  };

  const nextStatus = {
    accepted: "on_the_way",
    on_the_way: "in_progress",
    in_progress: "completion_requested",
  };

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      if (newStatus === "finalize") {
        await apiFetch(`/api/bookings/${booking._id}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }, token);
      } else {
        await apiFetch(`/api/bookings/${booking._id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }, token);
      }

      if (onStatusChange) {
        onStatusChange();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const MapComponent = () => {
    const map = useMap();
    
    useEffect(() => {
      if (providerLocation && userLocation) {
        const points = [[providerLocation.lat, providerLocation.lng], [userLocation.lat, userLocation.lng]];
        map.fitBounds(points, { padding: [40, 40] });
      }
    }, [map, providerLocation, userLocation]);

    return null;
  };

  return (
    <div className="rounded-2xl bg-white shadow-lg ring-1 ring-slate-100/80 overflow-hidden hover:shadow-xl transition">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 border-b border-slate-200">
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
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColors[booking.status] || statusColors.pending}`}>
              {booking.status.replace("_", " ")}
            </span>
            <p className="text-xs text-slate-500 mt-2">
              {new Date(booking.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Map & Info Grid */}
      <div className="grid md:grid-cols-2 gap-4 p-4">
        {/* Map */}
        <div className="rounded-lg overflow-hidden border border-slate-200 h-64">
          {providerLocation && userLocation ? (
            <MapContainer center={[userLocation.lat, userLocation.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              
              {/* Vendor Location */}
              <Marker
                position={[providerLocation.lat, providerLocation.lng]}
                icon={L.icon({
                  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                })}
              >
                <Popup>Your Location</Popup>
              </Marker>

              {/* User Location */}
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={L.divIcon({
                  className: "customer-pin",
                  html: `<div style="background:#0ea5e9;color:white;padding:6px 8px;border-radius:12px;font-size:11px;font-weight:700;box-shadow:0 6px 12px rgba(14,165,233,0.25)">Customer</div>`,
                  iconAnchor: [16, 16],
                })}
              >
                <Popup>{booking.user?.name || "Customer Location"}</Popup>
              </Marker>

              {/* Route Line */}
              <Polyline
                positions={[
                  [providerLocation.lat, providerLocation.lng],
                  [userLocation.lat, userLocation.lng],
                ]}
                color="#0ea5e9"
                weight={3}
                opacity={0.7}
              />
              
              <MapComponent />
            </MapContainer>
          ) : (
            <div className="h-64 flex items-center justify-center bg-slate-50 text-slate-500">
              Waiting for location data...
            </div>
          )}
        </div>

        {/* Info & ETA */}
        <div className="space-y-3">
          {/* ETA */}
          <div className="rounded-lg bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-200 p-4">
            <p className="text-xs font-semibold text-sky-600 uppercase">⏱️ ESTIMATED TIME</p>
            {eta ? (
              <>
                <p className="text-2xl font-bold text-sky-900 mt-2">{eta.timeMinutes} mins</p>
                <p className="text-xs text-sky-700 mt-1">Distance: {eta.distance} km</p>
              </>
            ) : (
              <p className="text-sm text-sky-600 mt-2">Calculating...</p>
            )}
          </div>

          {/* Address */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-600 uppercase">📍 DELIVERY ADDRESS</p>
            <p className="text-sm text-slate-900 mt-2 line-clamp-2">
              {booking.address || "Address not provided"}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {booking.user?.defaultAddress || ""}
            </p>
          </div>

          {/* Status Actions */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-600 uppercase">NEXT ACTION</p>
            {booking.status === "completion_requested" ? (
              <div className="mt-2">
                <p className="text-sm text-amber-700 font-medium">⏳ Awaiting User Approval</p>
                <p className="text-xs text-amber-600 mt-2">The user will review your work and approve or request revisions. You'll be notified once they respond.</p>
              </div>
            ) : nextStatus[booking.status] ? (
              <button
                onClick={() => handleStatusChange(nextStatus[booking.status])}
                disabled={updating}
                className="w-full mt-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 font-semibold text-white hover:shadow-lg transition disabled:opacity-50"
              >
                {updating ? "Updating..." : `Mark as ${nextStatus[booking.status].replace("_", " ")}`}
              </button>
            ) : booking.status === "completed" ? (
              <p className="text-sm text-emerald-600 font-medium mt-2">✓ Task completed and approved</p>
            ) : (
              <p className="text-sm text-slate-500 mt-2">✓ Task completed</p>
            )}
          </div>

          {/* Order Details */}
          {booking.totalAmount && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-xs font-semibold text-emerald-600 uppercase">💰 BOOKING VALUE</p>
              <p className="text-lg font-bold text-emerald-900 mt-2">
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: booking.currency || "INR",
                }).format(booking.totalAmount)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="border-t border-slate-200 px-4 py-3 bg-slate-50">
        <div className="grid grid-cols-5 gap-2 text-center">
          {["accepted", "on_the_way", "in_progress", "completion_requested", "completed"].map((stage, idx) => {
            const stageOrder = ["accepted", "on_the_way", "in_progress", "completion_requested", "completed"];
            const currentStageIndex = stageOrder.indexOf(booking.status);
            const isActive = stageOrder.indexOf(stage) <= currentStageIndex;
            return (
              <div key={stage} className="flex flex-col items-center">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  isActive ? "bg-blue-600 text-white" : "bg-slate-300 text-slate-600"
                }`}>
                  {idx + 1}
                </div>
                <p className="text-xs text-slate-600 mt-1">{stage.replace("_", " ")}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function VendorWorkInProgress() {
  const auth = useAuth();
  const token = auth?.token || localStorage.getItem("token");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [liveLocations, setLiveLocations] = useState({});
  const [locationTrackingEnabled, setLocationTrackingEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const geolocationRef = useRef(null);

  // Fetch initial data
  useEffect(() => {
    if (auth?.user?.role !== "vendor") {
      navigate("/login");
      return;
    }

    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [bookingsData, statsData] = await Promise.all([
          apiFetch("/api/bookings/vendor/work-in-progress", {}, token),
          apiFetch("/api/bookings/vendor/dashboard/stats", {}, token),
        ]);
        
        if (mounted) {
          setBookings(Array.isArray(bookingsData) ? bookingsData : []);
          setStats(statsData || {});
        }
      } catch (err) {
        console.error("Failed to fetch bookings", err);
        if (mounted) setBookings([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token, auth?.user?.role, navigate]);

  // Real-time location tracking
  useEffect(() => {
    if (!locationTrackingEnabled || !bookings.length) return;

    // Request geolocation permission
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported");
      setLocationTrackingEnabled(false);
      return;
    }

    // Watch position and update every 10 seconds
    geolocationRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });

        // Send location to server for each active booking
        bookings.forEach((booking) => {
          if (["accepted", "on_the_way", "in_progress"].includes(booking.status)) {
            apiFetch(`/api/bookings/${booking._id}/update-location`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lat: latitude, lng: longitude }),
            }, token).catch((err) => {
              console.error("Failed to update location:", err);
            });
          }
        });
      },
      (error) => {
        console.warn("Geolocation error:", error);
        alert("Please enable location access for real-time tracking");
        setLocationTrackingEnabled(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => {
      if (geolocationRef.current) {
        navigator.geolocation.clearWatch(geolocationRef.current);
      }
    };
  }, [locationTrackingEnabled, bookings, token]);

  // Real-time socket updates
  useEffect(() => {
    const socket = createSocket(token);
    socketRef.current = socket;

    // Join vendor room to get notifications
    if (auth?.user?._id) {
      socket.emit("joinUser", { userId: auth.user._id });
    }

    // Listen for booking updates
    const handleBookingUpdate = (data) => {
      setBookings((prev) =>
        prev.map((b) =>
          String(b._id) === String(data.bookingId)
            ? { ...b, status: data.status, updatedAt: data.updatedAt }
            : b
        )
      );
      
      // Refresh stats
      (async () => {
        try {
          const newStats = await apiFetch("/api/bookings/vendor/dashboard/stats", {}, token);
          setStats(newStats || {});
        } catch (err) {
          console.error("Failed to refresh stats", err);
        }
      })();
    };

    // Listen for provider location updates
    const handleProviderLocation = (data) => {
      if (data?.bookingId && data?.lng !== undefined && data?.lat !== undefined) {
        setLiveLocations((prev) => ({
          ...prev,
          [String(data.bookingId)]: { lng: data.lng, lat: data.lat },
        }));
      }
    };

    socket.on("booking:update", handleBookingUpdate);
    socket.on("providerLocationUpdate", handleProviderLocation);

    return () => {
      socket.off("booking:update", handleBookingUpdate);
      socket.off("providerLocationUpdate", handleProviderLocation);
      disconnectSocket();
    };
  }, [token, auth?.user?._id]);

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
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Work In Progress</p>
            <h1 className="text-4xl font-bold text-slate-900 mt-2">Active Tasks</h1>
            <p className="text-sm text-slate-600 mt-2">
              Track your active bookings in real-time with live location updates and ETA
            </p>
          </div>
          {bookings.length > 0 && (
            <button
              onClick={() => setLocationTrackingEnabled(!locationTrackingEnabled)}
              className={`rounded-lg px-4 py-2.5 font-semibold text-white transition whitespace-nowrap ${
                locationTrackingEnabled
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {locationTrackingEnabled ? "🛑 Stop Tracking" : "📍 Start Live Tracking"}
            </button>
          )}
          {currentLocation && locationTrackingEnabled && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
              <p className="text-green-700 font-semibold">✓ Location Shared</p>
              <p className="text-xs text-green-600 mt-1">
                {currentLocation.lat.toFixed(3)}, {currentLocation.lng.toFixed(3)}
              </p>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { status: "pending", label: "Pending", color: "amber" },
            { status: "accepted", label: "Accepted", color: "blue" },
            { status: "on_the_way", label: "On The Way", color: "cyan" },
            { status: "in_progress", label: "In Progress", color: "indigo" },
            { status: "completed", label: "Completed", color: "emerald" },
          ].map((item) => (
            <div key={item.status} className={`rounded-lg bg-${item.color}-50 border border-${item.color}-200 p-4 text-center`}>
              <p className={`text-2xl font-bold text-${item.color}-900`}>
                {stats[item.status] || 0}
              </p>
              <p className={`text-xs font-semibold text-${item.color}-700 mt-1 uppercase`}>
                {item.label}
              </p>
            </div>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="text-slate-600 mt-4">Loading active tasks...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center">
            <p className="text-slate-500 text-lg">✓ No active tasks</p>
            <p className="text-slate-400 mt-2">All your pending tasks are completed!</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {bookings.map((booking) => (
              <BookingCard
                key={booking._id}
                booking={booking}
                vendorLocation={liveLocations[String(booking._id)]}
                onStatusChange={() => {
                  // Refresh bookings after status change
                  (async () => {
                    try {
                      const data = await apiFetch("/api/bookings/vendor/work-in-progress", {}, token);
                      setBookings(Array.isArray(data) ? data : []);
                    } catch (err) {
                      console.error("Failed to refresh bookings", err);
                    }
                  })();
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

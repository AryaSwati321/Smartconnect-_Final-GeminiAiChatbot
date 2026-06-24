import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { createSocket, disconnectSocket } from "../lib/socket";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const trackingStages = [
  "pending",
  "accepted",
  "on_the_way",
  "in_progress",
  "completion_requested",
  "completed",
];

function normalizeStatus(status) {
  if (!status) return "pending";
  return String(status).toLowerCase();
}

export default function Tracking() {
  const { id } = useParams();
  const auth = useAuth();
  const token = auth?.token || localStorage.getItem("token");
  

  const [booking, setBooking] = useState(null);
  const [status, setStatus] = useState("pending");
  const [providerLocation, setProviderLocation] = useState(null);
  const [providerPhone, setProviderPhone] = useState(null);
  const [phoneCopied, setPhoneCopied] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiFetch(`/api/bookings/${id}`, {}, token);
        if (!mounted) return;
        setBooking(data);
        setStatus(normalizeStatus(data?.status));

        if (data?.providerLiveLocation?.coordinates?.length === 2) {
          setProviderLocation({
            lat: data.providerLiveLocation.coordinates[1],
            lng: data.providerLiveLocation.coordinates[0],
          });
        }

        // Get provider phone number
        if (data?.vendor?._id) {
          try {
            const providerData = await apiFetch(`/api/providers/${data.vendor._id}`, {}, token);
            setProviderPhone(providerData?.phone || providerData?.mobile);
          } catch {
            console.log("Could not fetch provider phone");
          }
        }
      } catch {
        if (mounted) setBooking(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, token]);

  useEffect(() => {
    const socket = createSocket(token);
    socket.emit("joinBookingRoom", { bookingId: id });

    const onBookingUpdate = (data) => {
      if (!data || String(data.bookingId) !== String(id)) return;
      setStatus(normalizeStatus(data.status));
      setBooking((prev) => ({ ...(prev || {}), ...data }));
      if (data.providerLiveLocation) setProviderLocation(data.providerLiveLocation);
    };

    const onProviderLocation = (data) => {
      if (!data || String(data.bookingId) !== String(id)) return;
      setProviderLocation({ lat: data.lat, lng: data.lng });
      setStatus((current) =>
        ["in_progress", "completion_requested", "completed"].includes(current)
          ? current
          : "on_the_way"
      );
    };

    socket.on("booking:update", onBookingUpdate);
    socket.on("providerLocationUpdate", onProviderLocation);

    return () => {
      socket.off("booking:update", onBookingUpdate);
      socket.off("providerLocationUpdate", onProviderLocation);
      disconnectSocket();
    };
  }, [id, token]);

  const currentStageIndex = useMemo(() => {
    const idx = trackingStages.indexOf(normalizeStatus(status));
    return idx >= 0 ? idx : 0;
  }, [status]);

  const customerLocation = useMemo(() => {
    const coords = booking?.location?.coordinates;
    if (Array.isArray(coords) && coords.length === 2) return { lng: coords[0], lat: coords[1] };
    return null;
  }, [booking]);

  const mapCenter = providerLocation || customerLocation || { lat: 18.5204, lng: 73.8567 };
  const pathLine = providerLocation && customerLocation ? [providerLocation, customerLocation] : [];

  const Recenter = () => {
    const map = useMap();
    useEffect(() => {
      if (providerLocation || customerLocation) {
        const points = [providerLocation, customerLocation].filter(Boolean).map((p) => [p.lat, p.lng]);
        if (points.length === 1) {
          map.flyTo(points[0], 14, { duration: 0.6 });
        } else if (points.length === 2) {
          map.fitBounds(points, { padding: [40, 40] });
        }
      }
    }, [providerLocation, customerLocation, map]);
    return null;
  };

  const providerIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  const customerIcon = L.divIcon({
    className: "customer-pin",
    html: `<div style="background:#0ea5e9;color:white;padding:6px 8px;border-radius:12px;font-size:12px;font-weight:700;box-shadow:0 6px 12px rgba(14,165,233,0.25)">You</div>`,
    iconAnchor: [16, 16],
  });

  const handleChatSupport = () => {
    // Open chat support modal
    setShowChatModal(true);
  };

  const handleCallProvider = () => {
    if (!providerPhone) {
      alert("Provider phone number not available. Please try again.");
      return;
    }

    // Copy phone to clipboard
    navigator.clipboard.writeText(providerPhone).then(() => {
      setPhoneCopied(true);
      setTimeout(() => setPhoneCopied(false), 2000);
      
      // Show alert with phone number
      alert(`📱 Provider Contact: ${providerPhone}\n\nNumber copied to clipboard! You can paste it in your dialer.`);
    }).catch(() => {
      alert(`📱 Provider Phone Number: ${providerPhone}\n\nPlease save this number to contact the vendor.`);
    });
  };

  const handleConfirmCompletion = async () => {
    try {
      const updated = await apiFetch(`/api/bookings/${id}/confirm-completion`, {
        method: "POST",
      }, token);
      setBooking(updated);
      setStatus(normalizeStatus(updated?.status));
      alert("Service completion approved! The booking is now complete.");
    } catch (err) {
      alert(err.message || "Failed to approve completion");
    }
  };

  const [rejectionReason, setRejectionReason] = useState("");
  const [handlingRejection, setHandlingRejection] = useState(false);

  const handleRejectCompletion = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for requesting revision");
      return;
    }

    setHandlingRejection(true);
    try {
      const updated = await apiFetch(`/api/bookings/${id}/reject-completion`, {
        method: "POST",
        body: { reason: rejectionReason },
      }, token);
      setBooking(updated);
      setStatus(normalizeStatus(updated?.status));
      setRejectionReason("");
      alert("Revision request sent. The vendor will work on addressing the issues.");
    } catch (err) {
      alert(err.message || "Failed to reject completion");
    } finally {
      setHandlingRejection(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 opacity-50 [background:radial-gradient(700px_at_20%_20%,rgba(56,189,248,0.18),transparent),radial-gradient(600px_at_80%_10%,rgba(16,185,129,0.16),transparent)]" />
      <div className="relative mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-sky-200">Live Tracking</p>
            <h1 className="text-3xl font-bold text-white drop-shadow-sm">Booking #{id}</h1>
            <p className="text-sm text-slate-200/80">
              Service: {booking?.serviceType || booking?.category?.name || "N/A"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400/20 to-sky-400/20 px-4 py-2 text-sm font-semibold text-emerald-100 border border-white/20 shadow-lg backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
              {status.replace("_", " ")}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-slate-200 border border-white/20 shadow-sm backdrop-blur">
              {booking?.createdAt ? new Date(booking.createdAt).toLocaleString() : ""}
            </span>
          </div>
        </div>

        <div className="rounded-3xl bg-white/95 backdrop-blur shadow-2xl ring-1 ring-white/40 p-6 space-y-6">
          <div className="grid gap-3 md:grid-cols-5">
            {trackingStages.map((stage, index) => {
              const done = index <= currentStageIndex;
              return (
                <div
                  key={stage}
                  className={`rounded-xl border p-3 text-center text-sm font-semibold uppercase tracking-wide transition ${
                    done
                      ? "bg-gradient-to-r from-emerald-100 to-sky-100 border-emerald-200 text-emerald-800 shadow-sm"
                      : "bg-slate-50 text-slate-500 border-slate-200"
                  }`}
                >
                  {stage.replace(/_/g, " ")}
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl bg-white shadow-lg ring-1 ring-slate-200 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">Current Status</p>
              <p className="text-xl font-semibold text-slate-900 mt-1">{status.replace(/_/g, " ")}</p>
              <p className="text-xs text-slate-500 mt-2">
                Service: {booking?.serviceType || booking?.category?.name || "N/A"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Requested: {booking?.createdAt ? new Date(booking.createdAt).toLocaleString() : "N/A"}
              </p>
            </div>

            {status === "completion_requested" && auth?.user?.role === "user" ? (
              <div className="rounded-2xl bg-emerald-50 shadow-lg ring-1 ring-emerald-200 p-5">
                <p className="text-xs uppercase tracking-wide text-emerald-700 mb-2">✓ Service Completion Request</p>
                <p className="text-sm text-emerald-900 mb-4">
                  The vendor has completed the work. Please review and approve or request further revisions.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Reason for Revision (if rejecting)
                    </label>
                    <textarea
                      rows={3}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full rounded-lg border border-emerald-300 px-3 py-2 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 bg-white"
                      placeholder="Explain what work needs to be completed or improved"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleConfirmCompletion}
                      className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      ✓ Approve & Complete
                    </button>
                    <button
                      onClick={handleRejectCompletion}
                      disabled={!rejectionReason.trim() || handlingRejection}
                      className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-60"
                    >
                      ✕ {handlingRejection ? "Sending..." : "Request Revision"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className={`rounded-2xl bg-white shadow-lg ring-1 ring-slate-200 p-5 ${
              status === "completion_requested" && auth?.user?.role === "user" ? "" : "lg:col-span-2"
            }`}>
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-slate-500">Live Map</p>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
                  Real-time updates
                </span>
              </div>
              <div className="mt-3 h-80 overflow-hidden rounded-2xl border border-slate-200 shadow-inner">
                <MapContainer
                  center={mapCenter}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                  whenCreated={(map) => (mapRef.current = map)}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Recenter />
                  {customerLocation ? (
                    <Marker position={customerLocation} icon={customerIcon} />
                  ) : null}
                  {providerLocation ? (
                    <Marker position={providerLocation} icon={providerIcon} />
                  ) : null}
                  {pathLine.length === 2 ? (
                    <Polyline positions={pathLine} color="#0ea5e9" weight={4} opacity={0.7} />
                  ) : null}
                </MapContainer>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-sky-500" /> You
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" /> Provider
                </div>
                <div className="text-xs text-slate-500">
                  Map pans and zooms automatically as live updates arrive.
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white p-4 shadow-lg">
              <p className="text-xs uppercase tracking-wide opacity-80">Support</p>
              <p className="text-lg font-semibold">Need help?</p>
              <p className="text-sm opacity-90">Chat with support or call your provider if you face delays.</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleChatSupport}
                  className="rounded-lg bg-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/30 transition"
                >
                  💬 Chat Support
                </button>
                <button
                  onClick={handleCallProvider}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    phoneCopied
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-white text-sky-700 hover:bg-slate-100"
                  }`}
                >
                  {phoneCopied ? "✓ Copied" : "📞 Call Provider"}
                </button>
              </div>
            </div>
            <div className="rounded-2xl bg-white shadow ring-1 ring-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Payment</p>
              <p className="text-sm text-slate-700">Pay after completion or as agreed with the provider.</p>
            </div>
            <div className="rounded-2xl bg-white shadow ring-1 ring-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Safety</p>
              <p className="text-sm text-slate-700">Verify provider details on arrival and share feedback after service.</p>
            </div>
          </div>
        </div>

        {/* Chat Modal */}
        {showChatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-2xl mx-4 rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 p-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">💬 Chat Support</h2>
                  <p className="text-sm text-slate-600 mt-1">Get instant help from our AI assistant</p>
                </div>
                <button
                  onClick={() => setShowChatModal(false)}
                  className="text-2xl text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <p className="text-slate-700 mb-4">
                  Our AI assistant is available 24/7 to help with booking, tracking, and other service-related queries.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowChatModal(false);
                      // Scroll to chatbot or trigger chatbot opening
                      const chatbotBtn = document.querySelector('.chatbot-launcher');
                      if (chatbotBtn) chatbotBtn.click();
                    }}
                    className="flex-1 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-3 font-semibold text-white hover:from-sky-600 hover:to-indigo-700"
                  >
                    Open Chat
                  </button>
                  <button
                    onClick={() => setShowChatModal(false)}
                    className="flex-1 rounded-lg bg-slate-100 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

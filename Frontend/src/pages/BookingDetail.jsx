// src/pages/BookingDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function BookingDetail() {
  const { id } = useParams();
  const auth = useAuth();
  const token = auth?.token || auth?.user?.token || localStorage.getItem("token");
  const userRole = auth?.user?.role || "user";
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [photos, setPhotos] = useState([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [handlingBooking, setHandlingBooking] = useState(false);
  const [completionRejectionReason, setCompletionRejectionReason] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch(`/api/bookings/${id}`, {}, token);
        if (mounted) setBooking(data);
      } catch {
        try {
          const all = await apiFetch("/api/bookings", {}, token);
          const arr = Array.isArray(all) ? all : all.bookings || [];
          const found = arr.find((x) => x._id === id || x.id === id);
          if (mounted) setBooking(found || null);
        } catch {
          if (mounted) setBooking(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id, token]);

  async function handleAcceptBooking() {
    if (!booking) return;
    setHandlingBooking(true);
    try {
      const res = await apiFetch(
        `/api/bookings/${booking._id}/accept`,
        { method: "POST" },
        token
      );
      alert("Booking accepted!");
      setBooking(res);
    } catch (err) {
      alert(err.message || "Failed to accept booking");
    } finally {
      setHandlingBooking(false);
    }
  }

  async function handleRejectBooking() {
    if (!booking) return;
    if (!rejectionReason.trim()) return alert("Please provide a reason for rejection");
    
    setHandlingBooking(true);
    try {
      const res = await apiFetch(
        `/api/bookings/${booking._id}/reject`,
        { method: "POST", body: { reason: rejectionReason } },
        token
      );
      alert("Booking rejected!");
      setBooking(res);
      setRejectionReason("");
    } catch (err) {
      alert(err.message || "Failed to reject booking");
    } finally {
      setHandlingBooking(false);
    }
  }

  async function handleConfirmCompletion() {
    if (!booking) return;

    setHandlingBooking(true);
    try {
      const res = await apiFetch(
        `/api/bookings/${booking._id || booking.id}/confirm-completion`,
        { method: "POST" },
        token
      );
      alert("Service completion approved! The booking is now complete.");
      setBooking(res);
    } catch (err) {
      alert(err.message || "Failed to approve completion");
    } finally {
      setHandlingBooking(false);
    }
  }

  async function handleRejectCompletion() {
    if (!booking) return;
    if (!completionRejectionReason.trim()) return alert("Please provide a reason for rejection");

    setHandlingBooking(true);
    try {
      const res = await apiFetch(
        `/api/bookings/${booking._id || booking.id}/reject-completion`,
        { method: "POST", body: { reason: completionRejectionReason } },
        token
      );
      alert("Completion request rejected. The vendor can resubmit after addressing the issues.");
      setBooking(res);
      setCompletionRejectionReason("");
    } catch (err) {
      alert(err.message || "Failed to reject completion");
    } finally {
      setHandlingBooking(false);
    }
  }

  function formatStatus(status) {
    return String(status || "pending").replace(/_/g, " ");
  }

  if (loading) return <div className="p-6">Loading booking...</div>;
  if (!booking) return <div className="p-6">Booking not found.</div>;

  const bookingId = booking._id || booking.id;
  const provider =
    booking.assignedProvider || booking.provider || booking.vendor || booking.providerDetails;

  const serviceLabel =
    booking.serviceType ||
    booking.category?.name ||
    (typeof booking.category === "string" ? booking.category : "") ||
    booking.service ||
    booking.project ||
    "Service Booking";

  const addressLabel =
    booking.address?.line ||
    (typeof booking.address === "string" ? booking.address : "") ||
    (Array.isArray(booking.location?.coordinates)
      ? booking.location.coordinates.join(", ")
      : "Address not available");

  const preferredTimeLabel = Array.isArray(booking.preferredTimes)
    ? booking.preferredTimes.join(", ")
    : booking.confirmedTime || "N/A";

  const canReview = booking.status === "completed";
  const existingRating = booking.feedback?.rating;
  const existingReview = booking.feedback?.comments;
  const isPendingVendorApproval = booking.status === "pending" && userRole === "vendor";
  const isRejected = booking.status === "rejected";
  const canConfirmCompletion = userRole === "user" && booking.status === "completion_requested";

  async function submitReview(e) {
    e.preventDefault();
    if (!canReview) return;

    setSubmittingReview(true);
    try {
      const form = new FormData();
      form.append("rating", Number(rating));
      form.append("review", review.trim());
      photos.forEach((file) => form.append("photos", file));

      const res = await apiFetch(
        `/api/bookings/${id}/review`,
        {
          method: "POST",
          body: form,
        },
        token
      );

      alert(res?.msg || "Review submitted");
      const fresh = await apiFetch(`/api/bookings/${id}`, {}, token);
      setBooking(fresh);
      setReview("");
      setPhotos([]);
    } catch (err) {
      alert(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f9ff] via-white to-[#e8f6ff] px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Booking</p>
            <h1 className="text-3xl font-bold text-slate-900">#{bookingId}</h1>
            <p className="text-sm text-slate-600">Service booking details</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gradient-to-r from-emerald-500/15 to-emerald-600/15 px-4 py-2 text-sm font-semibold text-emerald-700 border border-emerald-200 shadow-sm">
              {formatStatus(booking.status)}
            </span>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs text-slate-500 border border-slate-200 shadow-sm">
              {booking.createdAt ? new Date(booking.createdAt).toLocaleString() : ""}
            </span>
          </div>
        </div>

        {isRejected && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-5 shadow-md">
            <p className="text-sm font-semibold text-red-900 mb-2">❌ Booking Rejected</p>
            <p className="text-sm text-red-800">
              <strong>Reason:</strong> {booking.rejectionReason || "No reason provided"}
            </p>
            <p className="text-xs text-red-700 mt-2">
              Rejected on: {booking.rejectedAt ? new Date(booking.rejectedAt).toLocaleString() : "N/A"}
            </p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            {isPendingVendorApproval && (
              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-6 shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-3">⏳ Pending Your Approval</p>
                    <p className="text-sm text-blue-800 mb-4">
                      A customer has requested your service. Please review their request and decide whether to accept or reject it.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {booking.rejectionReason ? "Rejection Reason" : "Reason for Rejection (if rejecting)"}
                    </label>
                    <textarea
                      rows={3}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      disabled={booking.status !== "pending"}
                      className="w-full rounded-xl border border-blue-200 px-3 py-2 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 shadow-inner bg-white disabled:bg-slate-100"
                      placeholder="Explain why you're rejecting this booking (e.g., fully booked, area not serviceable)"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleAcceptBooking}
                      disabled={handlingBooking}
                      className="flex-1 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-white font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-60"
                    >
                      ✓ {handlingBooking ? "Processing..." : "Accept Request"}
                    </button>
                    <button
                      onClick={handleRejectBooking}
                      disabled={handlingBooking || !rejectionReason.trim()}
                      className="flex-1 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-5 py-2.5 text-white font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-60"
                    >
                      ✕ {handlingBooking ? "Processing..." : "Reject Request"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {canConfirmCompletion ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 shadow-md">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-emerald-900 mb-2">✓ Service Completion Request</p>
                    <p className="text-sm text-emerald-800">
                      The vendor has indicated that their work is complete. Please review and approve or request further work.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Reason for Rejection (if rejecting)
                    </label>
                    <textarea
                      rows={3}
                      value={completionRejectionReason}
                      onChange={(e) => setCompletionRejectionReason(e.target.value)}
                      className="w-full rounded-xl border border-emerald-200 px-3 py-2 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 shadow-inner bg-white"
                      placeholder="Explain what work needs to be completed (e.g., paint quality issues, incomplete areas)"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleConfirmCompletion}
                      disabled={handlingBooking}
                      className="flex-1 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-white font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-60"
                    >
                      ✓ {handlingBooking ? "Processing..." : "Approve & Complete"}
                    </button>
                    <button
                      onClick={handleRejectCompletion}
                      disabled={handlingBooking || !completionRejectionReason.trim()}
                      className="flex-1 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-5 py-2.5 text-white font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-60"
                    >
                      ✕ {handlingBooking ? "Processing..." : "Request Revision"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl bg-white shadow-xl ring-1 ring-slate-100/80 p-6 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Service & Address</p>
                  <h3 className="text-lg font-semibold text-slate-900">{serviceLabel}</h3>
                  <p className="mt-1 text-sm text-slate-600">{addressLabel}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Preferred Time</p>
                  <p className="text-sm text-slate-700">{preferredTimeLabel}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Provider</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {provider?.name || provider?.businessName || "Assigned provider"}
                  </p>
                  <p className="text-xs text-slate-500">{provider?.email || provider?.contact || ""}</p>
                  {["accepted", "in_progress", "on_the_way", "completion_requested"].includes(booking.status) ? (
                    <button
                      onClick={() => nav(`/tracking/${bookingId}`)}
                      className="mt-3 inline-flex items-center rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow hover:shadow-md transition"
                    >
                      Track
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {canReview ? (
              <div className="rounded-2xl bg-white shadow-xl ring-1 ring-slate-100 p-6 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Rate & Review</p>
                    <h3 className="text-xl font-semibold text-slate-900">How was your service?</h3>
                    <p className="text-sm text-slate-600">Tap a star, add a note, and drop up to 5 photos—just like shopping apps.</p>
                  </div>
                  {existingRating ? (
                    <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 border border-emerald-100 shadow-sm">
                      Submitted: {existingRating} ★{existingReview ? ` • "${existingReview}"` : ""}
                    </div>
                  ) : null}
                </div>

                <form onSubmit={submitReview} className="space-y-5">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        type="button"
                        key={value}
                        onClick={() => setRating(value)}
                        className={`text-3xl ${
                          value <= rating ? "text-amber-400 drop-shadow-md" : "text-slate-200"
                        } hover:scale-110 transition`}
                        aria-label={`${value} star`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="text-sm text-slate-600 ml-2">{rating} / 5</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Review</label>
                    <textarea
                      rows={3}
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-100 focus:border-sky-400 shadow-inner bg-slate-50"
                      placeholder="Share your service experience"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Add photos (up to 5)</label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600 hover:border-sky-300 hover:bg-white transition">
                      <span className="text-lg">📷</span>
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => setPhotos(Array.from(e.target.files || []).slice(0, 5))}
                        className="hidden"
                      />
                    </label>
                    {photos.length ? (
                      <div className="mt-3 flex flex-wrap gap-3">
                        {photos.map((file, idx) => (
                          <div
                            key={`${file.name}-${idx}`}
                            className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                            title={file.name}
                          >
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <button
                    disabled={submittingReview}
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-500 px-5 py-2.5 text-white font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-60"
                  >
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </button>
                </form>
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl bg-white shadow-lg ring-1 ring-slate-100 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">Quick recap</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                <li>Service: <strong>{serviceLabel}</strong></li>
                <li>Provider: <strong>{provider?.name || provider?.businessName || "N/A"}</strong></li>
                <li>Preferred time: {preferredTimeLabel}</li>
              </ul>
            </div>

            {booking.feedback?.photos?.length ? (
              <div className="rounded-2xl bg-white shadow-lg ring-1 ring-slate-100 p-5">
                <p className="text-sm font-semibold text-slate-900">Your uploaded photos</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {booking.feedback.photos.map((p, i) => (
                    <img
                      key={`${p}-${i}`}
                      src={`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/uploads/${p}`}
                      alt="review"
                      className="h-20 w-full rounded-lg object-cover border border-slate-200"
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

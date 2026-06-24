// src/pages/BookingForm.jsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function BookingForm() {
  const loc = useLocation();
  const navigate = useNavigate();
  const provider = loc.state?.provider;
  const category = loc.state?.category;
  const auth = useAuth();
  const token = auth?.token || auth?.user?.token || localStorage.getItem("token");

  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [preferred, setPreferred] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!address.trim()) return alert("Provide address");
    if (!provider) return alert("Please select a vendor");
    setLoading(true);
    const payload = {
      categoryId: category?._id || category?.id || null,
      vendorId: provider?._id || provider?.id || null,
      serviceType: category?.name || "Service",
      lat: parseFloat(lat) || 0,
      lng: parseFloat(lng) || 0,
      address,
      bookingTime: preferred ? new Date(preferred).toISOString() : undefined
    };
    try {
      const res = await apiFetch("/api/bookings", { method: "POST", body: payload }, token);
      const id = res._id || res.id || res.bookingId;
      alert("Booking created");
      if (id) navigate(`/booking/${id}`);
      else navigate("/dashboard");
    } catch(err) {
      console.error(err); alert(err.message || "Booking failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="p-6 min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
        <h2 className="text-2xl mb-2">Book {provider?.name ?? category?.name}</h2>
        <form onSubmit={submit} className="space-y-4">
          <input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Full address" className="w-full border p-2 rounded" />
          <div className="grid grid-cols-2 gap-2">
            <input value={lat} onChange={e=>setLat(e.target.value)} placeholder="Latitude (opt)" className="border p-2 rounded" />
            <input value={lng} onChange={e=>setLng(e.target.value)} placeholder="Longitude (opt)" className="border p-2 rounded" />
          </div>
          <input type="datetime-local" value={preferred} onChange={e=>setPreferred(e.target.value)} className="border p-2 rounded w-full" />
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} className="w-full border p-2 rounded" placeholder="Notes for provider" />
          <div className="flex gap-2">
            <button disabled={loading} className="px-4 py-2 bg-sky-600 text-white rounded">{loading ? "Creating..." : "Create booking"}</button>
            <button type="button" className="px-3 py-2 border rounded" onClick={()=>navigate(-1)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

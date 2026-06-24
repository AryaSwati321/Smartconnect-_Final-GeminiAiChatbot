import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/** A self-contained Leaflet modal that mounts the map only when open */
function MapPickerModal({ open, lat, lng, onClose, onPick }) {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    // Mount map NEW each time modal opens -> no size/invalidate problems
    const startLat = Number(lat) || 18.5204; // Pune default
    const startLng = Number(lng) || 73.8567;

    const map = L.map(mapDivRef.current, { center: [startLat, startLng], zoom: 12 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const marker = L.marker([startLat, startLng], { draggable: true }).addTo(map);

    map.on('click', (e) => marker.setLatLng(e.latlng));

    // store refs for pick handler + cleanup
    mapRef.current = map;
    markerRef.current = marker;

    // Cleanup on close/unmount
    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [open, lat, lng]);

  if (!open) return null;

  const pick = () => {
    const pos = markerRef.current.getLatLng();
    onPick({ lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 px-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[78vh] p-4 flex flex-col border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Location</p>
            <h2 className="text-lg font-semibold text-slate-900">Pin your exact spot</h2>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
        <div className="flex-1">
          <div
            ref={mapDivRef}
            className="h-full w-full rounded-xl overflow-hidden border border-slate-100 shadow-inner"
          />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={pick}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-lg shadow hover:shadow-lg transition"
          >
            Use this location
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserProfile() {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    defaultAddress: '',
    lat: '',
    lng: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const token = localStorage.getItem('token');

  const apiFetch = async (path, opts = {}) => {
    const res = await fetch(`${API_BASE}/api${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.msg || 'Request failed');
    return data;
  };

  useEffect(() => {
    (async () => {
      try {
        const me = await apiFetch('/user/me');
        setForm({
          fullName: me?.fullName ?? '',
          phone: me?.phone ?? '',
          defaultAddress: me?.defaultAddress ?? '',
          lat: me?.location?.coordinates?.[1] ?? '',
          lng: me?.location?.coordinates?.[0] ?? '',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const setMyLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setForm((f) => ({
        ...f,
        lat: coords.latitude.toFixed(6),
        lng: coords.longitude.toFixed(6),
      })),
      (err) => alert(err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        defaultAddress: form.defaultAddress.trim(),
      };
      if (form.lat && form.lng) {
        payload.lat = Number(form.lat);
        payload.lng = Number(form.lng);
      }
      const saved = await apiFetch('/user/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setForm((f) => ({
        ...f,
        fullName: saved.fullName ?? f.fullName,
        phone: saved.phone ?? f.phone,
        defaultAddress: saved.defaultAddress ?? f.defaultAddress,
        lat: saved?.location?.coordinates?.[1] ?? f.lat,
        lng: saved?.location?.coordinates?.[0] ?? f.lng,
      }));
      alert('Profile saved successfully');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!token) return <div className="p-6">Please log in to edit your profile.</div>;
  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_15%_20%,#f4f7ff,transparent_32%),radial-gradient(circle_at_85%_10%,#e5fbff,transparent_28%),linear-gradient(135deg,#fdfbff,#f1f8ff)]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-10 -top-24 h-64 w-64 bg-gradient-to-br from-indigo-100 to-cyan-100 blur-3xl opacity-60" />
        <div className="absolute right-4 bottom-0 h-72 w-72 bg-gradient-to-br from-sky-100 via-white to-emerald-100 blur-3xl opacity-70" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white font-semibold text-xl grid place-items-center shadow-lg">
              {(form.fullName || 'U')[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Profile</p>
              <h1 className="text-3xl font-bold text-slate-900">User Profile</h1>
              <p className="text-slate-600 text-sm mt-1">Keep your contact and address details current for smooth bookings.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/90 backdrop-blur border border-white/70 rounded-full px-4 py-2 shadow-sm">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-slate-600">Profile synced</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <form
            onSubmit={onSubmit}
            className="lg:col-span-2 bg-white/95 backdrop-blur border border-slate-100 rounded-2xl shadow-xl p-6 space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Contact</p>
                <p className="text-base text-slate-600">We’ll notify you on this number for booking updates.</p>
              </div>
              <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-full px-3 py-1">
                Secure & encrypted
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Full Name</label>
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={onChange}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition bg-white shadow-inner"
                  placeholder="Your name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Phone</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition bg-white shadow-inner"
                  placeholder="+91 9xxxxxxxxx"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Default Address</label>
              <textarea
                name="defaultAddress"
                value={form.defaultAddress}
                onChange={onChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-3 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition bg-white shadow-inner"
                rows={3}
                placeholder="House, street, area"
                required
              />
            </div>

            <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/80 space-y-3 shadow-inner">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={setMyLocation}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-indigo-100 bg-white text-slate-800 shadow-sm hover:-translate-y-[1px] hover:shadow transition"
                >
                  Use My GPS
                </button>
                <button
                  type="button"
                  onClick={() => setMapOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-cyan-100 bg-white text-slate-800 shadow-sm hover:-translate-y-[1px] hover:shadow transition"
                >
                  Pick on Map
                </button>
                <span className="text-sm text-slate-600">Save coordinates to match the closest providers.</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                <span className="px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm">
                  lat: {form.lat || '--'}
                </span>
                <span className="px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm">
                  lng: {form.lng || '--'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                className="bg-gradient-to-r from-indigo-600 to-cyan-500 text-white px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
              <p className="text-sm text-slate-500">Updates apply instantly for future bookings.</p>
            </div>
          </form>

          <aside className="space-y-4 lg:sticky lg:top-8">
            <div className="bg-white/95 backdrop-blur border border-slate-100 rounded-2xl shadow-lg p-5 space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">Quick tips</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Use GPS for accurate distance-based provider matches.</li>
                <li>• Keep your phone reachable for status updates.</li>
                <li>• Add a nearby landmark so providers locate you quickly.</li>
              </ul>
              <Link
                to="/search"
                className="inline-flex items-center gap-2 text-indigo-600 font-medium hover:translate-x-0.5 transition"
              >
                Find providers near me →
              </Link>
            </div>

            <div className="bg-slate-900 text-white rounded-2xl shadow-xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-white/10 grid place-items-center text-lg">i</div>
                <div>
                  <p className="text-sm text-slate-200">Need help?</p>
                  <p className="text-base font-semibold">Chat with support anytime.</p>
                </div>
              </div>
              <button
                type="button"
                className="w-full bg-white text-slate-900 rounded-xl py-2.5 font-medium hover:-translate-y-[1px] transition shadow-lg"
                onClick={() => document.querySelector('#tidio-chat')?.click?.()}
              >
                Open chat
              </button>
            </div>
          </aside>
        </div>
      </div>

      <MapPickerModal
        open={mapOpen}
        lat={form.lat}
        lng={form.lng}
        onClose={() => setMapOpen(false)}
        onPick={({ lat, lng }) => setForm((f) => ({ ...f, lat, lng }))}
      />
    </div>
  );
}

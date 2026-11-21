import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

const toLabel = (v) => (v ? String(v).replaceAll("_", " ").replace(/\b\w/g, (s) => s.toUpperCase()) : "-");
const formatCurrency = (a, c = "INR") => (a == null || Number.isNaN(Number(a)) ? "-" : new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(Number(a)));

function StatusBadge({ status }) {
  const map = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    requested: "bg-violet-100 text-violet-800 border-violet-200",
    verified: "bg-emerald-100 text-emerald-800 border-emerald-200",
    blocked: "bg-rose-100 text-rose-800 border-rose-200",
    accepted: "bg-blue-100 text-blue-800 border-blue-200",
    on_the_way: "bg-cyan-100 text-cyan-800 border-cyan-200",
    in_progress: "bg-indigo-100 text-indigo-800 border-indigo-200",
    completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-rose-100 text-rose-800 border-rose-200",
    cancelled: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${map[status] || map.cancelled}`}>{toLabel(status)}</span>;
}

function BookingActionButtons({ booking, onUpdateStatus }) {
  const { status } = booking;
  
  // Vendor controls pending/requested approval - admin cannot intervene
  if (["pending", "requested"].includes(status)) {
    return <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-200">⏳ Awaiting vendor decision</span>;
  }
  
  // Admin can only complete or cancel after vendor accepts
  if (["accepted", "on_the_way", "in_progress"].includes(status)) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onUpdateStatus(booking._id, "completed")}
          className="rounded-md bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
        >
          Complete
        </button>
        <button
          onClick={() => onUpdateStatus(booking._id, "cancelled")}
          className="rounded-md bg-rose-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-800"
        >
          Cancel
        </button>
      </div>
    );
  }
  
  // Terminal states - no actions available
  return <span className="inline-flex text-xs font-medium text-slate-500">No actions</span>;
}

function StatCard({ title, value, tone = "slate", hint }) {
  const tones = {
    slate: "from-slate-900 to-slate-700",
    blue: "from-blue-700 to-cyan-600",
    emerald: "from-emerald-700 to-teal-600",
    amber: "from-amber-700 to-orange-500",
    indigo: "from-indigo-700 to-blue-600",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/90 p-4 shadow-lg shadow-slate-300/20">
      <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br ${tones[tone] || tones.slate} opacity-20`} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value ?? "-"}</p>
      <p className="mt-1 text-xs text-slate-500">{hint || "Live metric"}</p>
    </div>
  );
}

function RevenueBars({ data = [], currency = "INR" }) {
  const maxVal = data.length ? Math.max(...data.map((x) => Number(x.revenue || 0)), 1) : 1;
  if (!data.length) return <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No revenue entries yet</p>;
  return (
    <div className="space-y-2">
      {data.map((d) => {
        const amount = Number(d.revenue || 0);
        const w = Math.max(8, Math.round((amount / maxVal) * 100));
        return (
          <div key={d.date} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">{d.date}</span>
              <span className="font-semibold text-slate-900">{formatCurrency(amount, currency)} ({d.completedBookings || 0})</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100"><div className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500" style={{ width: `${w}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyRow({ colSpan, text }) {
  return <tr><td colSpan={colSpan} className="p-8 text-center text-sm text-slate-500">{text}</td></tr>;
}

function AdminLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Login failed");
      if (!data.user || data.user.role !== "admin") throw new Error("This account is not admin");
      login(data.token, data.user);
    } catch (err) {
      alert(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_20%,#dbeafe_0%,#e2e8f0_30%,#f8fafc_70%)] p-4 sm:p-8">
      <div className="mx-auto grid max-w-5xl gap-6 rounded-3xl border border-white/40 bg-white/90 p-4 shadow-2xl sm:p-8 lg:grid-cols-2">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-800 p-8 text-white">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-100">Smart Connect</p>
          <h1 className="mt-4 text-3xl font-bold">Administration Console</h1>
          <p className="mt-3 text-sm text-cyan-100/90">Monitor users, vendors, bookings, and revenue from one secure control room.</p>
          <div className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-white/20 bg-white/10 p-3">Operational command center</div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-3">Vendor verification controls</div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-3">Booking intervention tools</div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-3">Daily revenue insights</div>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900">Admin Sign In</h2>
          <p className="mt-1 text-sm text-slate-500">Use your admin account credentials</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div><label className="mb-1 block text-sm font-semibold text-slate-700">Email</label><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none ring-cyan-300 transition focus:ring" placeholder="admin@example.com" /></div>
            <div><label className="mb-1 block text-sm font-semibold text-slate-700">Password</label><input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none ring-cyan-300 transition focus:ring" placeholder="Enter password" /></div>
            <button disabled={loading} className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Signing in..." : "Sign In"}</button>
          </form>
        </section>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [providers, setProviders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [providerStatusFilter, setProviderStatusFilter] = useState("all");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const [tab, setTab] = useState("vendors");
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryKeywords, setCategoryKeywords] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);

  const visibleProviders = useMemo(() => providerStatusFilter === "all" ? providers : providers.filter((x) => x.status === providerStatusFilter), [providers, providerStatusFilter]);
  const visibleBookings = useMemo(() => bookingStatusFilter === "all" ? bookings : bookings.filter((x) => x.status === bookingStatusFilter), [bookings, bookingStatusFilter]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, providersRes, bookingsRes, usersRes, categoriesRes] = await Promise.all([
        apiFetch("/api/admin/stats"),
        apiFetch("/api/admin/providers"),
        apiFetch("/api/admin/bookings"),
        apiFetch("/api/admin/users"),
        apiFetch("/api/categories"),
      ]);
      setStats(statsRes?.data || null);
      setProviders(providersRes?.data || []);
      setBookings(bookingsRes?.data || []);
      setUsers(usersRes?.data || []);
      setCategories(Array.isArray(categoriesRes?.categories) ? categoriesRes.categories : []);
    } catch (err) {
      alert(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const resetCategoryForm = () => {
    setCategoryName("");
    setCategoryKeywords("");
    setEditingCategoryId("");
  };

  const parseKeywords = (input) => input.split(",").map((x) => x.trim()).filter(Boolean);

  const upsertCategory = async () => {
    const name = categoryName.trim();
    if (!name) return alert("Category name is required");
    setCategoryBusy(true);
    try {
      const payload = { name, keywords: parseKeywords(categoryKeywords) };
      if (editingCategoryId) {
        await apiFetch(`/api/categories/${editingCategoryId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/api/categories", { method: "POST", body: JSON.stringify(payload) });
      }
      resetCategoryForm();
      await loadAll();
    } catch (err) {
      alert(err.message || "Failed to save category");
    } finally {
      setCategoryBusy(false);
    }
  };

  const editCategory = (cat) => {
    setEditingCategoryId(cat._id);
    setCategoryName(cat.name || "");
    setCategoryKeywords(Array.isArray(cat.keywords) ? cat.keywords.join(", ") : "");
    setTab("categories");
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    setCategoryBusy(true);
    try {
      await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
      if (editingCategoryId === id) resetCategoryForm();
      await loadAll();
    } catch (err) {
      alert(err.message || "Failed to delete category");
    } finally {
      setCategoryBusy(false);
    }
  };

  const seedDefaults = async () => {
    setCategoryBusy(true);
    try {
      await apiFetch("/api/categories/seed-defaults", { method: "POST" });
      await loadAll();
      setTab("categories");
    } catch (err) {
      alert(err.message || "Failed to add default categories");
    } finally {
      setCategoryBusy(false);
    }
  };

  const updateVendorStatus = async (id, status) => {
    try { await apiFetch(`/api/admin/providers/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }); await loadAll(); }
    catch (err) { alert(err.message || "Failed to update vendor status"); }
  };
  const removeVendor = async (id) => {
    if (!window.confirm("Remove this vendor from platform?")) return;
    try { await apiFetch(`/api/admin/providers/${id}`, { method: "DELETE" }); await loadAll(); }
    catch (err) { alert(err.message || "Failed to remove vendor"); }
  };
  const updateBookingStatus = async (id, status) => {
    try { await apiFetch(`/api/admin/bookings/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); await loadAll(); }
    catch (err) { alert(err.message || "Failed to update booking"); }
  };

  const navItems = [
    { id: "vendors", label: "Vendor Verification", count: providers.length },
    { id: "users", label: "User Management", count: users.length },
    { id: "bookings", label: "Booking Monitoring", count: bookings.length },
    { id: "categories", label: "Service Categories", count: categories.length },
    { id: "analytics", label: "Analytics", count: stats?.completedBookings || 0 },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,#dbeafe_0%,#f1f5f9_45%,#f8fafc_75%)] p-3 sm:p-5">
      <div className="mx-auto max-w-[1600px]">
        <div className="overflow-hidden rounded-3xl border border-white/40 bg-white/80 shadow-2xl">
          <div className="flex min-h-[calc(100vh-2rem)]">
              <aside className="hidden w-80 flex-col border-r border-slate-200/80 bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 px-5 py-6 text-slate-100 lg:flex">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Smart Connect</p>
             <h2 className="mt-2 text-2xl font-bold">Admin Control Room</h2>
              <p className="mt-2 text-sm text-slate-300">Real-time moderation, service reliability, and growth metrics.</p>
              <nav className="mt-8 space-y-2">
                {navItems.map((item) => (
                  <button key={item.id} onClick={() => setTab(item.id)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${tab === item.id ? "bg-white text-slate-900" : "bg-white/10 text-slate-100 hover:bg-white/20"}`}>
                    <span>{item.label}</span>
                    <span className={`rounded-md px-2 py-0.5 text-xs ${tab === item.id ? "bg-slate-200 text-slate-700" : "bg-white/20 text-slate-100"}`}>{item.count}</span>
                  </button>
                ))}
                <button onClick={seedDefaults} disabled={categoryBusy} className="mt-2 w-full rounded-xl bg-cyan-500 px-3 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60">{categoryBusy ? "Please wait..." : "Add Default Categories"}</button>
              </nav>
              <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-4 text-sm"><p className="text-xs uppercase tracking-[0.2em] text-slate-300">Current Session</p><p className="mt-2 font-semibold text-white">{user?.name || "Arya Swati"}</p><p className="text-xs text-slate-300">{user?.email || "-"}</p></div>
              <div className="mt-auto rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-xs text-emerald-100">Daily bookings: <span className="font-semibold">{stats?.dailyBookings ?? 0}</span></div>
            </aside>

            {menuOpen ? (
              <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setMenuOpen(false)}>
                <div className="h-full w-72 bg-slate-900 p-4" onClick={(e) => e.stopPropagation()}>
                  {navItems.map((item) => (
                    <button key={item.id} onClick={() => { setTab(item.id); setMenuOpen(false); }} className={`mb-2 w-full rounded-xl px-3 py-2 text-left text-sm ${tab === item.id ? "bg-white text-slate-900" : "bg-slate-800 text-slate-200"}`}>{item.label}</button>
                  ))}
                  <button onClick={seedDefaults} disabled={categoryBusy} className="mt-2 w-full rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">{categoryBusy ? "Please wait..." : "Add Defaults"}</button>
                </div>
              </div>
            ) : null}

            <main className="flex-1">
              <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                    <button onClick={() => setMenuOpen(true)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 lg:hidden">Menu</button>
                    <div><h1 className="text-xl font-bold text-slate-900">{user?.name ? `${user.name} Dashboard` : 'Admin Dashboard'}</h1><p className="text-xs text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p></div>
                  </div>
                  <div className="flex items-center gap-2"><button onClick={loadAll} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">{loading ? "Refreshing..." : "Refresh"}</button><button onClick={logout} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">Logout</button></div>
                </div>
              </header>

              <div className="p-4 sm:p-6">
                <section className="rounded-3xl border border-cyan-100 bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-800 p-5 text-white shadow-xl">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">Operations Overview</p>
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                    <div><h3 className="text-2xl font-bold">Platform Activity Snapshot</h3><p className="mt-1 text-sm text-cyan-100/90">Track verification, bookings and revenue with one glance.</p></div>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm"><div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2">Completed: {stats?.completedBookings ?? 0}</div><div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2">Revenue: {formatCurrency(stats?.revenue?.today, stats?.revenue?.currency)}</div></div>
                  </div>
                </section>

                <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                  <StatCard title="Users" value={stats?.users} tone="slate" hint="Registered accounts" />
                  <StatCard title="Total Vendors" value={stats?.vendors ?? stats?.providers?.total} tone="blue" hint="Vendor accounts" />
                  <StatCard title="Pending Vendors" value={stats?.providers?.pending} tone="amber" hint="Need verification" />
                  <StatCard title="Daily Bookings" value={stats?.dailyBookings} tone="indigo" hint="Requests today" />
                  <StatCard title="Today's Revenue" value={formatCurrency(stats?.revenue?.today, stats?.revenue?.currency)} tone="emerald" hint="Completed jobs only" />
                  <StatCard title="Completion Rate" value={stats?.completionRate != null ? `${stats.completionRate}%` : "-"} tone="emerald" hint="Total completed / total bookings" />
                </section>

                <section className="mt-6 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                  <div className="mb-4 flex flex-wrap gap-2">
                    {navItems.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${tab === item.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}>{item.label}</button>)}
                  </div>

                  {tab === "vendors" ? (
                    <div>
                      <div className="mb-3 flex items-center justify-between"><select value={providerStatusFilter} onChange={(e) => setProviderStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="all">All vendors</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="blocked">Blocked</option></select><p className="text-xs text-slate-500">Showing {visibleProviders.length} vendors</p></div>
                      <div className="overflow-auto rounded-xl border border-slate-200"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-100 text-slate-700"><tr><th className="p-3 text-left">Business</th><th className="p-3 text-left">Owner</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Actions</th></tr></thead><tbody>{visibleProviders.map((p, i) => <tr key={p._id} className={`${i % 2 ? "bg-slate-50/50" : "bg-white"} border-t border-slate-200`}><td className="p-3 font-semibold">{p.businessName || "-"}</td><td className="p-3"><p>{p.userRef?.name || "-"}</p><p className="text-xs text-slate-500">{p.userRef?.email || "-"}</p></td><td className="p-3"><StatusBadge status={p.status} /></td><td className="p-3"><div className="flex flex-wrap gap-2"><button onClick={() => updateVendorStatus(p._id, "verified")} className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white">Approve</button><button onClick={() => updateVendorStatus(p._id, "blocked")} className="rounded-md bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white">Block</button><button onClick={() => updateVendorStatus(p._id, "pending")} className="rounded-md bg-slate-600 px-2.5 py-1.5 text-xs font-semibold text-white">Pending</button><button onClick={() => removeVendor(p._id)} className="rounded-md bg-rose-700 px-2.5 py-1.5 text-xs font-semibold text-white">Remove</button></div></td></tr>)}{!visibleProviders.length ? <EmptyRow colSpan={4} text="No vendors found" /> : null}</tbody></table></div>
                    </div>
                  ) : null}

                  {tab === "users" ? (
                    <div className="overflow-auto rounded-xl border border-slate-200"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-100 text-slate-700"><tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Email</th><th className="p-3 text-left">Role</th><th className="p-3 text-left">Phone</th><th className="p-3 text-left">Joined</th></tr></thead><tbody>{users.map((u, i) => <tr key={u._id} className={`${i % 2 ? "bg-slate-50/50" : "bg-white"} border-t border-slate-200`}><td className="p-3 font-medium">{u.name}</td><td className="p-3">{u.email}</td><td className="p-3">{toLabel(u.role)}</td><td className="p-3">{u.phone || "-"}</td><td className="p-3">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}</td></tr>)}{!users.length ? <EmptyRow colSpan={5} text="No users found" /> : null}</tbody></table></div>
                  ) : null}

                  {tab === "bookings" ? (
                    <div>
                      <div className="mb-4 rounded-xl border-l-4 border-l-amber-500 bg-amber-50 p-4">
                        <p className="flex items-start gap-3 text-sm text-amber-900">
                          <span className="mt-0.5 text-lg">ℹ️</span>
                          <span><strong>Vendor Controls Approvals:</strong> Initial booking requests (Pending/Requested) are managed entirely by vendors. Admins can only Complete or Cancel bookings <strong>after</strong> vendor acceptance. This ensures vendors have full control over which jobs they take.</span>
                        </p>
                      </div>
                      <div className="mb-3 flex items-center justify-between"><select value={bookingStatusFilter} onChange={(e) => setBookingStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="all">All statuses</option><option value="pending">Pending</option><option value="requested">Requested</option><option value="accepted">Accepted</option><option value="on_the_way">On the way</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="rejected">Rejected</option></select><p className="text-xs text-slate-500">Showing {visibleBookings.length} bookings</p></div>
                      <div className="overflow-auto rounded-xl border border-slate-200"><table className="w-full min-w-[960px] text-sm"><thead className="bg-slate-100 text-slate-700"><tr><th className="p-3 text-left">ID</th><th className="p-3 text-left">User</th><th className="p-3 text-left">Vendor</th><th className="p-3 text-left">Service</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Actions</th></tr></thead><tbody>{visibleBookings.map((b, i) => <tr key={b._id} className={`${i % 2 ? "bg-slate-50/50" : "bg-white"} border-t border-slate-200`}><td className="p-3 font-mono text-xs">#{String(b._id).slice(-6)}</td><td className="p-3">{b.user?.name || "-"}</td><td className="p-3">{b.assignedProvider?.businessName || b.vendor?.businessName || "-"}</td><td className="p-3">{b.serviceType || b.category?.name || "-"}</td><td className="p-3"><StatusBadge status={b.status} /></td><td className="p-3"><BookingActionButtons booking={b} onUpdateStatus={updateBookingStatus} /></td></tr>)}{!visibleBookings.length ? <EmptyRow colSpan={6} text="No bookings found" /> : null}</tbody></table></div>
                    </div>
                  ) : null}

                  {tab === "categories" ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="text-base font-semibold text-slate-900">Manage Service Categories</h3>
                        <p className="text-sm text-slate-500">Create, edit, or delete categories inside admin panel.</p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Category name" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                          <input value={categoryKeywords} onChange={(e) => setCategoryKeywords(e.target.value)} placeholder="Keywords (comma separated)" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button onClick={upsertCategory} disabled={categoryBusy} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{editingCategoryId ? "Update Category" : "Add Category"}</button>
                          {editingCategoryId ? <button onClick={resetCategoryForm} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Cancel Edit</button> : null}
                          <button onClick={seedDefaults} disabled={categoryBusy} className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Add Default Categories</button>
                        </div>
                      </div>

                      <div className="overflow-auto rounded-xl border border-slate-200">
                        <table className="w-full min-w-[760px] text-sm">
                          <thead className="bg-slate-100 text-slate-700"><tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Keywords</th><th className="p-3 text-left">Actions</th></tr></thead>
                          <tbody>
                            {categories.map((cat, i) => (
                              <tr key={cat._id} className={`${i % 2 ? "bg-slate-50/50" : "bg-white"} border-t border-slate-200`}>
                                <td className="p-3 font-semibold text-slate-900">{cat.name || "-"}</td>
                                <td className="p-3">{Array.isArray(cat.keywords) && cat.keywords.length ? cat.keywords.join(", ") : "-"}</td>
                                <td className="p-3"><div className="flex flex-wrap gap-2"><button onClick={() => editCategory(cat)} className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white">Edit</button><button onClick={() => deleteCategory(cat._id)} disabled={categoryBusy} className="rounded-md bg-rose-700 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60">Delete</button></div></td>
                              </tr>
                            ))}
                            {!categories.length ? <EmptyRow colSpan={3} text="No categories found" /> : null}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  {tab === "analytics" ? (
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Verified Vendors</p><p className="mt-2 text-2xl font-bold text-slate-900">{stats?.providers?.verified ?? "-"}</p></div>
                      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Blocked Vendors</p><p className="mt-2 text-2xl font-bold text-slate-900">{stats?.providers?.blocked ?? "-"}</p></div>
                      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Completed Bookings</p><p className="mt-2 text-2xl font-bold text-slate-900">{stats?.completedBookings ?? "-"}</p></div>
                      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Revenue</p><p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(stats?.revenue?.total, stats?.revenue?.currency)}</p></div>
                      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revenue This Month</p><p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(stats?.revenue?.thisMonth, stats?.revenue?.currency)}</p></div>
                      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Daily Bookings</p><p className="mt-2 text-2xl font-bold text-slate-900">{stats?.dailyBookings ?? "-"}</p></div>
                      <div className="rounded-xl border border-slate-200 p-4 md:col-span-3"><h4 className="text-base font-semibold text-slate-900">Last 7 Days Revenue</h4><div className="mt-3"><RevenueBars data={stats?.revenue?.last7Days || []} currency={stats?.revenue?.currency || "INR"} /></div></div>
                      <div className="rounded-xl border border-slate-200 p-4 md:col-span-3"><h4 className="text-base font-semibold text-slate-900">Recent Platform Bookings</h4><div className="mt-3 space-y-2">{(stats?.recentBookings || []).map((b) => <div key={b._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm"><p className="text-slate-700">#{String(b._id).slice(-6)} | {b.user?.name || "-"} | {b.serviceType || b.category?.name || "-"}</p><StatusBadge status={b.status} /></div>)}{!stats?.recentBookings?.length ? <p className="text-sm text-slate-500">No recent bookings</p> : null}</div></div>
                    </div>
                  ) : null}
                </section>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminEntry() {
  const { user } = useAuth();
  return user?.role === "admin" ? <AdminDashboard /> : <AdminLogin />;
}

export default function AdminPageMain() {
  return <AdminEntry />;
}

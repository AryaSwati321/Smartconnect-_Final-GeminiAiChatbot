import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProviderAvailability from "./pages/ProviderAvailability.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import SearchProviders from "./pages/SearchProviders";
import SupportChatbot from "./Components/SupportChatbot";
import VendorsByCategory from "./pages/VendorsByCategory";

import { Home } from "./pages/Home.jsx";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProviderPage from "./pages/Provider";
import DescribeProblem from "./pages/DescribeProblem";
import CategoryList from "./pages/CategoryList";
import ProviderList from "./pages/ProviderList";
import BookingForm from "./pages/BookingForm";
import BookingDetail from "./pages/BookingDetail";
import Tracking from "./pages/Tracking";
import VendorPendingBookings from "./pages/VendorPendingBookings";
import AdminServiceList from "./pages/Admin/AdminServiceList.jsx";
import { AdminEntry } from "./pages/AdminPage.jsx";

export default function App() {
  return (
    <AuthProvider>
      <>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />

          <Route path="/admin" element={<AdminEntry />} />

          <Route
            path="/dashboard"
            element={
              <RequireAuth allowedRoles={["user", "vendor", "admin", "provider"]}>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/orders"
            element={
              <RequireAuth allowedRoles={["user"]}>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/orders/*"
            element={
              <RequireAuth allowedRoles={["user"]}>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/describe"
            element={
              <RequireAuth allowedRoles={["user", "admin", "vendor", "provider"]}>
                <DescribeProblem />
              </RequireAuth>
            }
          />
          <Route
            path="/user/profile"
            element={
              <RequireAuth>
                <UserProfile />
              </RequireAuth>
            }
          />
          <Route
            path="/categories"
            element={
              <RequireAuth allowedRoles={["user"]}>
                <CategoryList />
              </RequireAuth>
            }
          />
          <Route
            path="/providers"
            element={
              <RequireAuth allowedRoles={["user"]}>
                <ProviderList />
              </RequireAuth>
            }
          />
          <Route
            path="/booking/new"
            element={
              <RequireAuth allowedRoles={["user"]}>
                <BookingForm />
              </RequireAuth>
            }
          />
          <Route
            path="/booking/:id"
            element={
              <RequireAuth allowedRoles={["user", "admin", "vendor", "provider"]}>
                <BookingDetail />
              </RequireAuth>
            }
          />
          <Route
            path="/tracking/:id"
            element={
              <RequireAuth allowedRoles={["user", "admin", "vendor", "provider"]}>
                <Tracking />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/services"
            element={
              <RequireAuth allowedRoles={["admin"]}>
                <AdminServiceList />
              </RequireAuth>
            }
          />
          <Route
            path="/provider"
            element={
              <RequireAuth allowedRoles={["vendor", "provider"]}>
                <ProviderPage />
              </RequireAuth>
            }
          />
          <Route
            path="/provider/availability"
            element={
              <RequireAuth allowedRoles={["vendor", "provider"]}>
                <ProviderAvailability />
              </RequireAuth>
            }
          />
          <Route
            path="/vendor/pending-bookings"
            element={
              <RequireAuth allowedRoles={["vendor"]}>
                <VendorPendingBookings />
              </RequireAuth>
            }
          />
          <Route
            path="/vendors/:categoryId"
            element={<VendorsByCategory />}
          />
          <Route
            path="/search"
            element={
              <RequireAuth>
                <SearchProviders />
              </RequireAuth>
            }
          />
          <Route
            path="*"
            element={
              <div className="p-10">
                Not found -{" "}
                <a className="text-sky-600" href="/">
                  home
                </a>
              </div>
            }
          />
        </Routes>
        <SupportChatbot />
      </>
    </AuthProvider>
  );
}

function RequireAuth({ allowedRoles = [], children }) {
  const { user, isAuthenticated } = useAuth();
  const _location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "vendor" || user.role === "provider") {
      return <Navigate to="/provider" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  // Allow vendors to access their dashboard even if not approved yet
  return children;
}

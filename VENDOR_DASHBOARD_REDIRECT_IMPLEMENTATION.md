# Vendor Dashboard Redirect Implementation Guide

## Overview
This document outlines all the changes made to ensure new vendors are automatically directed to their vendor dashboard after registration and login.

---

## Changes Made

### 1. Backend Changes - `/Backend/routes/auth.js`

#### Update Register Endpoint Response
**Location:** Register endpoint response (POST `/api/auth/register`)
- **Before:** Only returned userId and token
- **After:** Now returns full user object with role information

```javascript
{
  msg: 'User created successfully',
  userId: user._id,
  token,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    vendorApproved: user.vendorApproved
  },
  tokenStored: true
}
```

**Why:** Frontend needs to know the user's role to redirect them appropriately after registration.

---

### 2. Frontend Changes - Register Component

#### File: `/Frontend/src/pages/Register.jsx`

**Change 1: Import useAuth hook**
```javascript
import { useAuth } from "../context/AuthContext";
```

**Change 2: Get login function in component**
```javascript
const { login } = useAuth();
```

**Change 3: Update Vendor Registration Success Handler**
- After successful vendor registration, auto-login user with returned token
- Redirect to `/provider` (vendor dashboard)

```javascript
if (data.token && data.user) {
  login(data.token, data.user);
  alert("Vendor registered successfully! Redirecting to dashboard...");
  navigate("/provider");
} else {
  alert("Vendor registered successfully. Please log in.");
  navigate("/login");
}
```

**Change 4: Update User Registration Success Handler**
- After successful user registration, auto-login user
- Redirect to `/user/profile` (user dashboard)

```javascript
if (data.token && data.user) {
  login(data.token, data.user);
  alert("Registration successful! Redirecting to dashboard...");
  navigate("/user/profile");
} else {
  alert("Registered successfully — please log in");
  navigate("/login");
}
```

---

### 3. Frontend Changes - App.jsx Routes & Auth Protection

#### File: `/Frontend/src/App.jsx`

**Change: Fix RequireAuth Component**

**Before:** RequireAuth was blocking unapproved vendors from accessing their dashboard
```javascript
if (user.role === "vendor" && allowedRoles.includes("vendor") && user.vendorApproved === false) {
  const path = location.pathname || "";
  const vendorOnly = path.startsWith("/provider");
  if (vendorOnly) return <Navigate to="/dashboard" replace />;
}
```

**After:** Allow all vendors to access their dashboard, regardless of approval status
```javascript
// Allow vendors to access their dashboard even if not approved yet
return children;
```

**Why:** New vendors should be able to access their dashboard immediately after registration, even while awaiting admin approval.

---

## Complete User Flow

### Registration Path - **Vendor**
1. User goes to `/register`
2. Selects "Vendor" role
3. Fills vendor form (name, email, mobile, category, address, etc.)
4. Submits form
5. Backend:
   - Creates User document with `role: 'vendor'`, `vendorApproved: false`
   - Creates Provider stub with `status: 'pending'`
   - Returns JWT token + full user object
6. Frontend:
   - Auto-login user with `login(token, user)`
   - Redirects to `/provider` (vendor dashboard)
7. Vendor can now access their dashboard and set it up

### Registration Path - **User**
1. User goes to `/register`
2. Selects "User" role
3. Fills user form (name, email, phone, password)
4. Submits form
5. Backend:
   - Creates User document with `role: 'user'`
   - Returns JWT token + full user object
6. Frontend:
   - Auto-login user
   - Redirects to `/user/profile` (user dashboard)

### Login Path - **All Users (including Vendors)**
1. User goes to `/login`
2. Enters email and password
3. Clicks "Login"
4. Backend:
   - Verifies credentials
   - Generates OTP
   - Sends OTP email
   - Returns `requiresOtp: true` and userId
5. Frontend shows OTP input
6. User enters OTP and clicks "Verify"
7. Backend:
   - Verifies OTP
   - Creates JWT token
   - Returns token + user object (with role)
8. Frontend:
   - Auto-login user with token and user data
   - **Redirects based on role:**
     - Admin → `/admin`
     - Vendor/Provider → `/provider` (vendor dashboard)
     - User → `/user/profile` (user dashboard)

---

## Backend Data Flow

### User Document Structure
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  passwordHash: String,
  role: String,  // 'user', 'vendor', or 'admin'
  phone: String,
  avatar: String,
  vendorApproved: Boolean,  // false for new vendors
  // Vendor-specific fields:
  mobile: String,
  adhar: String,
  experience: String,
  address: String,
  workingArea: String,
  category: String,
  certification: String,
  // Auth fields:
  authToken: String,
  tokenIssuedAt: Date,
  otpCode: String,
  otpExpiresAt: Date
}
```

### Provider Document Structure (created for vendors)
```javascript
{
  _id: ObjectId,
  userRef: ObjectId,  // References User._id
  businessName: String,
  description: String,
  status: String,  // 'pending', 'verified', or 'blocked'
  categories: [ObjectId],  // Service categories
  reviewsCount: Number,
  avgRating: Number,
  priceEstimateMin: Number,
  priceEstimateMax: Number,
  location: GeoJSON,  // { type: 'Point', coordinates: [lng, lat] }
  availability: {
    mon, tue, wed, thu, fri, sat, sun: { enabled, start, end }
  }
}
```

---

## Frontend Data Flow

### Auth Context (AuthContext.jsx)
```javascript
{
  token: String,  // JWT token
  user: {
    id: ObjectId,
    name: String,
    email: String,
    role: String,  // Used for role-based redirects
    avatar: String,
    vendorApproved: Boolean
  },
  login(token, user),  // Stores auth data locally
  logout(),  // Clears auth data
  isAuthenticated: Boolean
}
```

### Vendor Dashboard (Provider.jsx)
- Protected route: `/provider`
- Allowed roles: `['vendor', 'provider']`
- Loads:
  - `/api/providers/me` - vendor profile
  - `/api/bookings` - vendor's bookings
  - `/api/categories` - service categories
  - WebSocket connection for real-time updates
- Displays sections:
  - New Bookings
  - Service Requests History
  - Reviews
  - Notifications
  - Vendor Profile Settings

---

## API Endpoints Used

### Authentication
- `POST /api/auth/register` - Register user/vendor (now returns full user object)
- `POST /api/auth/login` - Initiate login with OTP
- `POST /api/auth/verify-otp` - Verify OTP and get token
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout user

### Provider (Vendor Dashboard)
- `GET /api/providers/me` - Get current vendor's profile
- `PUT /api/providers/me` - Update vendor profile
- `PUT /api/providers/availability` - Update working hours
- `GET /api/bookings` - Get vendor's bookings

---

## Testing Checklist

### Vendor Registration Flow
- [ ] Navigate to `/register`
- [ ] Select "Vendor" role
- [ ] Fill all vendor fields
- [ ] Submit form
- [ ] ✅ Should auto-login and redirect to `/provider`
- [ ] ✅ Vendor dashboard should load vendor profile

### Vendor Login Flow (Existing Vendor)
- [ ] Navigate to `/login`
- [ ] Enter vendor email and password
- [ ] ✅ OTP should be sent to email
- [ ] Enter OTP
- [ ] ✅ Should auto-login and redirect to `/provider`

### User Registration Flow
- [ ] Navigate to `/register`
- [ ] Select "User" role
- [ ] Fill user fields
- [ ] Submit form
- [ ] ✅ Should auto-login and redirect to `/user/profile`

### User Login Flow
- [ ] Navigate to `/login`
- [ ] Enter user email and password
- [ ] ✅ OTP should be sent to email
- [ ] Enter OTP
- [ ] ✅ Should auto-login and redirect to `/user/profile`

### Vendor Dashboard Functionality
- [ ] Vendor can see "New Bookings" section
- [ ] Vendor can see service requests history
- [ ] Vendor can see reviews and ratings
- [ ] Vendor can receive notifications (via WebSocket)
- [ ] Vendor can update profile settings
- [ ] Vendor can set working hours/availability

---

## Key Features Implemented

1. **Auto-Login After Registration**: Users are automatically logged in after successful registration, no need for manual login.

2. **Role-Based Redirect**: Users are redirected to appropriate dashboards based on their role:
   - Admin → `/admin`
   - Vendor → `/provider` (vendor dashboard)
   - User → `/user/profile` (user dashboard)

3. **Immediate Vendor Dashboard Access**: New vendors can access their dashboard immediately after registration, even while waiting for admin approval.

4. **Vendor Profile Auto-Creation**: When a vendor registers, a Provider profile is automatically created with `status: 'pending'` for admin review.

5. **OTP-Based Authentication**: Secure login using one-time passwords sent via email.

6. **Real-Time Updates**: Vendor dashboard includes WebSocket integration for real-time booking notifications.

---

## Environment Variables Required

Make sure these are set in `.env` files:

### Backend `.env`
```
MONGO_URI=mongodb://localhost:27017/smart_connect
PORT=5000
SMTP_SERVICE=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
JWT_SECRET=your-secret-key
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:5000
```

---

## Troubleshooting

### Issue: Vendor not redirected to dashboard after registration
- **Check:** Is `/Frontend/src/pages/Register.jsx` updated with new login logic?
- **Check:** Is backend returning `user` object in register response?
- **Check:** Is `data.token` and `data.user` being used to call `login()`?

### Issue: OTP not being received
- **Check:** Are SMTP credentials set correctly in `.env`?
- **Check:** Is email service properly configured?
- **Check:** Check server logs for email send errors

### Issue: Vendor dashboard shows 404 or blank
- **Check:** Is vendor profile being created on registration?
- **Check:** Is `/api/providers/me` endpoint working?
- **Check:** Is vendor authentication token valid?
- **Check:** Browser console for API errors

### Issue: Vendor redirected away from dashboard
- **Check:** Has App.jsx RequireAuth component been fixed?
- **Check:** Is user role correctly set to 'vendor'?

---

## Summary of Changes

| File | Change | Impact |
|------|--------|--------|
| `Backend/routes/auth.js` | Register endpoint returns full user object | Frontend can redirect based on role |
| `Frontend/src/pages/Register.jsx` | Added auto-login after registration | Vendors go directly to dashboard |
| `Frontend/src/App.jsx` | Removed vendorApproved check from RequireAuth | Vendors can access dashboard while pending approval |

---

## Next Steps (Optional Improvements)

1. Add vendor approval notification email
2. Add vendor onboarding wizard for first-time setup
3. Add vendor status indicator showing "Pending Approval"
4. Add email verification for vendor registration
5. Add phone verification for vendor phone numbers
6. Implement vendor analytics dashboard
7. Add vendor subscription/payment billing

---

**Last Updated:** $(date)
**Implementation Status:** ✅ Complete

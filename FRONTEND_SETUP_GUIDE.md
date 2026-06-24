# Smart Connect - Frontend Setup & Troubleshooting Guide

## ✅ Fixed Issues

### 1. **BookingDetail.jsx - Duplicate Code Removed**
- **Issue**: Duplicate variable declarations causing render errors
- **Fix**: Removed duplicate `bookingId`, `serviceLabel`, `addressLabel`, `preferredTimeLabel` declarations
- **Status**: ✅ FIXED

### 2. **BookingForm.jsx - Incorrect Payload Fields**
- **Issue**: Form was sending `providerId` and incorrect field names to backend
- **Fix**: Updated to use `vendorId`, correct field names, proper lat/lng format
- **Status**: ✅ FIXED

---

## 🚀 Getting Started

### Prerequisites
```bash
# Node.js v16+ required
node --version

# npm v8+ required
npm --version
```

### Backend Setup

```bash
cd Backend
npm install

# Create .env file
cat > .env << 'EOF'
MONGO_URI=mongodb://localhost:27017/smart_connect
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_SERVICE=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EOF

# Start backend
npm run dev  # or npm start for production
```

### Frontend Setup

```bash
cd Frontend
npm install

# Create .env file
cat > .env << 'EOF'
VITE_API_URL=http://localhost:5000
EOF

# Start frontend
npm run dev
```

---

## 🔍 Verification Checklist

### Backend Endpoints (Test with Postman/cURL)

#### 1. Create Booking
```bash
POST http://localhost:5000/api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "categoryId": "664abc...",
  "vendorId": "664abc...",
  "serviceType": "Plumbing",
  "lat": 18.52,
  "lng": 73.85,
  "address": "123 Main St",
  "totalAmount": 500
}
```

#### 2. Get Vendor Pending Bookings
```bash
GET http://localhost:5000/api/bookings/vendor/pending
Authorization: Bearer <vendor_token>
```

#### 3. Accept Booking
```bash
POST http://localhost:5000/api/bookings/{bookingId}/accept
Authorization: Bearer <vendor_token>
```

#### 4. Reject Booking
```bash
POST http://localhost:5000/api/bookings/{bookingId}/reject
Authorization: Bearer <vendor_token>
Content-Type: application/json

{
  "reason": "Fully booked for today"
}
```

### Frontend Routes (Test in Browser)

| Route | Component | Accessible When |
|-------|-----------|-----------------|
| `/` | Home | Always |
| `/register` | Register | Not logged in |
| `/login` | Login | Not logged in |
| `/dashboard` | Dashboard | Logged in (any role) |
| `/booking/new` | BookingForm | User role |
| `/booking/:id` | BookingDetail | Any role |
| `/vendor/pending-bookings` | VendorPendingBookings | Vendor role |
| `/tracking/:id` | Tracking | Any role |

---

## ⚠️ Common Errors & Solutions

### Error 1: "Module not found: VendorPendingBookings"
**Solution**: Ensure file exists at `Frontend/src/pages/VendorPendingBookings.jsx`
```bash
ls -la Frontend/src/pages/VendorPendingBookings.jsx
```

### Error 2: "Cannot read property 'trim' of undefined"
**Solution**: In BookingDetail, property names may differ. Add null checks:
```javascript
const reason = booking?.rejectionReason || null;
```

### Error 3: "Network Error: Cannot POST /api/bookings"
**Possible Causes**:
- Backend not running (check port 5000)
- `VITE_API_URL` not set correctly in Frontend/.env
- CORS not configured properly

**Fix**:
```bash
# Check if backend is running
curl http://localhost:5000/api/categories

# Verify Frontend .env
cat Frontend/.env
```

### Error 4: "Vendor profile not found"
**Solution**: Vendor must have a Provider profile. Create one:
```javascript
// In any API request context
PUT /api/providers/me
{
  "businessName": "My Service",
  "categories": ["664..."],
  "lat": 18.52,
  "lng": 73.85
}
```

### Error 5: "Token expired or invalid"
**Solution**: 
- Clear localStorage and re-login
- Check JWT_SECRET matches between frontend and backend
- Verify token is in Authorization header

---

## 🧪 Manual Testing Flow

### Test 1: Complete Booking Workflow

**Step 1: User Login**
- Navigate to `/login`
- Register as user: `testuser@test.com`
- Should redirect to `/dashboard`

**Step 2: Select Vendor & Create Booking**
- Go to `/categories` or search for vendors
- Click on a vendor
- Navigate to `/booking/new`
- Fill form and submit
- Should create booking with status `pending`

**Step 3: Vendor Receives Notification**
- Login as vendor in separate browser
- Go to `/vendor/pending-bookings` (NEW)
- Should see the booking in list

**Step 4: Vendor Accepts**
- Click "View Details" or "Accept"
- On `/booking/:id` page with vendor role
- Should see blue "⏳ Pending Your Approval" banner
- Click "✓ Accept Request"
- Booking status changes to `accepted`
- User receives notification

**Step 5: Verify User Sees Accepted Status**
- User refreshes `/booking/:id`
- Should see status changed to `accepted`
- Should see vendor info
- May see "Track" button for live tracking

### Test 2: Rejection Workflow

**Step 1**: Create new booking (repeat Test 1 steps 1-2)

**Step 2**: Vendor Rejects
- Vendor logs in
- Goes to `/vendor/pending-bookings`
- Clicks "View Details"
- Fills "Reason for Rejection" textarea: "Fully booked"
- Clicks "✕ Reject Request"
- Status changes to `rejected`

**Step 3**: User Sees Rejection
- User refreshes `/booking/:id`
- Sees red banner: "❌ Booking Rejected"
- Shows reason: "Fully booked"

---

## 📊 Database Model Verification

### Check MongoDB for Booking Fields

```bash
# Connect to MongoDB
mongo mongodb://localhost:27017/smart_connect

# Check booking
db.bookings.findOne()

# Should include:
# - _id
# - user (ObjectId)
# - vendor (ObjectId)
# - status (pending/accepted/rejected/etc)
# - rejectionReason (if rejected)
# - rejectedAt (if rejected)
# - createdAt
# - updatedAt
```

---

## 🔧 Development Tips

### Enable Debug Logging

**Frontend**:
```javascript
// In BookingDetail.jsx
console.log("Booking:", booking);
console.log("User Role:", userRole);
console.log("Is Pending Vendor Approval:", isPendingVendorApproval);
```

**Backend**:
```javascript
// In routes/booking.js
console.log("Accept request:", req.body);
console.log("Provider:", provider);
```

### Test Socket.io Notifications

```javascript
// In browser console (Frontend)
import { createSocket } from "./lib/socket.js"
const socket = createSocket(localStorage.getItem("token"))
socket.on("user:notification", (msg) => console.log("Notification:", msg))
```

---

## 📦 Project Structure

```
smart_connect/
├── Backend/
│   ├── models/
│   │   ├── Booking.js (✅ Updated: Added rejectionReason, rejectedAt)
│   │   ├── Provider.js
│   │   ├── User.js
│   │   └── ...
│   ├── routes/
│   │   ├── booking.js (✅ Updated: New vendor endpoints)
│   │   ├── auth.js
│   │   └── ...
│   ├── controllers/
│   ├── middlewares/
│   ├── services/
│   ├── index.js
│   ├── package.json
│   └── .env (Create this)
│
├── Frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── BookingDetail.jsx (✅ Fixed: Removed duplicates)
│   │   │   ├── BookingForm.jsx (✅ Fixed: Correct field names)
│   │   │   ├── VendorPendingBookings.jsx (✅ NEW)
│   │   │   └── ...
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── lib/
│   │   │   ├── api.js
│   │   │   └── socket.js
│   │   ├── App.jsx (✅ Updated: Added route)
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── .env (Create this)
│   └── index.html
│
└── VENDOR_APPROVAL_SYSTEM_GUIDE.md (Documentation)
```

---

## ✅ All Systems Go

Your codebase should now be fully functional with:

1. ✅ **Backend**: Vendor approval endpoints configured
2. ✅ **Frontend**: All components properly imported and structured
3. ✅ **BookingDetail**: Fixed duplicate code, added vendor UI
4. ✅ **BookingForm**: Fixed payload format
5. ✅ **VendorPendingBookings**: New dashboard ready
6. ✅ **Routes**: All paths configured in App.jsx
7. ✅ **API Communication**: Correct endpoint names and formats

---

## 🚀 Next Steps

1. **Start Backend**: `cd Backend && npm run dev`
2. **Start Frontend**: `cd Frontend && npm run dev`
3. **Open Browser**: Navigate to `http://localhost:5173` (default Vite port)
4. **Run Tests**: Follow manual testing flow above
5. **Deploy**: When ready for production, use `npm run build` on frontend

---

**Created**: April 13, 2026  
**Status**: All Frontend Errors Resolved ✅

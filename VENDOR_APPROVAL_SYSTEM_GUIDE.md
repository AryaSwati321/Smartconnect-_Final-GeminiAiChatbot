# Vendor Approval Workflow Implementation - Complete Guide

## Overview
The Smart Connect system has been successfully updated to implement a **vendor approval workflow** where:
1. Users submit booking requests to vendors
2. Vendors can **accept** or **reject** the booking requests
3. There is NO automatic reassignment to other vendors
4. Vendors have full control over which bookings to accept

## Changes Made

### 1. Database Model Changes

#### [Backend/models/Booking.js](Backend/models/Booking.js)
**Added Fields:**
- `rejectionReason` (String): Stores the reason why a vendor rejected a booking
- `rejectedAt` (Date): Timestamp when the booking was rejected

**Status Enum** (unchanged but clarified):
- `pending` - Waiting for vendor approval (NEW WORKFLOW)
- `accepted` - Vendor accepted the booking
- `rejected` - Vendor rejected the booking
- `on_the_way` - Vendor is on the way
- `in_progress` - Service in progress
- `completed` - Service completed
- `cancelled` - Booking cancelled

---

### 2. Backend API Changes

#### [Backend/routes/booking.js](Backend/routes/booking.js)

**Endpoints Updated/Added:**

##### 1. **POST /api/bookings** (CREATE BOOKING)
- When a user creates a booking, it's set to `pending` status
- Waiting for the assigned vendor to accept or reject
- Sends real-time notification to the vendor

```
Request:
{
  categoryId: string,
  vendorId: string,
  latitude: number,
  longitude: number,
  address: string,
  bookingTime: Date (optional),
  totalAmount: number (optional),
  currency: string (default: 'INR')
}

Response:
{
  _id: ObjectId,
  user: ObjectId,
  vendor: ObjectId,
  status: 'pending',
  ...
}
```

##### 2. **POST /api/bookings/:id/accept** (VENDOR ACCEPTS)
- Only vendors can accept
- Booking status changes from `pending` to `accepted`
- User receives notification
- No more reassignment logic

```
Before:
{
  vendor: vendorId,
  status: 'pending'
}

After:
{
  vendor: vendorId,
  assignedProvider: vendorId,
  status: 'accepted'
}
```

##### 3. **POST /api/bookings/:id/reject** (VENDOR REJECTS) ⭐ COMPLETELY REWRITTEN
- Only vendors can reject
- Booking status changes to `rejected`
- Requires a rejection reason
- **NO more automatic reassignment to other vendors**
- User is notified with the rejection reason

```
Request:
{
  reason: "string" // e.g., "Fully booked", "Area not serviceable"
}

After:
{
  status: 'rejected',
  rejectionReason: 'string',
  rejectedAt: Date,
  vendor: vendorId (stays with original vendor)
}
```

##### 4. **GET /api/bookings/vendor/pending** (NEW)
- Returns all pending bookings awaiting vendor approval
- Only accessible to vendors
- Populated with user and category details

```
Response:
[
  {
    _id: ObjectId,
    user: { name, email, phone, defaultAddress },
    category: { name },
    serviceType: string,
    address: string,
    bookingTime: Date,
    status: 'pending',
    ...
  }
]
```

##### 5. **GET /api/bookings/vendor/all** (NEW)
- Returns all accepted, in-progress, and completed bookings
- Useful for vendor dashboard
- Shows active and completed work

```
Response:
[
  {
    _id: ObjectId,
    status: 'accepted' | 'in_progress' | 'completed',
    ...
  }
]
```

---

### 3. Frontend Changes

#### [Frontend/src/pages/BookingDetail.jsx](Frontend/src/pages/BookingDetail.jsx)
**Added:**
- Vendor approval UI when booking is in `pending` status
- **Accept Button** - Vendors can accept the booking request
- **Reject Button** - Vendors can provide a reason and reject
- **Rejection Reason Input** - Textarea for vendors to explain rejection
- Rejection status display - Shows rejection reason and timestamp to users
- Improved status badges and messages

**New Functions:**
```javascript
handleAcceptBooking() - Accepts the booking request
handleRejectBooking() - Rejects with a reason
```

**UI States:**
1. **For Vendors (Pending):**
   - Blue banner with "⏳ Pending Your Approval"
   - Accept and Reject buttons
   - Reason input field (required for rejection)

2. **For Users (After Rejection):**
   - Red banner showing rejection reason
   - Option to search for alternative vendors

#### [Frontend/src/pages/VendorPendingBookings.jsx](Frontend/src/pages/VendorPendingBookings.jsx) (NEW)
**Complete vendor dashboard for managing pending bookings**

Features:
- Lists all pending bookings waiting for vendor approval
- Shows customer details (name, phone, email)
- Displays service details (category, requested time, location)
- Quick action buttons (Accept from list, or View Details)
- Empty state message when no pending bookings
- Real-time status updates

Shows:
- Customer Contact Information
- Service Location
- Requested Service Time
- Request Submission Time
- Quick navigation to booking details

#### [Frontend/src/App.jsx](Frontend/src/App.jsx)
**Added:**
- Route `/vendor/pending-bookings` - New vendor dashboard
- Import for VendorPendingBookings component
- Protected route (only vendors can access)

---

## System Flow Diagram

```
USER PERSPECTIVE:
================
User Creates Booking
        ↓
[Status: PENDING]
        ↓
Vendor Receives Notification
        ↓
        ├─→ VENDOR ACCEPTS → [Status: ACCEPTED] → Service Proceeds
        │
        └─→ VENDOR REJECTS → [Status: REJECTED] → User See Reason
                                                     ↓
                                            User Must Find New Vendor


VENDOR PERSPECTIVE:
===================
Vendor Receives Notification of Pending Booking
        ↓
Visit /vendor/pending-bookings (NEW)
        ↓
Click "View Details" → Navigate to Booking Detail
        ↓
[Status: PENDING]
        ↓
        ├─→ ACCEPT → Booking Accepted, Service Begins
        │
        └─→ REJECT with Reason → Booking Rejected
                                   ↓
                           User Notified with Reason
```

---

## Key Changes Summary

### ❌ Removed:
1. **Automatic reassignment to other vendors** - NO MORE automatic vendor switching
2. **rejectedVendors array logic** - Not needed anymore (can keep in DB but not used)
3. **Auto-search for nearby vendors** - Vendors no longer get auto-reassigned

### ✅ Added:
1. **Rejection reason** - Vendors explain why they reject
2. **Rejection timestamp** - Track when rejection happened
3. **Vendor pending bookings endpoint** - GET /api/bookings/vendor/pending
4. **Vendor pending bookings dashboard** - New page for vendors to manage requests
5. **Better rejection handling** - Clear user feedback

### 📝 Modified:
1. **Accept endpoint** - Simplified, only check vendor owns the pending booking
2. **Reject endpoint** - Complete rewrite, no reassignment logic
3. **BookingDetail component** - Added acceptance/rejection UI for vendors
4. **Status flow** - Clearer `pending` → `accepted`/`rejected` flow

---

## API Testing Guide

### 1. Create Booking (User)
```bash
POST /api/bookings
Headers: Authorization: Bearer <token>
Body:
{
  "categoryId": "664...",
  "vendorId": "664...",
  "serviceType": "Plumbing",
  "lat": 18.52,
  "lng": 73.85,
  "address": "123 Main St",
  "totalAmount": 500
}
```

### 2. Get Pending Bookings (Vendor)
```bash
GET /api/bookings/vendor/pending
Headers: Authorization: Bearer <token>
Response:
[
  {
    "_id": "664...",
    "user": { "name": "John", "phone": "9876543210" },
    "serviceType": "Plumbing",
    "status": "pending",
    ...
  }
]
```

### 3. Accept Booking (Vendor)
```bash
POST /api/bookings/{bookingId}/accept
Headers: Authorization: Bearer <token>
Response:
{
  "_id": "664...",
  "status": "accepted",
  "assignedProvider": "vendors-id"
}
```

### 4. Reject Booking (Vendor)
```bash
POST /api/bookings/{bookingId}/reject
Headers: Authorization: Bearer <token>
Body:
{
  "reason": "Fully booked for today"
}

Response:
{
  "_id": "664...",
  "status": "rejected",
  "rejectionReason": "Fully booked for today",
  "rejectedAt": "2024-04-13T10:30:00Z"
}
```

---

## Frontend Pages/Routes

| Route | Component | Role | Purpose |
|-------|-----------|------|---------|
| `/booking/:id` | BookingDetail | User/Vendor | Book details + vendor approval UI |
| `/vendor/pending-bookings` | VendorPendingBookings | Vendor | Manage pending booking requests |
| `/dashboard` | Dashboard | User/Vendor | Main dashboard |
| `/provider` | ProviderPage | Vendor | Vendor profile management |

---

## User Flow Examples

### Example 1: Successful Booking
```
1. User creates booking for "Plumbing" from Vendor "ABC Plumbing"
   → Booking status: pending

2. Vendor receives notification
   → Visits /vendor/pending-bookings
   → Sees the new booking
   → Clicks "View Details"

3. Vendor reviews booking details and clicks "Accept"
   → Booking status: accepted
   → User receives notification: "Your booking has been accepted!"
   → Service can now proceed

4. Vendor updates location, marks as "on_the_way", changes to "in_progress", marks "completed"
```

### Example 2: Rejected Booking
```
1. User creates booking for "Plumbing"
   → Booking status: pending

2. Vendor reviews and sees they're fully booked
   → Clicks "View Details" → Fills reason: "Fully booked for today"
   → Clicks "Reject Request"
   → Booking status: rejected

3. User receives notification: "Your booking was rejected. Reason: Fully booked for today"
   → User can now search for another vendor
   → Must create a new booking request
```

---

## Important Notes for Deployment

1. **Database Migration**: No migration needed. New fields (`rejectionReason`, `rejectedAt`) are optional and backward compatible.

2. **Backward Compatibility**: Existing accepted/completed bookings will continue to work. Only NEW flow is affected.

3. **Real-time Updates**: WebSocket events still send booking updates to users and vendors via Socket.io

4. **Testing**: 
   - Test vendor workflow: Create booking → Accept/Reject
   - Test user notifications for both accept and reject scenarios
   - Verify rejection reason is displayed to user

5. **Frontend Environment**: Ensure `VITE_API_URL` is properly set for image uploads

---

## Future Enhancements

Possible improvements for future iterations:
1. **Vendor Queue System** - Auto-match to vendors based on availability/ratings
2. **Admin Override** - Admins can reassign rejected bookings
3. **Booking Expiry** - Auto-cancel if vendor doesn't respond in X hours
4. **Performance Matching** - Match vendors based on ratings/reviews
5. **Booking Analytics** - Track acceptance/rejection rates by vendor
6. **Automated Retry Logic** - Suggest alternative vendors to users

---

## Support & Troubleshooting

**Issue**: Vendor doesn't see pending bookings
- **Check**: Vendor status is "verified" in database
- **Check**: Vendor has a Provider profile linked to their User
- **Test**: Call GET /api/bookings/vendor/pending with vendor token

**Issue**: Rejection doesn't show to user
- **Check**: Booking status is "rejected" in database
- **Check**: rejectionReason field is populated
- **Check**: Frontend is reading rejectionReason field

**Issue**: Accept button doesn't work
- **Check**: Booking status is exactly "pending"
- **Check**: Vendor owns this booking (vendor ID matches)
- **Check**: Vendor account is verified

---

**Implementation Date**: April 13, 2026
**Status**: ✅ Complete and Ready for Testing

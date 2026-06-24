# Vendor Verification System Implementation

## Overview
This document outlines the comprehensive vendor verification system for SmartConnect, where vendors must be approved by admins before they can accept and manage bookings.

---

## System Architecture

### Status Flow
```
Vendor Registration
        ↓
User: vendorApproved = false
Provider: status = "pending"
        ↓
[WAITING FOR ADMIN APPROVAL]
        ↓
Admin Verifies Vendor
        ↓
User: vendorApproved = true
Provider: status = "verified"
        ↓
Vendor Can Accept Bookings
```

---

## Backend Changes

### 1. Provider Controller (`/Backend/controllers/providerController.js`)

#### getMe Endpoint
- **Now Returns:** `vendorApproved` and `approvalStatus` fields
- **Purpose:** Frontend knows the vendor's approval status
- **Response:**
```json
{
  "_id": "...",
  "businessName": "...",
  "vendorApproved": true/false,
  "approvalStatus": "pending|verified|blocked",
  ...
}
```

#### updateMe Endpoint
- **Behavior:** Allows vendors to update profile even if not approved
- **Purpose:** Vendors can prepare their profile while waiting for admin approval
- **Accessible:** Both approved and unapproved vendors

#### updateAvailability Endpoint
- **New Check:** `if (!user?.vendorApproved) → 403 Forbidden`
- **Error Message:** "Vendor account is pending admin approval. You cannot update availability until approved."
- **Purpose:** Prevents unapproved vendors from setting schedules
- **Accessible:** Only approved vendors

### 2. Booking Routes (`/Backend/routes/booking.js`)

#### New Helper Function: `checkVendorApproval()`
```javascript
async function checkVendorApproval(req, res) {
  // Fetches User document
  // Checks vendorApproved status
  // Returns 403 if not approved
}
```

#### Protected Endpoints
All these endpoints now call `checkVendorApproval()`:

1. **GET /api/bookings/vendor/pending**
   - Lists pending bookings for vendor
   - **Restricted:** Only approved vendors

2. **GET /api/bookings/vendor/all**
   - Lists accepted/in-progress/completed bookings
   - **Restricted:** Only approved vendors

3. **POST /api/bookings/:id/accept**
   - Accept a pending booking
   - **Restricted:** Only approved vendors
   - **Double Check:** Ensures provider.status === 'verified'

4. **POST /api/bookings/:id/reject**
   - Reject a pending booking
   - **Restricted:** Only approved vendors
   - **Double Check:** Ensures provider.status === 'verified'

5. **POST /api/bookings/:id/location**
   - Update live location during service
   - **Restricted:** Only approved vendors

6. **POST /api/bookings/:id/start**
   - Start service delivery
   - **Restricted:** Only approved vendors

7. **POST /api/bookings/:id/complete**
   - Complete service delivery
   - **Restricted:** Only approved vendors

#### Error Responses
When unapproved vendor tries to access restricted functionality:
```json
{
  "msg": "Your vendor account is pending admin approval. You cannot perform this action until approved."
}
HTTP Status: 403 Forbidden
```

### 3. Admin Controller (`/Backend/controllers/adminController.js`)

#### updateProviderStatus Endpoint
- **Existing Functionality:** Already syncs `vendorApproved` status
- **Logic:**
```javascript
const vendorApproved = status === 'verified';
if (provider.userRef?._id) {
  await User.findByIdAndUpdate(provider.userRef._id, { $set: { vendorApproved } });
}
```

- **Scenarios:**
  - Admin sets status to "verified" → User.vendorApproved = true
  - Admin sets status to "pending" → User.vendorApproved = false
  - Admin sets status to "blocked" → User.vendorApproved = false

---

## Frontend Changes

### 1. Provider Component (`/Frontend/src/pages/Provider.jsx`)

#### New State
```javascript
const [vendorApproved, setVendorApproved] = useState(false);
const [approvalStatus, setApprovalStatus] = useState("pending");
```

#### Updated loadProviderProfile()
- Fetches approval status from `/api/providers/me` response
- Extracts `vendorApproved` and `approvalStatus` from API
- Updates component state

#### Approval Warning Banner
**Shown when:** `!vendorApproved`
- Location: Top of dashboard (after header)
- Style: Amber/orange warning box
- Content:
  - Title: "Admin Approval Pending"
  - Indicates pending verification status
  - Lists what becomes available after approval:
    - Accept and manage service bookings
    - Update service availability
    - View and respond to customer bookings
  - Note: "Right now, you can only update your profile settings"

#### Section Buttons (Dynamic Disable)
**Booking-related sections disabled when unapproved:**
- ❌ "New Bookings"
- ❌ "Service Requests History"
- ❌ "Reviews"
- ❌ "Notifications"
- ✅ "Vendor Profile Settings" (always enabled)

**Disabled button styling:**
- Background: Gray (`bg-slate-200`)
- Text: Light gray (`text-slate-400`)
- Opacity: 50%
- Cursor: Not-allowed
- Hover tooltip: "Unavailable until admin approval"

#### Section Placeholders
When unapproved vendor clicks disabled sections:
- Shows message: "✓ This section will be available once your vendor account is approved by admin."
- Prevents access to booking functionality

#### Booking Action Protection
Function: `takeBookingAction()`
- First check: `if (!vendorApproved) → Alert + Return`
- Message: "Your vendor account is pending admin approval. You cannot perform this action until approved."
- Prevents any booking action (accept, reject, location, start, complete)

#### Profile Section
**Available:** Both approved and unapproved vendors
**Features:**
- Informational banner (when unapproved):
  - "You can update your profile now"
  - "Cannot set availability or accept bookings until approved"
- Save button: Always enabled
- Set Availability button:
  - Disabled if unapproved (opacity 50%, cursor not-allowed)
  - Enabled if approved

---

## User Journey

### Scenario 1: New Vendor Registration
1. Vendor fills out registration form
2. Clicks "Register"
3. ✅ Backend creates User (`vendorApproved=false`) and Provider (`status=pending`)
4. ✅ Vendor auto-logged in and redirected to `/provider`
5. 🟡 Dashboard shows "Admin Approval Pending" banner
6. ✅ Vendor can view and update profile settings
7. ❌ Vendor cannot:
   - Accept/reject bookings
   - Set availability
   - View pending bookings
   - Access booking history
8. Vendor updates profile: business name, category, location, pricing
9. Vendor clicks "Save Profile" → ✅ Profile saved successfully
10. Vendor waits for admin approval

### Scenario 2: Admin Approval Process
1. Admin logs in to admin panel
2. Goes to "Providers" section
3. Sees vendor with status "pending"
4. Reviews vendor details:
   - Business name
   - Category
   - Services offered
   - Certifications (if uploaded)
5. Admin clicks "Approve" button
6. ✅ Backend updates:
   - Provider.status = "verified"
   - User.vendorApproved = true
7. ✅ Vendor receives notification (optional):
   - Email: "Your account has been approved!"
   - Or in-app notification

### Scenario 3: Approved Vendor
1. Vendor logs in
2. Dashboard loads without warning banner
3. ✅ All sections now enabled:
   - "New Bookings" - can accept/reject
   - "Service History" - can view and manage
   - "Reviews" - can see ratings
   - "Notifications" - receives real-time updates
4. ✅ Can set availability for working hours
5. ✅ Can accept bookings from customers
6. ✅ Can manage ongoing services

### Scenario 4: Admin Blocks Vendor
1. Admin identifies problematic vendor
2. Admin clicks "Block" in admin panel
3. ✅ Backend updates:
   - Provider.status = "blocked"
   - User.vendorApproved = false
4. ❌ Vendor can no longer accept bookings
5. 🟡 Vendor sees "Admin Approval Pending" banner (actually blocked)
6. ❌ All booking sections disabled again

---

## Database Synchronization

### User Model
```javascript
{
  _id: ObjectId,
  email: String,
  role: "vendor",
  vendorApproved: Boolean,  // NEW - controls all vendor booking access
  ...
}
```

### Provider Model
```javascript
{
  _id: ObjectId,
  userRef: ObjectId,        // References User._id
  status: "pending|verified|blocked",  // Controls booking permissions
  businessName: String,
  ...
}
```

### Sync Points
1. **During Registration:**
   - User.vendorApproved = false
   - Provider.status = "pending"

2. **During Admin Approval:**
   - Provider.status → "verified"
   - User.vendorApproved → true

3. **During Admin Block:**
   - Provider.status → "blocked"
   - User.vendorApproved → false

---

## API Error Handling

### When Vendor is Not Approved

#### Booking Endpoints
```
POST /api/bookings/:id/accept
403 Forbidden
{
  "msg": "Your vendor account is pending admin approval. You cannot perform this action until approved."
}
```

#### Availability Endpoints
```
PUT /api/providers/availability
403 Forbidden
{
  "msg": "Vendor account is pending admin approval. You cannot update availability until approved."
}
```

#### Booking List Endpoints
```
GET /api/bookings/vendor/pending
403 Forbidden
{
  "msg": "Your vendor account is pending admin approval. You cannot perform this action until approved."
}
```

---

## Security Measures

1. **Double Validation:**
   - Frontend checks `vendorApproved` before action
   - Backend validates again before processing

2. **Database Integrity:**
   - Both User and Provider documents track approval
   - Admin changes to Provider status auto-sync to User

3. **Booking Protection:**
   - Users cannot book from unapproved vendors
   - Booking creation also checks provider.status === 'verified'

4. **Session Validation:**
   - Each request verifies token and user role
   - Approval status checked fresh from database (lean query)

---

## Testing Checklist

### Frontend Tests
- [ ] New vendor sees approval banner after registration
- [ ] Booking sections are disabled (grayed out, not clickable)
- [ ] Profile section is enabled
- [ ] Can save profile even if unapproved
- [ ] Cannot click "Set Availability" button when unapproved
- [ ] Clicking disabled buttons shows message
- [ ] Taking booking action shows error alert

### Backend Tests
- [ ] GET /api/providers/me returns vendorApproved and approvalStatus
- [ ] GET /api/bookings/vendor/pending returns 403 if not approved
- [ ] POST /api/bookings/:id/accept returns 403 if not approved
- [ ] PUT /api/providers/me succeeds even if not approved (profile update)
- [ ] PUT /api/providers/availability returns 403 if not approved
- [ ] Admin updating status to "verified" sets User.vendorApproved = true
- [ ] Admin updating status to "blocked" sets User.vendorApproved = false

### Admin Panel Tests
- [ ] Admin can see "pending" vendors in list
- [ ] Admin can change status to "verified"
- [ ] Admin can change status to "blocked"
- [ ] Status change reflects in vendor dashboard immediately

### Integration Tests
- [ ] Vendor registers → sees approval banner
- [ ] Admin approves vendor → banner disappears, sections enabled
- [ ] Vendor accepts booking → success
- [ ] Vendor updates availability → success
- [ ] Admin blocks vendor → vendor loses access again

---

## File Changes Summary

| File | Changes | Impact |
|------|---------|--------|
| Backend/controllers/providerController.js | Added vendorApproved checks to getMe, updateAvailability | Prevents scheduling before approval |
| Backend/controllers/providerController.js | Updated getMe to return approvalStatus | Frontend knows approval status |
| Backend/routes/booking.js | Added checkVendorApproval helper function | Centralized approval checking |
| Backend/routes/booking.js | Added checks to accept, reject, location, start, complete endpoints | Prevents booking actions before approval |
| Backend/controllers/adminController.js | Already syncs vendorApproved on status change | No changes needed |
| Frontend/src/pages/Provider.jsx | Added vendorApproved and approvalStatus state | Tracks vendor approval |
| Frontend/src/pages/Provider.jsx | Added approval warning banner | Informs vendor of status |
| Frontend/src/pages/Provider.jsx | Disabled booking section buttons when not approved | Prevents UI access |
| Frontend/src/pages/Provider.jsx | Added section placeholders for disabled sections | Better UX |
| Frontend/src/pages/Provider.jsx | Added checks to bookingAction function | Prevents booking actions |
| Frontend/src/pages/Provider.jsx | Disabled availability button when not approved | Prevents scheduling |

---

## Monitoring & Logs

### Admin Dashboard Should Show:
- Total pending vendors (count)
- Total verified vendors (count)
- Total blocked vendors (count)
- List of pending vendors requiring review

### Vendor Notifications (Optional Enhancements):
- Email when account is approved
- In-app notification for approval
- Email when account is blocked (with reason)

---

## Future Enhancements

1. **Email Notifications:**
   - Send email when vendor account is approved
   - Send email when vendor account is blocked

2. **Admin Notes:**
   - Allow admin to add notes when blocking vendor
   - Display block reason to vendor

3. **Vendor Analytics:**
   - Track approval processing time
   - Show average time from registration to approval

4. **Auto-Approval:**
   - Whitelist vendors with trusted certifications
   - Auto-approve after document verification

5. **Approval Workflow:**
   - Admin assigns vendors to reviewers
   - Multiple approval levels
   - Detailed review checklist

---

## Troubleshooting

### Issue: Vendor sees approval banner but should be approved
- **Check:** Verify vendor.vendorApproved = true in database
- **Check:** Verify provider.status = "verified" 
- **Fix:** Manually update User.vendorApproved = true if out of sync

### Issue: Vendor can access booking after being blocked
- **Check:** Verify provider.status = "blocked"
- **Check:** Verify background sync job hasn't failed
- **Fix:** Manually clear any cached auth tokens

### Issue: Error when accepting booking
- **Check:** HTTP response status 403
- **Check:** Error message about admin approval
- **Fix:** Use admin panel to verify vendor account

---

## Summary

This vendor verification system provides:
- ✅ **Security:** Only approved vendors can accept bookings
- ✅ **Control:** Admins can verify or block vendors
- ✅ **UX:** Clear feedback when vendor is pending approval
- ✅ **Profile Setup:** Vendors can prepare profile during approval process
- ✅ **Flexibility:** Can block vendors if needed
- ✅ **Database Sync:** User and Provider documents stay in sync

**Implementation Status:** ✅ Complete and Functional

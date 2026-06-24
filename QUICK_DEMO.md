# Quick Setup & Run Guide

## FASTEST WAY TO START

### Terminal 1 - Backend:
```bash
cd Backend
npm install    # (only first time)
npm start
```
Wait for message: "Server running on port 5000"

### Terminal 2 - Frontend:
```bash
cd Frontend
npm install    # (only first time)
npm run dev
```
Wait for message showing "http://localhost:5173"

### Browser:
```
Open: http://localhost:5173
```

---

## TEST CREDENTIALS (If Pre-Created)

### Admin Login:
- Email: admin@smartconnect.com
- Password: admin123

### Test User:
- Phone: 9876543210
- Password: user123

### Test Vendor:
- Email: vendor@test.com
- Password: vendor123

---

## QUICK DEMO CHECKLIST

- [ ] Backend server running (port 5000)
- [ ] Frontend server running (port 5173)
- [ ] Browser opened to localhost:5173
- [ ] User account ready (registered or test account)
- [ ] Vendor account ready (registered)
- [ ] Admin account ready (registered or existing)
- [ ] Vendor approved by admin
- [ ] Ready to do complete flow demo

---

## MAIN URLs TO REMEMBER

| Page | URL |
|------|-----|
| Home | http://localhost:5173 |
| Register | http://localhost:5173/register |
| Login | http://localhost:5173/login |
| Admin | http://localhost:5173/admin |
| User Dashboard | http://localhost:5173/user/profile |
| Vendor Dashboard | http://localhost:5173/provider |
| Search Vendors | http://localhost:5173/search |

---

## BROWSER TABS SETUP

For smooth demo, open 3 browser tabs:

1. **Tab 1 - User Account**: http://localhost:5173 (logged in as user)
2. **Tab 2 - Vendor Account**: http://localhost:5173 (logged in as vendor)
3. **Tab 3 - Admin Account**: http://localhost:5173/admin (logged in as admin)

Switch between tabs during demo to show different roles interacting.

---

## COMMON ACTIONS

### User Books Service:
```
1. Home → Select Category
2. Click Vendor → Book Service
3. Fill Details → Confirm
4. Go to "Service Request History"
5. See status update in real-time
```

### Vendor Accepts Booking:
```
1. Vendor Dashboard → "New Bookings"
2. See pending requests
3. Click "Accept"
4. See it move to "Work In Progress"
5. Start Live Tracking and update status
```

### Admin Approves Vendor:
```
1. /admin → Login
2. Find "Pending Vendors"
3. Click "Approve"
4. Vendor can now accept bookings
```

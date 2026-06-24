# Smart Connect - Demonstration Guide for Invigilators

## Prerequisites
- Node.js installed
- Both Backend and Frontend servers running
- Test user accounts available

---

## PART 1: STARTING THE SERVERS

### Step 1: Start Backend Server
```
1. Open Terminal 1
2. Navigate to Backend folder: cd Backend
3. Install dependencies (first time only): npm install
4. Start server: npm start or node index.js
5. You should see: "Server running on port 5000" or similar
```

### Step 2: Start Frontend Server
```
1. Open Terminal 2
2. Navigate to Frontend folder: cd Frontend
3. Install dependencies (first time only): npm install
4. Start dev server: npm run dev
5. You should see: "http://localhost:5173" or similar
6. Open browser and go to: http://localhost:5173
```

---

## PART 2: TESTING USER ROLE (Customer)

### Step 1: Register as User
```
1. On the registration page, click "User" option
2. Fill in details:
   - Full Name: Any name
   - Phone: 10 digits (e.g., 9876543210)
   - Email: valid email
   - Password: any password
3. Click Register
4. You'll be logged in automatically and redirected to User Profile
```

### Step 2: Show User Dashboard
```
1. Click on Home (or navigate to home page)
2. Show the categories available (Plumber, Electrician, Painter, etc.)
3. Click on any category to see available service providers
```

### Step 3: Search for Service Providers
```
1. Go to "Search Service Providers"
2. Select a service category
3. Show the list of vendors with:
   - Names
   - Ratings
   - Experience
   - Price estimates
4. Click on any vendor to see their profile
```

### Step 4: Book a Service
```
1. Click on a vendor card
2. Click "Book Service"
3. Fill in service details:
   - Describe the problem
   - Set location (either manual pin or search)
   - Select date/time
4. Click "Confirm Booking"
5. Show the booking confirmation
```

### Step 5: Track Booking Status
```
1. Go to "Service Request History" or "Bookings"
2. Show the booking with current status:
   - Pending (initial state)
   - Later shows: Accepted → On The Way → In Progress → Completed
3. Show live tracking with vendor location (if vendor shared location)
```

---

## PART 3: TESTING VENDOR ROLE (Service Provider)

### Step 1: Register as Vendor
```
1. Open registration page in NEW INCOGNITO WINDOW (to keep user logged in another tab)
2. Click "Vendor" option
3. Fill in details:
   - Full Name: Vendor Name (e.g., "Raj Plumber")
   - Email: different email
   - Mobile: 10 digits
   - Category: Select any (Plumber, Electrician, etc.)
   - Aadhar (optional): 12 digits
   - Experience: years (e.g., 5)
   - Address: any address
   - Working Area: town/city name
   - Password: any password
4. Click Register
5. You'll see approval pending message
```

### Step 2: Show Admin Approval Note
```
1. Point out the warning message:
   "Your account is pending admin approval"
2. Show the message about contacting admin
3. Explain: Admin needs to approve before vendor can accept bookings
```

### Step 3: Set Vendor Profile (Before Approval)
```
1. Click "Vendor Profile Settings"
2. Show that vendor CAN update:
   - Business Name
   - Category
   - Description
   - Price estimates
   - Working location (on map)
3. Click "Set Location" to show map modal
4. Set a location on the map by clicking
5. Click "Done"
6. Click "Save Profile"
```

### Step 4: ADMIN APPROVAL (Switch to Admin)
```
See Part 4 for admin approval process
After approval, come back to vendor and proceed with next steps
```

### Step 5: View New Bookings (After Approval)
```
1. Click "New Bookings" tab
2. Show pending booking requests from users with:
   - Service type
   - Customer name & phone
   - Booking time
   - Problem description
3. Show buttons: Accept / Reject
```

### Step 6: Accept Booking
```
1. Click "Accept" on a booking
2. Show success message
3. Booking moves to "Work In Progress" section
```

### Step 7: Work In Progress Section
```
1. Click "Work In Progress" tab
2. Show the accepted booking with:
   - 📍 Customer location on map
   - 🕐 ETA (estimated time to reach)
   - 💰 Booking amount
   - Status progress timeline (steps 1→2→3→4)
```

### Step 8: Start Live Tracking
```
1. Click "📍 Start Live Tracking" button
2. Browser will ask for location permission
3. Click "Allow"
4. You'll see "Location Shared" confirmation
5. Show current location coordinates displayed
```

### Step 9: Update Booking Status
```
1. On the Active Tasks card, click "Mark as on_the_way"
   (or next status button)
2. Show loading state
3. Status updates on timeline
4. Stats cards at top update in real-time
5. Repeat for: on_the_way → in_progress → completed
```

### Step 10: Completed Tasks
```
1. Click "Completed Tasks" tab
2. Show completed booking with:
   - ✓ Status indicator
   - Completion time
   - Total amount paid
```

### Step 11: Reviews
```
1. Click "Reviews" tab
2. Show customer reviews (if any exist)
3. Show overall rating
4. Each review shows: customer name, rating, review text, date
```

---

## PART 4: TESTING ADMIN ROLE

### Step 1: Go to Admin Login
```
1. Click on "Admin" link on registration page (or navigate to /admin)
2. Alternatively show: /admin in address bar
```

### Step 2: Admin Login
```
1. On Admin page, there are two sections:
   - Admin Login (for existing admins)
   - New Admin Registration (first time setup)
2. If first time: Fill details and create admin account
3. If exists: Use credentials to login
```

### Step 3: Admin Dashboard
```
1. After login, show Admin Dashboard with:
   - Overview cards (Users count, Vendors count, Bookings, etc.)
   - Different tabs for management
```

### Step 4: Approve Vendors
```
1. Click "Pending Vendors" or "Vendor Management" tab
2. Show list of pending vendor approvals
3. Show vendor details:
   - Name
   - Category
   - Phone
   - Experience
   - Location
   - Aadhar (if provided)
   - Certification file (if provided)
4. Click "Approve" action
5. Show success message
```

### Step 5: View Users
```
1. Click "Users" tab
2. Show list of all registered users with:
   - Names
   - Phone numbers
   - Email
   - Registration date
```

### Step 6: View All Bookings
```
1. Click "All Bookings" tab
2. Show bookings with:
   - Booking ID
   - Customer name
   - Service type
   - Vendor name
   - Status
   - Amount
3. Show filter/search functionality
```

### Step 7: Manage Service Categories
```
1. Click "Service Categories" tab
2. Show all categories (Plumber, Electrician, etc.)
3. Show option to add new category
4. Click "Add Category"
5. Enter category name and click add
6. Show it's added to list
```

---

## PART 5: END-TO-END FLOW DEMONSTRATION

### Complete User Journey:
```
1. USER SIDE (First Browser Tab):
   - Show home page with categories
   - Search for plumber service
   - Click on a vendor (the approved vendor from admin)
   - Click "Book Service"
   - Fill booking details
   - Submit booking
   - Show booking request status: "Pending"

2. VENDOR SIDE (Second Browser Tab):
   - Show "New Bookings" section
   - Show the booking request from the user
   - Click "Accept"
   - Switch to "Work In Progress"
   - Show the booking with map
   - Click "Start Live Tracking"
   - Click "Mark as on_the_way"
   - Show stats update: Pending=0, Accepted=1, etc.
   - Click "Mark as in_progress"
   - Show progress timeline advancing
   - Click "Mark as completed"

3. SWITCH BACK TO USER:
   - Refresh the booking page
   - Show status now: "Completed"
   - Go to "Service Request History"
   - Show the completed booking
   - Show option to leave review

4. VENDOR SIDE:
   - Click "Completed Tasks"
   - Show the completed booking listed there
   - If user left review, it appears in "Reviews" tab
```

---

## KEY FEATURES TO HIGHLIGHT

### For User:
- ✓ User registration with validation
- ✓ Service provider search and filter
- ✓ Easy booking with location selection
- ✓ Real-time booking status tracking
- ✓ Live location of vendor on map
- ✓ Ability to leave reviews

### For Vendor:
- ✓ Vendor registration with verification documents
- ✓ Profile management (location, pricing, category)
- ✓ New booking notifications
- ✓ Accept/Reject bookings functionality
- ✓ Real-time location sharing (live tracking)
- ✓ Status progression: Accepted → On Way → In Progress → Completed
- ✓ View completed tasks
- ✓ See customer reviews and ratings
- ✓ Live ETA calculation to customer location

### For Admin:
- ✓ Vendor approval system
- ✓ User management
- ✓ Booking management
- ✓ Service category management
- ✓ Dashboard with statistics
- ✓ Role-based access control

---

## TROUBLESHOOTING DURING DEMO

### Issue: Vendor doesn't see the booking
**Solution:** 
- Make sure vendor is approved by admin first
- Refresh the page
- Check if both servers are running

### Issue: Location not showing on map
**Solution:**
- Make sure to allow browser location permission
- Check if vendor location is set in profile
- Refresh the page

### Issue: Stats not updating
**Solution:**
- Refresh the page
- Check browser console for errors (F12)
- Make sure socket is connected (green indicator)

### Issue: Login fails
**Solution:**
- Check if user email/phone is correct
- Make sure password is correct (case-sensitive)
- Try registering a new account with different email

---

## DEMO VIDEO SCRIPT (Optional)

```
"Smart Connect is a multi-role service booking platform where:

1. USERS can browse service providers, book services, and track progress
2. VENDORS can register, get approved by admin, and manage bookings
3. ADMINS manage vendors, users, and overall system

Let me show you a complete workflow from user perspective through vendor handling it to completion..."
```

---

## TIME ALLOCATION

- **Backend/Frontend Setup**: 2-3 minutes
- **User Registration & Demo**: 5 minutes
- **Vendor Registration & Demo**: 7 minutes
- **Admin Demo**: 5 minutes
- **Complete Flow**: 5-7 minutes
- **Q&A**: 5-10 minutes

**Total: 30-35 minutes**

---

## IMPORTANT NOTES FOR INVIGILATOR

1. **Real-time Updates**: The application uses WebSocket for real-time updates. When a vendor accepts a booking, the user sees it update immediately without refresh.

2. **Location Tracking**: Vendors can share their live location, and users see it on the map with ETA calculation.

3. **Role-Based Access**: Each role (User/Vendor/Admin) can only see and do what's permitted for that role.

4. **Database**: All data is persistent and stored in MongoDB. Changes made during demo will remain.

5. **Responsive Design**: The app works on desktop, tablet, and mobile devices.

6. **Security**: Passwords are hashed, JWT tokens are used for authentication, and role-based access is enforced.

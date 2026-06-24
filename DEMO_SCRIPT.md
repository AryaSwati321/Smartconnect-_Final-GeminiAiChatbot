# STEP-BY-STEP DEMO SCRIPT (Read Aloud to Invigilator)

---

## OPENING STATEMENT (1 minute)

"Good [morning/afternoon], I'm here to demonstrate **Smart Connect**, a comprehensive service booking platform that connects customers with service providers.

The application has three user roles:
1. **Users/Customers** - can search and book services
2. **Vendors/Service Providers** - can accept bookings and manage services  
3. **Admins** - can manage vendors, users, and categories

Let me show you the complete workflow."

---

## START SERVERS & OPEN APP (2 minutes)

"First, let me start the servers..."

**SHOW ON SCREEN:**
1. **Terminal 1**: Show "Backend running on port 5000"
2. **Terminal 2**: Show "Frontend running on http://localhost:5173"
3. **Browser**: Navigate to http://localhost:5173
4. **Point Out**: Home page with service categories (Plumber, Electrician, Painter, Carpenter, Cleaner)

---

## PART 1: USER FLOW (7 minutes)

### Scene 1.1: User Registration (1 minute)

"Let me register as a user...

I'll click on **Register** → Choose **User** option."

**FILL FORM WITH:**
- Full Name: "Avni Patel" (use this for consistency)
- Phone: "9876543210"
- Email: "user@test.com"
- Profile Photo: Upload any image
- Password: "user123"

Click **Register**

"Great! I'm automatically logged in and taken to the user profile."

---

### Scene 1.2: Browse Service Categories (1 minute)

Click **Home** in navigation.

"Here I can see all service categories. Let me search for a **Plumber** who is already approved."

Click **Plumber** category

"I can see a list of plumbers with their:
- Ratings (stars)
- Years of experience  
- Price estimates (min - max)
- Location distance
- Approval status (green checkmark = approved)"

---

### Scene 1.3: View Vendor Profile (1 minute)

Click on the first **approved vendor card**

"Now I can see the vendor's complete profile:
- Business name
- Category
- Full description
- Rating and reviews
- Price estimates
- Location on map"

---

### Scene 1.4: Book a Service (2 minutes)

Click **Book Service** button

"I need to fill in the service booking form:

1. **Service Type** - Already selected (Plumber)
2. **Describe the problem** - Let me type: 'Leaky kitchen tap repair'"
3. **Location** - I can either:
   - Pin location manually on the map (click on map)
   - Search by address
   
Let me pin a location on the map by clicking..."

Click on map to select location

"4. **Date & Time** - Let me select today's date and a time like 2:00 PM
5. **Special Instructions** - Optional, I can add notes

Now click **Confirm Booking**"

"Perfect! The booking is confirmed. Let me check the status..."

Go to **Service Request History** from nav

"Here's my booking showing:
- Customer details (my name, phone)
- Service type (Plumber)
- Location (where I pinned)
- Current Status: **PENDING** (waiting for vendor to accept)
- Amount to be paid

Notice: The status will update in real-time once the vendor accepts this booking."

---

## PART 2: VENDOR FLOW (10 minutes)

"Now let me switch perspective to the **Vendor**. I'll open a new tab to login as a vendor..."

Open new **Incognito Window** → http://localhost:5173/register

---

### Scene 2.1: Vendor Registration (2 minutes)

"Let me register as a vendor...

Click **Vendor** option."

**FILL FORM WITH:**
- Full Name: "Krishna Traders" (or "Raj Plumber")
- Email: "vendor@test.com"
- Mobile: "9876543211"
- Category: **Plumber** (important - match the service type user booked)
- Aadhar: "123456789012" (optional but let me fill it)
- Experience: "5" years
- Address: "123 Business Street"
- Working Area: "Pune" (or your current city)
- Password: "vendor123"

Click **Register**

"I see a message: **Your account is pending admin approval**

This is important - the vendor cannot accept bookings until an admin approves them. Let me set up the profile first, then we'll get admin approval."

---

### Scene 2.2: Set Vendor Profile (2 minutes)

Click **Vendor Profile Settings**

"Before I get approved, I can still update my profile:

**Business Name**: "Krishna Traders - Plumbing Services"
**Category**: Plumber
**Description**: "We provide fast and reliable plumbing services..."
**Price Min**: "200" rupees
**Price Max**: "1500" rupees

Now let me set my service location..."

Click **🗺️ Set Location** button

"A map opens. I can either:
1. Click on the map to pin my location
2. Use 'Use My Current Location' to get my GPS location

Let me pin a location..."

Click on map to select location

"Good! The location is set to: [shows coordinates]

Now I'll **Save Profile**"

"Perfect! Now I need admin approval to accept bookings. Let me go to admin to approve this vendor..."

---

### Scene 2.3: Admin Approval (2 minutes)

Open new tab: http://localhost:5173/admin

"I'm logging in as admin...

**Email**: admin@smartconnect.com
**Password**: admin123

(Or register as new admin if first time)"

Click **Admin** after login

"I'm on the **Admin Dashboard** which shows:
- Total Users
- Total Vendors  
- Total Bookings
- Various management sections

Let me find the **Pending Vendors** section to approve the vendor I just created..."

Click **Pending Vendors** or similar tab

"Here I can see the vendor registration request with:
- Vendor name: Krishna Traders
- Category: Plumber
- Phone number
- Email
- Location set on map
- Experience level
- Certificate file (if provided)

Let me **APPROVE** this vendor..."

Click **Approve** button

"✓ Success! The vendor is now approved. They can now see and accept bookings."

---

### Scene 2.4: Vendor Views New Bookings (1 minute)

Go back to **Vendor Tab** (refresh page if needed)

"Now that I'm approved, I can see the **New Bookings** section shows:

**1 NEW BOOKING**

From customer: Avni Patel
Service: Plumber
Location: [the location we pinned earlier]
Status: PENDING
Problem: "Leaky kitchen tap repair"

This is the booking the user created! It's waiting for my response.

I have two options:
- ✓ Accept (take the job)
- ✕ Reject (decline the job)

Let me **Accept** this booking..."

Click **Accept** button

"Great! The booking is accepted. Let me navigate to **Work In Progress** to see it there..."

---

### Scene 2.5: Active Tasks - Live Tracking (3 minutes)

Click **Work In Progress** tab

"Now I can see this booking in my active tasks. It shows:

**LEFT SIDE - MAP:**
- 📍 Blue pin = My location (vendor)
- 🔵 Cyan pin = Customer's location  
- Blue line = Route between us
- Leaflet map showing the area

**RIGHT SIDE - INFORMATION:**

**⏱️ ESTIMATED TIME**: 
- Shows how many minutes until I reach the customer
- Distance in km
- This is calculated based on straight-line distance

**📍 DELIVERY ADDRESS**: 
- Customer's address where work needs to be done

**NEXT ACTION**:
- Shows I can mark this as 'on_the_way'

**💰 BOOKING VALUE**:
- Amount I'll earn: ₹XXX

**At the top right - Live Tracking option:**

Let me click **📍 Start Live Tracking**"

Browser requests location permission
Allow location access

"✓ Location Shared!

Now my real location is being streamed to the user so they can see where I am on the map in real-time. This builds customer trust.

At the bottom, I can see the **STATUS TIMELINE**:
- Box 1: Accepted ✓ (completed)
- Box 2: On The Way (upcoming)
- Box 3: In Progress (upcoming)
- Box 4: Completed (upcoming)

Let me update the status... I'll click **Mark as on_the_way**"

Click **Mark as on_the_way**

"The status is updating... ⏳

✓ Done! Notice:
- The timeline updated: Box 2 is now highlighted
- The status at top changed
- The stats cards at the top also updated:
  - Accepted count changed
  - On The Way count increased
  
Let me continue... **Mark as in_progress**"

Click **Mark as in_progress**

"✓ Updated! Now the work is in progress.

And finally... **Mark as completed**"

Click **Mark as completed**

"✓ Complete! The job is finished.

This booking will now move to the **Completed Tasks** section."

---

### Scene 2.6: Completed Tasks (1 minute)

Click **Completed Tasks** tab

"Here I can see the completed booking with:
- Service details
- Completion time
- Amount earned
- 5-star rating/review (if user left one)

If I go to **Reviews** section, I can see customer feedback and ratings."

---

## PART 3: USER SEES THE UPDATE (2 minutes)

"Now let me switch back to the **USER TAB** to show what the customer sees..."

Go to user tab → Click **Service Request History**

"The user's booking now shows:
- Status: **COMPLETED** ✓
- Timeline showing all stages: Pending → Accepted → On Way → In Progress → Completed
- Vendor's real-time location history (where vendor went)
- Time taken
- Amount charged
- Option to **Leave a Review**

Let me click **Leave Review**..."

Click Review button

"The user can:
- Rate from 1-5 stars
- Write detailed feedback
- Submit the review

This review will appear on the vendor's profile for future customers to see."

---

## PART 4: ADMIN MANAGEMENT FEATURES (2 minutes)

Go to **Admin Tab**

"Let me show you some admin functionalities:

**1. USER MANAGEMENT:**
Click on **Users** or **Manage Users**

- See all registered users
- Their phone numbers, emails
- Registration date
- Can view, edit, or deactivate users

**2. BOOKING MANAGEMENT:**
Click on **All Bookings** or **Bookings**

- See all bookings in the system
- Filter by status (Pending, Completed, etc.)
- Search by booking ID or customer name
- View full booking details
- See which vendor handled it

**3. CATEGORY MANAGEMENT:**
Click on **Service Categories**

- View all service categories: Plumber, Electrician, Painter, etc.
- Add new categories
- Edit existing categories
- This helps vendors choose their specialty

**4. VENDOR MANAGEMENT:**
Already showed approval, but also can:

- View all vendors
- See their ratings
- View their documents/certificates
- Block or remove vendors if needed
- See their completed bookings count"

---

## CLOSING STATEMENT (1 minute)

"To summarize, **Smart Connect** demonstrates:

✓ **User Features:**
- Easy registration and authentication
- Search and browse service providers
- Real-time booking status tracking
- Live vendor location viewing
- Review and rating system

✓ **Vendor Features:**
- Professional profile management
- New booking notifications
- Real-time location sharing
- Status workflow management (Accept → On Way → In Progress → Complete)
- Earnings tracking
- Customer reviews and ratings

✓ **Admin Features:**
- Vendor approval system for quality control
- User and vendor management
- Booking oversight
- Service category management
- System statistics and analytics

✓ **Technical Highlights:**
- Real-time updates using WebSocket
- Role-based access control
- Responsive design (works on all devices)
- Secure authentication with JWT
- MongoDB database for persistence
- Map integration for location tracking
- ETA calculation

Thank you! Do you have any questions?"

---

## TIME BREAKDOWN

- Opening Statement: 1 min
- Server Setup: 2 min
- **User Flow**: 7 min
- **Vendor Flow**: 10 min
- **User Sees Update**: 2 min
- **Admin Features**: 2 min
- Closing: 1 min
- **Questions**: 5-10 min

**Total: 30-35 minutes**

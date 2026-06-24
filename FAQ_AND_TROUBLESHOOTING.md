# Expected Questions & Answers for Invigilator

## TECHNICAL QUESTIONS

### Q1: "What technology stack did you use?"

**A:** "The application has:

**Frontend:**
- React.js (JavaScript library for UI)
- Tailwind CSS (styling)
- Leaflet (map visualization)
- Socket.io client (real-time updates)
- Axios (API communication)

**Backend:**
- Node.js with Express.js (server)
- MongoDB (database)
- Socket.io (real-time WebSocket communication)
- JWT (JSON Web Tokens) for authentication
- Multer (file uploads for documents)

**Why these choices:**
- React gives us fast, responsive UI
- Node.js allows real-time features with Socket.io
- MongoDB is flexible for different user roles
- JWT for secure, stateless authentication"

---

### Q2: "How does real-time tracking work?"

**A:** "When a vendor clicks 'Start Live Tracking', we:

1. Get the vendor's browser location using Geolocation API
2. Send location (latitude, longitude) to backend via Socket.io every few seconds
3. Backend broadcasts to the user viewing that booking
4. User's map updates in real-time showing vendor's moving location
5. When vendor stops tracking, location updates stop

This happens without page refresh - all real-time via WebSocket."

---

### Q3: "How is authentication secured?"

**A:** "Security measures:

1. **Passwords**: Hashed using bcrypt before storing in database
2. **Authentication**: JWT tokens issued upon login
3. **Token Storage**: Stored in browser's localStorage
4. **Role-Based Access**: Each page checks user role before displaying
5. **Protected Routes**: Backend API endpoints verify JWT token
6. **XSS Protection**: React automatically escapes content
7. **CORS**: Only frontend domain can access backend"

---

### Q4: "What happens if vendor goes offline?"

**A:** "Location tracking:
- Sends location every 10 seconds while enabled
- If no internet: watchPosition stops sending
- Shows error to user
- Can restart tracking when online again

Booking management:
- Changes made are saved to database
- User will see status updates when connection restored
- All data is persistent"

---

### Q5: "How does ETA calculation work?"

**A:** "The system:
1. Gets vendor's location (current)
2. Gets customer's location (from booking)
3. Calculates straight-line distance using Haversine formula
4. Uses average speed of 25 km/h (for service professionals)
5. Converts to minutes: (distance / speed) × 60
6. Shows: 'X minutes away' and 'Y km distance'

This is a simple estimate - actual time depends on traffic, roads, etc."

---

### Q6: "How is data stored?"

**A:** "MongoDB NoSQL database stores:

**Users Collection:**
- Name, email, phone, password hash, profile photo
- Default address, preferences
- Bookings array (references)

**Vendors Collection:**
- Name, email, phone, category
- Location (lat, lng)
- Ratings, reviews, certifications
- Pricing, experience level
- Approval status

**Bookings Collection:**
- User reference, vendor reference
- Service type, description
- Location (GeoJSON format for map queries)
- Status history with timestamps
- Amount, payment status
- Timestamps: created, updated, completed

**Reviews Collection:**
- User reference, vendor reference, booking reference
- Rating (1-5), review text, timestamp

All data is indexed for fast queries and backed up."

---

### Q7: "Can users see vendor location before booking?"

**A:** "Current implementation:
- User can see vendor's profile with business location
- User CAN'T see live location before booking acceptance
- Once vendor accepts, location becomes visible on map

This is for privacy - only confirmed bookings share real-time location.

Future enhancement: Could show estimated arrival before acceptance."

---

### Q8: "What if multiple users book same vendor?"

**A:** "Booking prioritization:
1. Vendor sees all new bookings in queue
2. Can accept or reject any
3. Multiple simultaneous bookings show in 'New Bookings' section
4. Each accepted booking goes to separate card in 'Work In Progress'
5. Vendor updates each separately based on their location

Status update is per-booking, so vendor can be 'on_the_way' for one and 'completed' for another."

---

## FUNCTIONALITY QUESTIONS

### Q9: "Can admin edit bookings?"

**A:** "Admin can:
✓ View all booking details
✓ See status history
✓ View payment status
✓ See customer and vendor communication

Admin currently cannot:
✗ Modify booking status (only vendor can)
✗ Cancel completed bookings
✗ Change payment amount (security)

This is intentional - maintains data integrity and trust between parties."

---

### Q10: "How are service categories created?"

**A:** "Two ways:

1. **Admin adds categories**: 
   - Admin dashboard → Service Categories
   - Click 'Add Category'
   - Enter name, click save
   - Immediately available for vendors to select

2. **Organized structure**:
   - Categories: Plumber, Electrician, Painter, Carpenter, Cleaner
   - Each with description
   - Vendors choose one main category
   - Can specify 'Other' with custom name

Future: Could allow subcategories (e.g., Plumbing → Tap Repair, Pipe Installation)"

---

### Q11: "What if vendor rejects a booking?"

**A:** "When vendor clicks 'Reject':
1. Booking status changes to 'rejected'
2. Goes to vendor's 'Service Request History'
3. User sees status changed to 'rejected'
4. User can:
   - See rejection reason (if vendor provides)
   - Book another vendor for same service
   - Message vendor asking why (future enhancement)

Next steps: System could auto-recommend other vendors in that category"

---

### Q12: "Can vendors set their availability?"

**A:** "Currently: Vendors are 'always available' when they set location

Future enhancements planned:
- Set working hours (9 AM - 6 PM)
- Set days off
- Set vacation mode
- Mobile app notifications for new bookings
- Bulk availability calendar"

---

### Q13: "How are prices calculated?"

**A:** "Current system:
- Vendor sets minimum price (e.g., ₹200)
- Vendor sets maximum price (e.g., ₹1500)
- User sees range
- Final quote given before booking confirmation
- User pays final amount (shown in booking)

Future: Could add:
- Fixed prices for common tasks
- Dynamic pricing based on demand/time
- Discounts and coupons system
- Payment plans for large jobs"

---

### Q14: "What if user and vendor dispute about payment?"

**A:** "Current system uses offline payment model:
- Shows agreed amount
- Booking recorded with amount
- Admin can see transaction details
- Reviews help maintain accountability

Future: Could add:
- In-app payment gateway (Razorpay, Stripe)
- Escrow system (payment held until completion)
- Dispute resolution system
- Refund management"

---

## DEMO-TIME QUESTIONS

### Q15: "Why is vendor not seeing the booking?"

**A:** "Check:

1. **Is vendor approved?** → Go to admin, approve first
2. **Same category?** → User booked 'Plumber', vendor chose 'Plumber'?
3. **Both servers running?** → Check terminals
4. **Try refreshing** → Sometimes socket needs reconnect
5. **Location set?** → Vendor must set location to accept bookings
6. **Different emails?** → Must be logged in as different user

These are the common issues - if still stuck, check browser console (F12) for errors."

---

### Q16: "Location not showing on map?"

**A:** "The map shows location if:
✓ Browser permission granted
✓ Device has GPS (desktop may not have accurate GPS)
✓ User selected location when booking
✓ Vendor set service location

To test without real GPS:
- For user: Click on map, it pins coordinates
- For vendor: Click 'Set Location' and pin on map
- For tracking: If browser doesn't support or denies permission, shows alert

In real-world: Mobile devices have accurate GPS"

---

### Q17: "Why is my account not saving?"

**A:** "Possible reasons:

1. **Validation failed** → Check error message
   - Phone must be 10 digits
   - Email must be valid
   - Password required
   - Aadhar must be 12 digits (if provided)

2. **Network issue** → Check if backend is running
3. **Database down** → Restart backend server
4. **Permissions** → Browser might need refresh

Always check browser console (F12) for detailed error messages."

---

### Q18: "Can I test with multiple devices?"

**A:** "Yes! 

**Desktop:**
- Use multiple browser tabs (User, Vendor, Admin)
- Use incognito windows for clean sessions

**Mobile/Tablet:**
- If on same WiFi, access: http://[your-ip]:5173
- Replace [your-ip] with your computer's IP
- Shows real GPS location (better than desktop)

**Important for demo:**
- Use desktop for main demo
- Have mobile as backup to show GPS location tracking
- Improves visual impact of live tracking feature"

---

### Q19: "How do I reset the database?"

**A:** "If you need clean data:

**Option 1: Delete and recreate**
- Stop backend server
- Go to MongoDB (if local)
- Drop all collections
- Start backend - will auto-create schema

**Option 2: Soft reset**
- Keep backend running
- Delete from collections manually
- Or create new test accounts

**For demo:** Just create new accounts with different emails each time - simpler and safer."

---

## POTENTIAL ISSUES & QUICK FIXES

| Issue | Solution |
|-------|----------|
| Button not responding | Refresh page, check console |
| Data not saving | Check network, restart backend |
| Location showing wrong | Clear browser cache, restart |
| Map not loading | Check internet, reload page |
| Real-time update delayed | Check WiFi connection quality |
| Can't login | Check email/password, case-sensitive |
| Vendor not seeing bookings | Check if vendor approved by admin first |
| Stats not updating | Refresh page or restart browser tab |
| Image upload fails | Check file size (< 5MB), PNG/JPG format |

---

## KEY FEATURES TO EMPHASIZE

When explaining to invigilator, highlight:

1. **Real-Time Sync:** 
   - User sees vendor accept within seconds
   - No page refresh needed
   - Uses WebSocket technology

2. **Security:** 
   - Password hashing
   - JWT authentication
   - Role-based access control

3. **Location Intelligence:**
   - Lives tracking with map
   - ETA calculation
   - Distance measurement

4. **Complete Workflow:**
   - From booking → Acceptance → Completion
   - Status tracking at each step
   - Review and rating system

5. **Admin Control:**
   - Vendor approval process
   - System-wide visibility
   - Category management

6. **User Experience:**
   - Responsive design
   - Intuitive navigation
   - Clear status indicators
   - Professional UI

---

## IF ASKED ABOUT IMPROVEMENTS

"Future enhancements we could add:

**Phase 2 Features:**
- In-app payment integration
- SMS/Email notifications
- Mobile app (React Native)
- Vendor chat with users
- Booking history analytics
- Referral bonuses
- Two-person jobs with multiple vendors
- Service subscription plans

**Performance:**
- Redis caching buffer
- Image optimization
- PWA (Progressive Web App)
- Offline mode

**Safety:**
- Vendor background verification
- User review verification
- Dispute resolution system
- Emergency contact integration"

---

## FINAL CHECKLIST BEFORE DEMO

- [ ] Both servers running
- [ ] Data exists (vendors, users, bookings)
- [ ] At least one vendor approved
- [ ] Test accounts ready
- [ ] Browser tabs organized (User, Vendor, Admin)
- [ ] WiFi stable
- [ ] Volume up if showing anything with sound
- [ ] Have this Q&A document ready to reference
- [ ] 30-35 minutes allocated
- [ ] Notepaper for taking questions

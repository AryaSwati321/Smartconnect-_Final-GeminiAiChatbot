# Booking Completion Request - Testing Guide

## Setup

Before testing, ensure both backend and frontend are running:

```bash
# Terminal 1 - Backend
cd Backend
npm install  # if needed
npm start

# Terminal 2 - Frontend  
cd Frontend
npm install  # if needed
npm run dev
```

## Test Case 1: Basic Completion Approval (Happy Path)

### Prerequisites
- One user account (ready to book)
- One vendor account (approved by admin)
- Service category exists

### Steps

1. **Create Booking (as User)**
   - Navigate to home page
   - Search for vendors by category
   - Select a vendor
   - Fill in address, time, description
   - Click "Book Service"
   - Status should be: **pending**
   - Copy the booking ID

2. **Accept Booking (as Vendor)**
   - Login as vendor
   - Go to "Pending Requests"
   - Find the booking
   - Click "Accept Request"
   - Status should change to: **accepted**

3. **Start Service (as Vendor)**
   - Go to "Work in Progress"
   - Click booking
   - Click "Mark as On the way"
   - Status should change to: **on_the_way**
   - Click "Mark as In progress"
   - Status should change to: **in_progress**

4. **Request Completion (as Vendor)**
   - From "Work in Progress" page
   - Click "Mark as Request Completion"
   - Status should change to: **completion_requested**
   - Should see message "⏳ Awaiting User Approval"

5. **Approve Completion (as User)**
   - Navigate to BookingDetail or Tracking page
   - Look for "Service Completion Request" section
   - Review vendor and service details
   - Click "Approve & Complete"
   - Status should change to: **completed**
   - Should see success message

6. **Verify History (as Either)**
   - Check booking history
   - Should show all status transitions with timestamps

### Expected Results
- ✅ Status transitions: pending → accepted → on_the_way → in_progress → completion_requested → completed
- ✅ User receives notification when vendor requests completion
- ✅ Vendor receives notification when user approves
- ✅ Booking marked as completed after user approval

---

## Test Case 2: Completion Rejection (Revision Path)

### Prerequisites
- Same as Test Case 1, but stop at step 4 (vendor requests completion)

### Steps

1. **Complete steps 1-4 from Test Case 1**
   - End with status: **completion_requested**

2. **Reject Completion (as User)**
   - Navigate to BookingDetail or Tracking
   - See "Service Completion Request" section
   - Enter rejection reason (e.g., "Paint job incomplete on wall")
   - Click "Request Revision"
   - Status should change back to: **in_progress**

3. **Vendor Sees Rejection**
   - Vendor should receive notification with reason
   - Notification should include: "User has rejected your completion request. Reason: Paint job incomplete on wall"

4. **Vendor Continues Work**
   - Vendor can now work on the issues
   - After completing work, requests completion again
   - Click "Mark as Request Completion"
   - Status back to: **completion_requested**

5. **User Approves Second Attempt**
   - User reviews work again
   - Click "Approve & Complete"
   - Status changes to: **completed**

### Expected Results
- ✅ Status transitions: in_progress → completion_requested → in_progress → completion_requested → completed
- ✅ Rejection reason shown to vendor
- ✅ Multiple cycles supported
- ✅ Final approval works after revision

---

## Test Case 3: Multiple Rejections

### Steps

1. Follow Test Case 2
2. After first approval, repeat the rejection and resubmission cycle 2-3 times
3. Final approval should work regardless of number of previous rejections

### Expected Results
- ✅ Infinite cycles supported
- ✅ Each rejection reason preserved in history
- ✅ Final status is completed

---

## Test Case 4: UI Elements Verification

### For User (when status = completion_requested)

Check BookingDetail page:
- [ ] "Service Completion Request" section visible
- [ ] Explanation text about reviewing work
- [ ] Text area for rejection reason
- [ ] "Approve & Complete" button active
- [ ] "Request Revision" button disabled until reason entered
- [ ] Button text and styling correct

Check Tracking page:
- [ ] Same elements as BookingDetail
- [ ] Real-time map update working
- [ ] Status timeline correct
- [ ] Vendor location visible

### For Vendor (when status = completion_requested)

Check VendorWorkInProgress page:
- [ ] Status shows "Awaiting User Approval"
- [ ] Blue status indicator with amber/yellow color
- [ ] "NEXT ACTION" section shows: "⏳ Awaiting User Approval"
- [ ] No "Finalize completion" button present
- [ ] Timeline shows 5 stages (not 6), ending with "completion_requested"
- [ ] Message explains user needs to review

### Dashboard/Overview
- [ ] Status colors correct
- [ ] Completion_requested shown with amber/yellow color
- [ ] Booking appears in "Active" section
- [ ] Booking disappears from "Active" after completion

---

## Test Case 5: Notification System

### Steps

1. Complete Test Case 1 or 2
2. Check both user and vendor browsers for notifications

### Vendor Receives
- [ ] When status changes to completion_requested: (standard status update via Socket.IO)
- [ ] When user approves:
  - Type: "completion_approved"
  - Message: "User has approved service completion. Booking is now complete."
- [ ] When user rejects:
  - Type: "completion_rejected"
  - Message includes rejection reason

### User Receives
- [ ] Standard booking updates via Socket.IO
- [ ] Real-time status changes
- [ ] No specific notification for completion_requested (user sees it in UI)

### Expected Results
- ✅ All notifications delivered via Socket.IO
- ✅ Notification types correct
- ✅ Messages include relevant details
- ✅ Notifications appear in real-time

---

## Test Case 6: Edge Cases

### Edge Case 6.1: Vendor Approval Requirement
1. Create vendor account that's NOT approved by admin
2. Try to request completion
3. Should get error: "Your vendor account is pending admin approval"

### Edge Case 6.2: Booking ID Not Found
1. Try to approve/reject booking with fake ID
2. Should get error: "Booking not found or not ready for confirmation/rejection"

### Edge Case 6.3: Wrong Role
1. Vendor tries to approve/reject completion (as user endpoint)
2. Should get error: "Only users can confirm completion"
3. User tries to request completion (as vendor endpoint)
4. Should get error: "Only vendors can update status"

### Edge Case 6.4: Invalid Status
1. Try to approve when status is NOT "completion_requested"
2. Should get error: "Booking not found or not ready for confirmation"

### Edge Case 6.5: Empty Rejection Reason
1. Try to reject without entering reason
2. Button should be disabled
3. If somehow sent, backend should accept but use default message

### Expected Results
- ✅ All error conditions handled gracefully
- ✅ Appropriate error messages returned
- ✅ No crashes or 500 errors
- ✅ Data integrity maintained

---

## Test Case 7: History & Audit Trail

### Steps

1. Complete a full cycle (request → approve) or (request → reject → request → approve)
2. Check booking history

### Expected History Entries

Should see entries like:
- `action: 'in_progress'` - "Service started"
- `action: 'completion_requested'` - "Vendor updated status to completion_requested"
- `action: 'completion_rejected'` - "User rejected completion request - work needs to be redone" (if rejected)
- `action: 'completed'` - "User approved service completion"

### Expected Results
- ✅ All transitions logged
- ✅ Timestamps accurate
- ✅ User/vendor info preserved
- ✅ Reason text included when applicable

---

## Test Case 8: Real-time Updates (Socket.IO)

### Steps

1. Open two browser windows (one as user, one as vendor)
2. Perform status changes
3. Observe real-time updates

### Expected Results
- ✅ User sees status changes in real-time
- ✅ Vendor sees status changes in real-time
- ✅ Map location updates work
- ✅ No page refresh needed
- ✅ Notifications appear instantly

---

## Troubleshooting Checklist

| Issue | Solution |
|-------|----------|
| "Approval button not visible" | Check status is "completion_requested" |
| "Rejection button disabled" | Enter text in reason textarea |
| "Notifications not appearing" | Check Socket.IO connection in browser console |
| "Status not updating" | Refresh page, check API response in Network tab |
| "Can't request completion" | Check vendor is approved by admin |
| "Error: Booking not found" | Check booking ID in URL matches |
| "Button says 'Processing...' forever" | Check backend logs, server might be down |
| "Old status still showing" | Clear browser cache and refresh |

---

## Performance Considerations

- Database queries optimized with `.lean()`
- Socket.IO broadcasts to relevant rooms only
- History stored as array in document (consider pagination if grows too large)
- Status transitions validated server-side

---

## Success Criteria

All tests should pass with:
- ✅ No errors in browser console
- ✅ No errors in backend terminal
- ✅ All status transitions work correctly
- ✅ Notifications delivered in real-time
- ✅ History accurately recorded
- ✅ Multiple cycles work
- ✅ Edge cases handled gracefully
- ✅ UI elements styled and functional

---

## Sign-Off

Date Tested: ___________
Tested By: ___________
All Tests Passed: ☐ Yes ☐ No
Notes: 


# Testing Guide - Auto Task Detection & Dismiss Features

## Prerequisites
- Backend running on port 3000
- Frontend running on port 5173
- WhatsApp Web connected

---

## Test 1: Auto Task Detection with AI

### Setup
Ensure you have `GROQ_API_KEY` set in `.env`

### Steps
1. Send yourself a WhatsApp message from another device or contact:
   ```
   "Can you remind me to call the vendor tomorrow morning?"
   ```

2. Check backend terminal logs:
   ```
   Expected output:
   🔍 Auto-detecting tasks from message: "Can you remind me to call the vendor..."
   🚀 Using Groq for task detection...
   ✅ Found 1 tasks with Groq
   📝 Stored detected task: "call the vendor tomorrow morning" from [Sender Name]
   ```

3. Open browser and navigate to: http://localhost:5173/tasks

4. Verify you see:
   - Task card with "call the vendor tomorrow morning"
   - Priority badge showing "Medium" or "High"
   - Category tag (likely "communication")
   - Deadline showing "tomorrow"
   - Sender name displayed
   - "Add to Todoist" button

5. Click "Add to Todoist"
   - Button should show spinner
   - Alert should confirm: "✅ Task added to Todoist"
   - Check your Todoist account to verify

### Expected Result
✅ Task detected automatically
✅ Task stored and displayed
✅ Task successfully added to Todoist

---

## Test 2: Auto Task Detection Fallback (Keywords)

### Setup
Remove or comment out `GROQ_API_KEY` in `.env`

### Steps
1. Send yourself:
   ```
   "Please send me the report by Friday"
   ```

2. Check backend logs:
   ```
   Expected:
   🔍 Auto-detecting tasks from message: "Please send me the report..."
   ⚠️  Groq failed: [some error]
   📋 Using keyword-based task extraction...
   ✅ Found 1 tasks with keyword extraction
   ```

3. Navigate to http://localhost:5173/tasks

4. Verify task appears with:
   - Task: "send me the report by Friday"
   - Priority badge
   - Sender info

### Expected Result
✅ Fallback detection works
✅ Task stored correctly
✅ UI displays task

---

## Test 3: Mark as Read + Auto Dismiss

### Steps
1. Ensure you have unread messages in Dashboard

2. Locate a thread with unread messages (green badge showing unread count)

3. Click the **green checkmark (✓)** button in the thread header

4. Observe:
   - Thread disappears immediately from view
   - No error messages in console
   - Other threads remain visible

5. Check backend logs:
   ```
   Expected:
   ✅ Thread [JID] dismissed from preview
   ```

6. Send a new message to the same contact/group

7. Verify:
   - Thread reappears in Dashboard
   - New message is shown as unread
   - Can mark as read again

### Expected Result
✅ Thread dismisses on mark as read
✅ Thread reappears on new message
✅ No errors or glitches

---

## Test 4: Multiple Tasks Detection

### Steps
1. Send a complex message:
   ```
   "Hey! Can you:
   1. Call John tomorrow at 3pm
   2. Send the invoice by end of day
   3. Book the meeting room for Friday
   
   Thanks!"
   ```

2. Check backend logs for multiple detections

3. Navigate to /tasks page

4. Verify multiple task cards appear

### Expected Result
✅ Multiple tasks detected from single message
✅ All tasks displayed correctly
✅ Each can be added to Todoist independently

---

## Test 5: Group Message Task Detection

### Steps
1. Join a WhatsApp group (or use existing one)

2. Have someone send a message in the group:
   ```
   "@all don't forget to submit reports by tonight"
   ```

3. Check if task is detected:
   - Backend logs should show detection
   - /tasks page should list the task
   - Sender should be the group member's name
   - Task context should mention group

### Expected Result
✅ Group messages processed correctly
✅ Sender identified properly
✅ Tasks stored with group context

---

## Test 6: Urgent Task Detection

### Steps
1. Send message with urgency keywords:
   ```
   "URGENT: Need camera equipment pickup ASAP. Call me immediately!"
   ```

2. Check /tasks page:
   - Priority badge should be RED
   - Priority label should say "Urgent"

3. Verify in backend logs that priority was set to 1

### Expected Result
✅ Urgency keywords detected
✅ Priority set to "Urgent" (1)
✅ Visual indicators correct

---

## Test 7: No Task Detection (Negative Test)

### Steps
1. Send a casual message with no tasks:
   ```
   "Hey! How are you doing? The weather is nice today."
   ```

2. Check backend logs:
   ```
   Expected:
   🔍 Detecting tasks from message: "Hey! How are you..."
   ❌ No task keywords found
   (No further processing)
   ```

3. Verify /tasks page doesn't add this message

### Expected Result
✅ No false positives
✅ Non-task messages ignored
✅ System performs efficiently

---

## Test 8: Dashboard Navigation

### Steps
1. Start at Dashboard (http://localhost:5173/)

2. Verify header buttons:
   - 🔔 Sound toggle (click to toggle)
   - □ CheckSquare icon (should be present)
   - 📄 FileText icon (Templates)
   - 📋 Briefing icon
   - 🔄 Refresh

3. Click CheckSquare (□) icon

4. Should navigate to: http://localhost:5173/tasks

5. Click browser back or "← Back" button

6. Should return to Dashboard

### Expected Result
✅ All navigation buttons work
✅ Routes configured correctly
✅ No navigation errors

---

## Test 9: End-to-End Workflow

### Complete User Journey
1. **Start**: User receives WhatsApp message with task
2. **Auto-Detection**: System detects and stores task
3. **Review Messages**: User opens Dashboard, sees thread
4. **Generate Draft**: User clicks "Professional" to generate reply
5. **Send Reply**: User sends the generated draft
6. **Mark as Read**: User clicks ✓ to mark thread as read
7. **Dismiss**: Thread disappears from Dashboard
8. **Review Tasks**: User navigates to /tasks page
9. **Add to Todoist**: User clicks "Add to Todoist"
10. **Complete**: Task is in Todoist, thread is dismissed

### Expected Result
✅ Smooth workflow from start to finish
✅ No errors or interruptions
✅ All features work together

---

## Common Issues & Solutions

### Issue: Tasks not detected
**Solution**: 
- Check GROQ_API_KEY is set
- Verify message contains task keywords
- Check backend logs for errors

### Issue: Can't add to Todoist
**Solution**:
- Verify TODOIST_API_KEY is set
- Check API key is valid
- Test API key with curl:
  ```bash
  curl "https://api.todoist.com/rest/v2/projects" \
    -H "Authorization: Bearer YOUR_API_KEY"
  ```

### Issue: Threads not dismissing
**Solution**:
- Ensure backend is running
- Check browser console for errors
- Verify /mark-read endpoint returns success
- Try hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

### Issue: UI not updating
**Solution**:
- Clear browser cache
- Hard refresh page
- Check frontend console for React errors
- Restart frontend dev server

---

## Performance Benchmarks

### Expected Response Times
- Task detection: < 2 seconds (with AI)
- Task detection: < 100ms (keywords only)
- Mark as read: < 500ms
- Load tasks page: < 1 second
- Add to Todoist: < 2 seconds

### Memory Usage
- Detected tasks stored: Max 500
- Monitored messages: Max 1000
- Dismissed threads: In-memory (cleared on restart)

---

## Automated Testing (Future)

### Suggested Test Cases
```javascript
describe('Task Detection', () => {
  test('detects task with "can you"', async () => {
    const result = await taskManager.detectTasks('Can you call John?');
    expect(result.hasTasks).toBe(true);
    expect(result.tasks).toHaveLength(1);
  });
  
  test('ignores casual messages', async () => {
    const result = await taskManager.detectTasks('Hello, how are you?');
    expect(result.hasTasks).toBe(false);
  });
});
```

---

## Test Checklist

Copy and paste to track your testing:

```
Manual Testing Checklist:
□ Test 1: Auto Task Detection with AI
□ Test 2: Fallback keyword detection
□ Test 3: Mark as read + dismiss
□ Test 4: Multiple tasks detection
□ Test 5: Group message detection
□ Test 6: Urgent task detection
□ Test 7: No false positives
□ Test 8: Dashboard navigation
□ Test 9: End-to-end workflow

Integration Testing:
□ Backend + Frontend communication
□ API endpoints responding correctly
□ Data persistence across requests
□ Error handling working properly

UI/UX Testing:
□ All buttons clickable
□ No visual glitches
□ Responsive design working
□ Loading states display correctly
□ Error messages are user-friendly

Performance Testing:
□ Page loads < 2 seconds
□ No memory leaks
□ Large message lists handled
□ Concurrent requests work

Production Readiness:
□ Environment variables documented
□ Error logging comprehensive
□ No console errors in production mode
□ Security considerations reviewed
```

---

## Need Help?

If tests fail or you encounter issues:
1. Check the implementation summary: `FIXES_IMPLEMENTATION_SUMMARY.md`
2. Review backend logs for detailed error messages
3. Verify all dependencies are installed (`npm install`)
4. Ensure environment variables are set correctly
5. Try restarting both backend and frontend servers

Happy Testing! 🚀

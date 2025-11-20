# Testing Frontend → Database Connection

## ✅ Connection Status
Your app is **WORKING** and connected to the database!

Evidence from backend logs:
```
✅ MySQL Database connected successfully
GET /api/stocks?shopId=SHOP001 200 2.754 ms - 555
POST /api/auth/verify-code 200 80.093 ms - 399
POST /api/tokens 200 7.784 ms - 97
POST /api/notifications 200 5.103 ms - 56
```

## 🔍 How to Monitor API Calls

### Method 1: Browser DevTools (Recommended)

1. **Open DevTools**: Press `F12` in your browser
2. **Go to Network Tab**
3. **Filter by**: `Fetch/XHR`
4. **Perform actions** in the UI and watch requests appear

**What to look for:**
- Request URL: `http://localhost:5000/api/stocks`
- Method: `GET`, `POST`, `PATCH`
- Status: `200` (success), `400` (bad request), `500` (error)
- Response: JSON data from database

### Method 2: Backend Terminal Logs

Watch the terminal running `npm run dev` in backend folder:

```
GET /api/stocks?shopId=SHOP001 200 2.754 ms - 555
                                ^^^
                                Status 200 = SUCCESS!
```

### Method 3: MySQL Workbench Queries

Run these queries to see real-time data:

```sql
-- View all stock items
SELECT * FROM stock_items WHERE shop_id='SHOP001';

-- View recent tokens (refreshed when you book)
SELECT * FROM tokens ORDER BY created_at DESC LIMIT 5;

-- View recent notifications
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;

-- View all users
SELECT id, email, name, role FROM users;
```

## 🧪 Test Write Operations

### Test 1: Update Stock (Admin Dashboard)

**Steps:**
1. Login as admin: `admin@rationshop.gov.in`
2. Go to Stock Management
3. Click on any item (e.g., Rice)
4. Change quantity to a new value
5. Save

**What happens:**
- Frontend sends: `PATCH /api/stocks/rice`
- Backend updates database
- Frontend refetches: `GET /api/stocks?shopId=SHOP001`

**Verify in MySQL:**
```sql
SELECT item_name, quantity, updated_at 
FROM stock_items 
WHERE shop_id='SHOP001' AND item_code='rice';
```

### Test 2: Book Token (Cardholder)

**Steps:**
1. Login as cardholder: `ramesh.kumar@example.com`
2. Go to Tokens tab
3. Book a new token
4. Select date and time slot

**What happens:**
- Frontend sends: `POST /api/tokens`
- Backend inserts into database
- Frontend refetches: `GET /api/tokens/my`

**Verify in MySQL:**
```sql
SELECT * FROM tokens 
WHERE user_id = 2 
ORDER BY created_at DESC LIMIT 1;
```

### Test 3: Send Notification (Admin)

**Steps:**
1. Login as admin
2. Go to Alerts tab
3. Create a new notification
4. Send message

**What happens:**
- Frontend sends: `POST /api/notifications`
- Backend inserts into database

**Verify in MySQL:**
```sql
SELECT * FROM notifications 
ORDER BY created_at DESC LIMIT 1;
```

## 📊 Database Schema Reference

### Key Tables:
- `users` - 9 users (1 admin + 8 cardholders)
- `shops` - 3 shops (SHOP001, SHOP002, SHOP003)
- `stock_items` - 12 items (rice, wheat, sugar, kerosene per shop)
- `tokens` - Queue booking records
- `notifications` - Alert messages
- `complaints` - User complaints
- `monthly_allocations` - Quota tracking

### Sample User Credentials:

**Admin:**
- Email: `admin@rationshop.gov.in`
- Shop: SHOP001 (Delhi)

**AAY Cardholders (35kg quota):**
- `ramesh.kumar@example.com` - 6 members, SHOP001
- `lakshmi.devi@example.com` - 4 members, SHOP003
- `suresh.patel@example.com` - 5 members, SHOP002

**PHH Cardholders (5kg × family_size):**
- `vijay.singh@example.com` - 4 members = 20kg, SHOP001
- `meena.sharma@example.com` - 3 members = 15kg, SHOP002

## 🎯 Quick Verification Script

Run this in MySQL Workbench to see all current data:

```sql
-- Check all data at once
SELECT 'SHOPS' AS table_name, COUNT(*) AS count FROM shops
UNION ALL
SELECT 'USERS', COUNT(*) FROM users
UNION ALL
SELECT 'STOCK_ITEMS', COUNT(*) FROM stock_items
UNION ALL
SELECT 'TOKENS', COUNT(*) FROM tokens
UNION ALL
SELECT 'NOTIFICATIONS', COUNT(*) FROM notifications
UNION ALL
SELECT 'COMPLAINTS', COUNT(*) FROM complaints
UNION ALL
SELECT 'ALLOCATIONS', COUNT(*) FROM monthly_allocations;
```

Expected results:
- SHOPS: 3
- USERS: 9
- STOCK_ITEMS: 12
- TOKENS: 8+
- NOTIFICATIONS: 6+
- COMPLAINTS: 4+
- ALLOCATIONS: 20

## 🐛 Troubleshooting

### If API calls fail:

1. **Check backend is running:**
   ```
   ✅ Should see: Server running on port 5000
   ✅ Should see: MySQL Database connected successfully
   ```

2. **Check database password:**
   - File: `backend/.env`
   - Set `DB_PASSWORD=` (blank for no password)
   - Or `DB_PASSWORD=your_actual_password`

3. **Check CORS:**
   - Backend allows: `http://localhost:3001`
   - Frontend runs on: `http://localhost:3001`

4. **Check Network tab for errors:**
   - 401 = Not authenticated (need to login)
   - 403 = Forbidden (wrong role)
   - 500 = Server error (check backend logs)

## ✅ Success Indicators

You'll know it's working when you see:

1. **Backend terminal shows:**
   ```
   GET /api/stocks?shopId=SHOP001 200 2.754 ms
   POST /api/tokens 200 7.784 ms
   ```

2. **Browser Network tab shows:**
   - Green status codes (200)
   - JSON responses with data

3. **MySQL shows updated data:**
   - New rows appear after POST requests
   - Existing rows change after PATCH requests
   - `updated_at` timestamps change

## 🚀 Current Status

Based on your backend logs, everything is **CONNECTED AND WORKING**:

✅ Database connected  
✅ API endpoints responding  
✅ Authentication working  
✅ Stock data being fetched  
✅ Tokens being created  
✅ Notifications being sent  

**The app is fully functional with real database!** 🎉

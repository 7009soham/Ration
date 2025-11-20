# Database Migration Guide

## Problem
The database schema has been updated with:
- New `shopkeeper` role
- New flagging columns (`is_flagged`, `flag_reason`, `flagged_by`, `flagged_at`)
- New stock tracking (`government_allocated`, `allocated_by`)
- New `stock_audit_log` table

**You must recreate the database to apply these changes.**

---

## Step-by-Step Migration

### 1. Backup Current Data (Optional)
If you need to preserve any data:
```sql
-- In MySQL Workbench, export data from each table
SELECT * FROM users;
SELECT * FROM stock_items;
-- etc.
```

### 2. Drop and Recreate Database

**Option A: Using MySQL Workbench**
1. Open MySQL Workbench
2. Connect to your local MySQL server
3. Run these commands in a new SQL tab:

```sql
-- Drop existing database
DROP DATABASE IF EXISTS ration_tds;

-- Create fresh database
CREATE DATABASE ration_tds CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE ration_tds;
```

4. Open `schema.sql` file
5. Click "Execute" (⚡ lightning icon) to run all statements

### 3. Verify Database Structure

Run this query to check if all tables were created:
```sql
USE ration_tds;
SHOW TABLES;
```

You should see:
- shops
- users
- stock_items
- stock_audit_log
- monthly_allocations
- tokens
- notifications
- complaints
- verification_codes

### 4. Verify Sample Data

Check users table for 3 roles:
```sql
SELECT id, email, role, name, shop_id, is_flagged FROM users;
```

Expected output:
| id | email | role | name | shop_id | is_flagged |
|----|-------|------|------|---------|------------|
| 1 | admin@rationshop.gov.in | admin | Rajesh Kumar | SHOP001 | 0 |
| 2 | shopkeeper.shop001@fps.gov.in | shopkeeper | Ramesh Verma | SHOP001 | 0 |
| 3 | shopkeeper.shop002@fps.gov.in | shopkeeper | Suresh Patil | SHOP002 | 0 |
| 4 | shopkeeper.shop003@fps.gov.in | shopkeeper | Kumar Rajan | SHOP003 | 0 |
| 5 | ramesh.kumar@example.com | cardholder | Ramesh Kumar | SHOP001 | 0 |
| ... | ... | ... | ... | ... | ... |

Check stock_items for government_allocated column:
```sql
SELECT shop_id, item_code, government_allocated, quantity FROM stock_items LIMIT 5;
```

Expected:
| shop_id | item_code | government_allocated | quantity |
|---------|-----------|---------------------|----------|
| SHOP001 | rice | 500.00 | 500.00 |
| SHOP001 | wheat | 450.00 | 450.00 |
| ... | ... | ... | ... |

---

## Quick Commands for PowerShell

If you have MySQL command line installed:

```powershell
# Navigate to project folder
cd C:\Akshay_project\Ration_TDS

# Drop and recreate (Windows - adjust path to your MySQL)
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "DROP DATABASE IF EXISTS ration_tds; CREATE DATABASE ration_tds CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Import schema
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p ration_tds < backend\schema.sql
```

---

## After Migration

### 1. Restart Backend Server

```powershell
cd backend
npm run dev
```

### 2. Test Login Credentials

**Admin (Government Official)**
- Email: `admin@rationshop.gov.in`
- Role: admin
- Can: Allocate stock, flag shopkeepers, view audit logs

**Shopkeepers (FPS Dealers)**
- SHOP001: `shopkeeper.shop001@fps.gov.in`
- SHOP002: `shopkeeper.shop002@fps.gov.in`
- SHOP003: `shopkeeper.shop003@fps.gov.in`
- Role: shopkeeper
- Can: Update daily stock (quantity only)

**Cardholders (End Users)**
- AAY: `ramesh.kumar@example.com` (SHOP001)
- PHH: `vijay.singh@example.com` (SHOP001)
- PHH: `meena.sharma@example.com` (SHOP002)
- Role: cardholder
- Can: View stock, book tokens, file complaints

### 3. Login Process (All Roles)

1. Open `http://localhost:3001`
2. Enter email
3. Select role (admin/shopkeeper/cardholder)
4. Click "Send Code"
5. Check backend terminal for OTP code (e.g., `✅ Verification code sent to admin@rationshop.gov.in (Code: 123456)`)
6. Enter 6-digit OTP
7. Click "Verify & Login"

---

## Testing the Anti-Tampering System

### Test 1: Admin Views Users
1. Login as admin
2. Click "Users" tab in bottom navigation
3. Should see:
   - Statistics by shop (shopkeepers, cardholders, flagged counts)
   - Filter by role/shop
   - List of all users

### Test 2: Flag a Shopkeeper
1. In Users tab, find a shopkeeper (e.g., Ramesh Verma)
2. Click "Flag" button
3. Enter reason: "Stock discrepancy - 200kg missing"
4. Verify user card turns red with flag badge
5. Check database:
   ```sql
   SELECT id, name, role, is_flagged, flag_reason FROM users WHERE is_flagged = TRUE;
   ```

### Test 3: Stock Audit Trail
1. Login as shopkeeper: `shopkeeper.shop001@fps.gov.in`
2. Update rice stock (reduce by 50kg)
3. Logout
4. Login as admin
5. View stock - should see:
   - Government Allocated: 500kg
   - Current Stock: 450kg
   - Audit trail showing shopkeeper reduced by 50kg

### Test 4: Shopkeeper Cannot See Government Data
1. Login as shopkeeper
2. View stock - should ONLY see "Current Stock" column
3. Should NOT see "Government Allocated" column
4. Cannot access /api/users or /api/stocks/audit (403 Forbidden)

---

## Common Issues After Migration

### Issue: "Access denied for user 'root'@'localhost'"
**Solution**: Update `backend/.env` with correct database password:
```env
DB_PASSWORD=your_mysql_password
```

### Issue: "Table doesn't exist"
**Solution**: Re-run schema.sql - make sure you're using the `ration_tds` database:
```sql
USE ration_tds;
SOURCE C:/Akshay_project/Ration_TDS/backend/schema.sql;
```

### Issue: "Foreign key constraint fails" when booking token
**Solution**: User IDs don't match - you need to re-create the database from scratch (steps above)

### Issue: Stock API returns empty array `[]`
**Solution**: 
1. Check if stock_items table has data: `SELECT * FROM stock_items;`
2. If empty, re-run schema.sql
3. Verify `government_allocated` column exists: `DESCRIBE stock_items;`

---

## What Changed

### Database Schema
✅ Users table: Added `is_flagged`, `flag_reason`, `flagged_by`, `flagged_at`
✅ Users table: Changed role ENUM to include 'shopkeeper'
✅ Stock_items table: Added `government_allocated`, `allocated_by`
✅ New table: `stock_audit_log` - tracks ALL stock changes

### Backend API
✅ New route: `GET /api/users` - List all users (admin only)
✅ New route: `GET /api/users/stats` - User statistics by shop
✅ New route: `PATCH /api/users/:id/flag` - Flag/unflag user
✅ New route: `GET /api/stocks/audit/:shopId` - View audit trail
✅ New route: `POST /api/stocks/allocate` - Allocate government stock
✅ Modified: `PATCH /api/stocks/:code` - Now logs to audit table

### Frontend
✅ New tab in admin dashboard: "Users" - manage users and flag shopkeepers
✅ Stock API now extracts `data` property from response
✅ Support for shopkeeper role (placeholder dashboard)

---

## Next Steps After Migration

1. ✅ Re-run `schema.sql` in MySQL Workbench
2. ✅ Restart backend server
3. ✅ Test admin login
4. ✅ Test flagging a shopkeeper
5. ✅ Test cardholder login and token booking
6. ⏳ Create ShopkeeperDashboard component (future)
7. ⏳ Add stock audit view in admin dashboard (future)

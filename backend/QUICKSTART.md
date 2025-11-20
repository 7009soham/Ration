# Quick MySQL Workbench Setup

## Steps to Create Database

1. **Open MySQL Workbench**

2. **Connect to your local MySQL server**
   - Click on your local connection (usually "Local instance 3306")
   - Enter your root password if prompted

3. **Run the schema file**
   - Go to: `File` → `Open SQL Script`
   - Navigate to: `C:\Akshay_project\Ration_TDS\backend\schema.sql`
   - Click "Open"

4. **Execute the script**
   - Click the lightning bolt icon ⚡ (Execute)
   - Wait for "Action Output" to show success messages
   - You should see: "8 rows affected" and "4 rows affected"

5. **Verify database creation**
   ```sql
   USE ration_tds;
   SHOW TABLES;
   SELECT * FROM shops;
   SELECT * FROM stock_items;
   ```

6. **Update backend/.env**
   - Set your MySQL password:
   ```env
   DB_PASSWORD=your_mysql_root_password
   ```

## Start Backend Server

```powershell
cd C:\Akshay_project\Ration_TDS\backend
npm run dev
```

You should see:
```
✅ MySQL Database connected successfully
✅ Email service ready (or warning if not configured)
🚀 Server running on port 5000
```

## Test the API

Open browser or use curl:
```
http://localhost:5000/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2025-11-19T...",
  "service": "Ration TDS Backend"
}
```

Ready to test authentication!

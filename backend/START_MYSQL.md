# Start MySQL Server - Quick Fix

## Method 1: Windows Services (Recommended)

```powershell
# Open PowerShell as Administrator and run:
Start-Service MySQL95
```

Or manually:
1. Press `Win + R`
2. Type: `services.msc`
3. Find "MySQL95" (or "MySQL")
4. Right-click → Start
5. (Optional) Right-click → Properties → Startup type: Automatic

## Method 2: Command Line (If installed via installer)

```powershell
# Navigate to MySQL bin directory
cd "C:\Program Files\MySQL\MySQL Server 9.5\bin"

# Start MySQL
.\mysqld.exe --console
```

## Method 3: MySQL Workbench

1. In MySQL Workbench left sidebar
2. Click "INSTANCE" section
3. Click "Startup / Shutdown"
4. Click "Start Server" button
5. Wait for status to show "Running"

## Verify Server is Running

After starting, refresh your connection in MySQL Workbench:
- Click the home icon (top left)
- Double-click "Local instance MySQL95" again

You should see connection established (no red "No connection established")

## Then Run Schema

Once connected:
1. File → Open SQL Script
2. Select: `C:\Akshay_project\Ration_TDS\backend\schema.sql`
3. Click ⚡ Execute

---

**Quick Check:**
```powershell
# Test if MySQL port is listening
netstat -ano | findstr :3306
```

If nothing shows, MySQL is not running.

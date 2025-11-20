# MySQL Setup Guide for Windows

## Option 1: Install MySQL (Recommended for Production)

### Download & Install
1. Download MySQL Community Server: https://dev.mysql.com/downloads/mysql/
2. Run installer (mysql-installer-community-x.x.x.msi)
3. Choose "Developer Default" setup
4. Set root password during installation
5. Start MySQL Server

### After Installation
```powershell
# Test MySQL
mysql -u root -p

# Create database
mysql -u root -p < schema.sql
```

## Option 2: Use XAMPP (Easiest for Development)

### Install XAMPP
1. Download: https://www.apachefriends.org/download.html
2. Install to C:\xampp
3. Start XAMPP Control Panel
4. Click "Start" for MySQL

### Setup Database
```powershell
# Navigate to XAMPP MySQL bin
cd C:\xampp\mysql\bin

# Login to MySQL
.\mysql.exe -u root -p

# Create database and run schema
CREATE DATABASE ration_tds;
USE ration_tds;
source C:/Akshay_project/Ration_TDS/backend/schema.sql;
exit;
```

### Update .env
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=           # Usually empty for XAMPP
DB_NAME=ration_tds
```

## Option 3: Docker MySQL (Advanced)

```powershell
# Pull and run MySQL container
docker run --name mysql-ration-tds -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=ration_tds -p 3306:3306 -d mysql:8

# Wait 20 seconds for MySQL to start, then import schema
docker exec -i mysql-ration-tds mysql -uroot -ppassword ration_tds < schema.sql
```

Update .env:
```env
DB_PASSWORD=password
```

## Verify Database

After setup, verify tables were created:

```sql
USE ration_tds;
SHOW TABLES;
-- Should show: shops, users, stock_items, monthly_allocations, tokens, notifications, complaints, verification_codes

SELECT * FROM shops;
-- Should show 1 sample shop

SELECT * FROM stock_items;
-- Should show 4 items (rice, wheat, sugar, kerosene)
```

## Quick Start (After MySQL Setup)

1. Start MySQL server
2. Verify database exists: `ration_tds`
3. Run backend: `npm run dev`
4. Backend should connect successfully

## Troubleshooting

**"Access denied for user"**
- Check DB_USER and DB_PASSWORD in .env
- Ensure MySQL server is running

**"Unknown database 'ration_tds'"**
- Run schema.sql to create database

**"Connection refused"**
- Check if MySQL is running (XAMPP panel or Task Manager)
- Verify DB_PORT (default: 3306)

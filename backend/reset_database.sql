-- ============================================================================
-- DATABASE RESET SCRIPT
-- Run this in MySQL Workbench to recreate the database with new schema
-- ============================================================================

-- Step 1: Drop existing database (WARNING: This deletes all data!)
DROP DATABASE IF EXISTS ration_tds;

-- Step 2: Create fresh database
CREATE DATABASE ration_tds CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 3: Use the database
USE ration_tds;

-- Step 4: Now execute the schema.sql file using the MySQL Workbench interface
-- (Click the lightning bolt icon to run schema.sql)

-- Alternatively, you can source it from command line:
-- mysql -u root -p ration_tds < schema.sql

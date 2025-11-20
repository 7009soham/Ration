-- Ration Distribution System Database Schema
-- MySQL Version

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS ration_tds;
USE ration_tds;

-- Drop tables if exist (for clean setup)
DROP TABLE IF EXISTS verification_codes;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS tokens;
DROP TABLE IF EXISTS monthly_allocations;
DROP TABLE IF EXISTS stock_items;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS shops;

-- Shops table
CREATE TABLE shops (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  district VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  contact_email VARCHAR(255),
  working_hours VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role ENUM('cardholder', 'admin') NOT NULL,
  name VARCHAR(255),
  ration_card VARCHAR(50),
  category ENUM('BPL', 'APL'),
  language VARCHAR(50) DEFAULT 'english',
  shop_id VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_shop_id (shop_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Stock items table
CREATE TABLE stock_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id VARCHAR(50) NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  item_name_hindi VARCHAR(100),
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unit VARCHAR(20) NOT NULL,
  last_restocked TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  UNIQUE KEY unique_shop_item (shop_id, item_code),
  INDEX idx_shop_item (shop_id, item_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Monthly allocations table
CREATE TABLE monthly_allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  eligible_quantity DECIMAL(10, 2) NOT NULL,
  collected_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
  month INT NOT NULL,
  year INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_item_month (user_id, item_code, month, year),
  INDEX idx_user_month (user_id, year, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tokens table
CREATE TABLE tokens (
  id VARCHAR(50) PRIMARY KEY,
  shop_id VARCHAR(50) NOT NULL,
  user_id INT NOT NULL,
  token_date DATE NOT NULL,
  time_slot VARCHAR(50) NOT NULL,
  status ENUM('pending', 'active', 'completed', 'expired', 'cancelled') DEFAULT 'pending',
  queue_position INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_shop_date_slot (shop_id, token_date, time_slot),
  INDEX idx_shop_date (shop_id, token_date),
  INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notifications table
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id VARCHAR(50),
  user_id INT,
  type ENUM('stock', 'token', 'system', 'alert') NOT NULL,
  message TEXT NOT NULL,
  is_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at TIMESTAMP NULL,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_sent (user_id, is_sent),
  INDEX idx_shop_sent (shop_id, is_sent)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Complaints table
CREATE TABLE complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  shop_id VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('open', 'in_review', 'resolved', 'rejected') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  INDEX idx_user_status (user_id, status),
  INDEX idx_shop_status (shop_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Verification codes table (for email verification)
CREATE TABLE verification_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INT DEFAULT 0,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_expires (email, expires_at),
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample shop
INSERT INTO shops (id, name, district, address, contact_email, working_hours) VALUES
('SHOP001', 'Ration Shop - Block 15, Sector 7', 'Delhi Central', 'Block 15, Sector 7, New Delhi - 110001', 'rationshop.block15@gov.in', '9:00 AM - 6:00 PM');

-- Insert sample stock items
INSERT INTO stock_items (shop_id, item_code, item_name, item_name_hindi, quantity, unit, last_restocked) VALUES
('SHOP001', 'rice', 'Rice', 'चावल', 150.00, 'kg', NOW()),
('SHOP001', 'wheat', 'Wheat', 'गेहूं', 25.00, 'kg', NOW()),
('SHOP001', 'sugar', 'Sugar', 'चीनी', 80.00, 'kg', NOW()),
('SHOP001', 'kerosene', 'Kerosene', 'मिट्टी का तेल', 200.00, 'liters', NOW());

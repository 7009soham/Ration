-- ============================================================================
-- Ration Distribution System Database Schema (Authentic PDS Categories)
-- MySQL Version 8+
-- ============================================================================
-- 
-- REAL INDIA PDS RATION CARD CATEGORIES (as per NFSA 2013):
-- 
-- 1. AAY (Antyodaya Anna Yojana) - SAFFRON/YELLOW CARD
--    - Poorest of the poor households
--    - Entitlement: 35 kg/household/month (irrespective of family size)
--    - Price: ₹3/kg rice, ₹2/kg wheat, ₹1/kg millet
-- 
-- 2. PHH (Priority Household) - PINK/ORANGE CARD
--    - Below poverty line familieso
--    - Entitlement: 5 kg/person/month
--    - Price: ₹3/kg rice, ₹2/kg wheat, ₹1/kg millet
-- 
-- 3. BPL (Below Poverty Line) - BLUE/PINK CARD [OLD - Mostly replaced by PHH]
--    - Legacy category, state-dependent usage
--    - Entitlement varied by state
-- 
-- 4. APL (Above Poverty Line) - WHITE CARD [DISCONTINUED in most states]
--    - Had to pay economic cost (no subsidy)
--    - Largely phased out after NFSA 2013
-- 
-- ADDITIONAL SOCIO-ECONOMIC CATEGORIES:
-- - SC (Scheduled Caste)
-- - ST (Scheduled Tribe)
-- - OBC (Other Backward Classes)
-- - General
-- 
-- STANDARD PDS COMMODITIES:
-- - Rice, Wheat, Millets (primary)
-- - Sugar, Kerosene (state-dependent)
-- - Pulses (some states under state schemes)
-- 
-- ============================================================================

CREATE DATABASE IF NOT EXISTS ration_tds;
USE ration_tds;

-- DROP tables (correct order)
DROP TABLE IF EXISTS verification_codes;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS tokens;
DROP TABLE IF EXISTS monthly_allocations;
DROP TABLE IF EXISTS stock_items;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS shops;

-- ------------------------
-- SHOPS
-- ------------------------
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

-- ------------------------
-- USERS (Updated with Real PDS Categories)
-- ------------------------
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role ENUM('cardholder','shopkeeper','admin') NOT NULL COMMENT 'cardholder=end user, shopkeeper=FPS dealer, admin=government official',
  
  -- Personal Details
  name VARCHAR(255),
  gender ENUM('male','female','other'),
  date_of_birth DATE,
  aadhaar_number VARCHAR(12) UNIQUE,
  mobile_number VARCHAR(15),
  address TEXT,
  
  -- Ration Card Details (Real PDS Categories)
  ration_card_number VARCHAR(50) UNIQUE,
  card_type ENUM('AAY','PHH','BPL','APL') COMMENT 'AAY=Antyodaya(poorest), PHH=Priority Household, BPL/APL=Old categories',
  card_color ENUM('saffron','pink','orange','yellow','blue','white') COMMENT 'Saffron/Yellow=AAY, Pink/Orange=PHH, Blue=BPL, White=APL',
  
  -- Socio-Economic Data
  family_size INT DEFAULT 1 COMMENT 'Number of family members',
  socio_economic_category ENUM('SC','ST','OBC','General'),
  occupation ENUM('agricultural_laborer','marginal_farmer','daily_wage','salaried','self_employed','unemployed','others'),
  annual_income DECIMAL(10,2),
  
  -- System Fields
  language VARCHAR(50) DEFAULT 'english',
  shop_id VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Anti-Tampering: Flag suspicious shopkeepers
  is_flagged BOOLEAN DEFAULT FALSE COMMENT 'Admin can flag shopkeeper for suspicious activity',
  flag_reason TEXT COMMENT 'Why shopkeeper was flagged (e.g., stock discrepancy)',
  flagged_by INT COMMENT 'Admin user_id who flagged this user',
  flagged_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL,
  FOREIGN KEY (flagged_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_shop_id (shop_id),
  INDEX idx_card_type (card_type),
  INDEX idx_ration_card (ration_card_number),
  
  CONSTRAINT chk_family_size CHECK (family_size > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------
-- STOCK ITEMS
-- ------------------------
CREATE TABLE stock_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id VARCHAR(50) NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  item_name_hindi VARCHAR(100),
  
  -- ANTI-TAMPERING: Track government allocation vs shopkeeper current stock
  government_allocated DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Original stock allocated by admin/government',
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Current stock (shopkeeper can update this)',
  
  unit VARCHAR(20) NOT NULL,
  last_restocked TIMESTAMP NULL,
  allocated_by INT COMMENT 'Admin user_id who allocated stock',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY (allocated_by) REFERENCES users(id) ON DELETE SET NULL,

  -- A shop cannot have duplicate item_code
  UNIQUE KEY unique_shop_item (shop_id, item_code),

  -- Efficient lookup
  INDEX idx_item_code (item_code),
  INDEX idx_shop_item (shop_id, item_code),

  -- Prevent negative quantities (MySQL 8+)
  CONSTRAINT chk_quantity_nonneg CHECK (quantity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------
-- MONTHLY ALLOCATIONS (Real PDS Entitlements)
-- ------------------------
CREATE TABLE monthly_allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  
  -- Entitlement: AAY=35kg/household, PHH=5kg/person
  eligible_quantity DECIMAL(10,2) NOT NULL COMMENT 'AAY: 35kg total, PHH: 5kg × family_size',
  collected_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  month INT NOT NULL COMMENT '1-12',
  year INT NOT NULL,
  
  -- Transaction tracking
  collection_date DATE,
  fps_dealer_id VARCHAR(50),
  transaction_id VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE KEY unique_user_item_month (user_id, item_code, month, year),
  INDEX idx_user_month (user_id, year, month),
  INDEX idx_collection_date (collection_date),
  
  CONSTRAINT chk_month_valid CHECK (month BETWEEN 1 AND 12),
  CONSTRAINT chk_collected_lte_eligible CHECK (collected_quantity <= eligible_quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------
-- TOKENS
-- ------------------------
CREATE TABLE tokens (
  id VARCHAR(50) PRIMARY KEY,
  shop_id VARCHAR(50) NOT NULL,
  user_id INT NOT NULL,
  token_date DATE NOT NULL,
  time_slot VARCHAR(50) NOT NULL,
  status ENUM('pending','active','completed','expired','cancelled') DEFAULT 'pending',
  queue_position INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE KEY unique_shop_date_slot (shop_id, token_date, time_slot),

  INDEX idx_shop_date (shop_id, token_date),
  INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------
-- STOCK AUDIT LOG (Anti-Tampering System)
-- ------------------------
CREATE TABLE stock_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_item_id INT NOT NULL,
  shop_id VARCHAR(50) NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  
  -- Track who made the change and their role
  changed_by_user_id INT NOT NULL,
  changed_by_role ENUM('shopkeeper','admin') NOT NULL,
  
  -- What changed
  change_type ENUM('government_allocation','shopkeeper_update','admin_correction') NOT NULL,
  old_quantity DECIMAL(10,2),
  new_quantity DECIMAL(10,2),
  quantity_difference DECIMAL(10,2) COMMENT 'new - old (negative = stock reduced)',
  
  -- Context
  reason VARCHAR(255) COMMENT 'Why was stock changed',
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (stock_item_id) REFERENCES stock_items(id) ON DELETE CASCADE,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_stock_item (stock_item_id),
  INDEX idx_shop_date (shop_id, created_at),
  INDEX idx_change_type (change_type),
  INDEX idx_changed_by (changed_by_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------
-- NOTIFICATIONS
-- ------------------------
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id VARCHAR(50),
  user_id INT,
  type ENUM('stock','token','system','alert') NOT NULL,
  message TEXT NOT NULL,
  is_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at TIMESTAMP NULL,

  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_user_sent (user_id, is_sent),
  INDEX idx_shop_sent (shop_id, is_sent)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------
-- COMPLAINTS
-- ------------------------
CREATE TABLE complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  shop_id VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('open','in_review','resolved','rejected') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,

  INDEX idx_user_status (user_id, status),
  INDEX idx_shop_status (shop_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------
-- VERIFICATION CODES
-- ------------------------
CREATE TABLE verification_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL COMMENT 'OTP code (increased size for encrypted/hashed codes)',
  expires_at TIMESTAMP NOT NULL,
  attempts INT DEFAULT 0,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_email_expires (email, expires_at),
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- SAMPLE DATA POPULATION
-- ============================================================================

-- ----------------------------------------
-- SHOPS (Fair Price Shops)
-- ----------------------------------------
INSERT INTO shops (id, name, district, address, contact_email, working_hours) VALUES
('SHOP001', 'Ration Shop - Block 15, Sector 7', 'Delhi Central',
 'Block 15, Sector 7, New Delhi - 110001', 'rationshop.block15@gov.in', '9:00 AM - 6:00 PM'),
('SHOP002', 'Fair Price Shop - Nehru Nagar', 'Mumbai Suburban',
 'Shop No. 12, Nehru Nagar, Mumbai - 400053', 'fps.nehrunagar@gov.in', '8:00 AM - 5:00 PM'),
('SHOP003', 'PDS Centre - Anna Nagar', 'Chennai North',
 'Plot 45, Anna Nagar, Chennai - 600040', 'pds.annanagar@gov.in', '9:00 AM - 7:00 PM');

-- ----------------------------------------
-- USERS (Sample Cardholders + Shopkeepers + Admin)
-- ----------------------------------------
-- NOTE: Users MUST be inserted before stock_items because stock_items.allocated_by references users.id

-- ADMIN USER (Government Official)
INSERT INTO users (email, role, name, gender, language, shop_id, is_active) VALUES
('admin@rationshop.gov.in', 'admin', 'Rajesh Kumar', 'male', 'english', 'SHOP001', TRUE);

-- SHOPKEEPER USERS (FPS Dealers)
INSERT INTO users (email, role, name, gender, mobile_number, address, shop_id, language, is_active) VALUES
('shopkeeper.shop001@fps.gov.in', 'shopkeeper', 'Ramesh Verma', 'male', '9876543210', 'FPS Shop, Block 15, Delhi', 'SHOP001', 'hindi', TRUE),
('shopkeeper.shop002@fps.gov.in', 'shopkeeper', 'Suresh Patil', 'male', '9876543211', 'FPS Shop, Nehru Nagar, Mumbai', 'SHOP002', 'marathi', TRUE),
('shopkeeper.shop003@fps.gov.in', 'shopkeeper', 'Kumar Rajan', 'male', '9876543212', 'PDS Centre, Anna Nagar, Chennai', 'SHOP003', 'tamil', TRUE);

-- AAY CARDHOLDERS (Antyodaya - Poorest of Poor)
-- AAY Family 1: Daily wage laborer, SC category
INSERT INTO users (
  email, role, name, gender, date_of_birth, aadhaar_number, mobile_number, address,
  ration_card_number, card_type, card_color, family_size, socio_economic_category,
  occupation, annual_income, language, shop_id, is_active
) VALUES
('ramesh.kumar@example.com', 'cardholder', 'Ramesh Kumar', 'male', '1978-05-12', 
 '234567891234', '9876543210', 'Jhuggi 12, Sector 15, Delhi - 110001',
 'DL01AAY12345', 'AAY', 'saffron', 6, 'SC', 'daily_wage', 18000.00, 'hindi', 'SHOP001', TRUE);

-- AAY Family 2: Homeless, destitute
INSERT INTO users (
  email, role, name, gender, date_of_birth, aadhaar_number, mobile_number, address,
  ration_card_number, card_type, card_color, family_size, socio_economic_category,
  occupation, annual_income, language, shop_id, is_active
) VALUES
('lakshmi.devi@example.com', 'cardholder', 'Lakshmi Devi', 'female', '1982-08-20',
 '345678912345', '8765432109', 'Shelter Home, Anna Nagar, Chennai - 600040',
 'TN03AAY98765', 'AAY', 'yellow', 4, 'ST', 'unemployed', 12000.00, 'tamil', 'SHOP003', TRUE);

-- AAY Family 3: Agricultural laborer
INSERT INTO users (
  email, role, name, gender, date_of_birth, aadhaar_number, mobile_number, address,
  ration_card_number, card_type, card_color, family_size, socio_economic_category,
  occupation, annual_income, language, shop_id, is_active
) VALUES
('suresh.patel@example.com', 'cardholder', 'Suresh Patel', 'male', '1975-03-15',
 '456789123456', '7654321098', 'Village Ghansoli, Mumbai - 400053',
 'MH02AAY45678', 'AAY', 'saffron', 5, 'OBC', 'agricultural_laborer', 20000.00, 'marathi', 'SHOP002', TRUE);

-- PHH CARDHOLDERS (Priority Household - BPL)
-- PHH Family 1: Marginal farmer, 4 members
INSERT INTO users (
  email, role, name, gender, date_of_birth, aadhaar_number, mobile_number, address,
  ration_card_number, card_type, card_color, family_size, socio_economic_category,
  occupation, annual_income, language, shop_id, is_active
) VALUES
('vijay.singh@example.com', 'cardholder', 'Vijay Singh', 'male', '1985-11-08',
 '567891234567', '9123456789', 'House 45, Block 7, Delhi - 110001',
 'DL01PHH23456', 'PHH', 'pink', 4, 'General', 'marginal_farmer', 45000.00, 'hindi', 'SHOP001', TRUE);

-- PHH Family 2: Self-employed, small shop owner
INSERT INTO users (
  email, role, name, gender, date_of_birth, aadhaar_number, mobile_number, address,
  ration_card_number, card_type, card_color, family_size, socio_economic_category,
  occupation, annual_income, language, shop_id, is_active
) VALUES
('meena.sharma@example.com', 'cardholder', 'Meena Sharma', 'female', '1990-06-25',
 '678912345678', '8912345678', 'Shop 23, Nehru Nagar, Mumbai - 400053',
 'MH02PHH34567', 'PHH', 'orange', 3, 'OBC', 'self_employed', 55000.00, 'hindi', 'SHOP002', TRUE);

-- PHH Family 3: Salaried, low income
INSERT INTO users (
  email, role, name, gender, date_of_birth, aadhaar_number, mobile_number, address,
  ration_card_number, card_type, card_color, family_size, socio_economic_category,
  occupation, annual_income, language, shop_id, is_active
) VALUES
('priya.venkat@example.com', 'cardholder', 'Priya Venkatesh', 'female', '1988-09-18',
 '789123456789', '7891234567', 'Flat 12B, Anna Nagar, Chennai - 600040',
 'TN03PHH56789', 'PHH', 'pink', 5, 'SC', 'salaried', 60000.00, 'tamil', 'SHOP003', TRUE);

-- PHH Family 4: Daily wage, construction worker
INSERT INTO users (
  email, role, name, gender, date_of_birth, aadhaar_number, mobile_number, address,
  ration_card_number, card_type, card_color, family_size, socio_economic_category,
  occupation, annual_income, language, shop_id, is_active
) VALUES
('amit.yadav@example.com', 'cardholder', 'Amit Yadav', 'male', '1980-02-28',
 '891234567891', '6789123456', 'Quarter 34, Sector 15, Delhi - 110001',
 'DL01PHH78901', 'PHH', 'orange', 3, 'OBC', 'daily_wage', 42000.00, 'hindi', 'SHOP001', TRUE);

-- BPL CARDHOLDERS (Legacy Category - Still used in some states)
-- BPL Family: Transitioning to PHH
INSERT INTO users (
  email, role, name, gender, date_of_birth, aadhaar_number, mobile_number, address,
  ration_card_number, card_type, card_color, family_size, socio_economic_category,
  occupation, annual_income, language, shop_id, is_active
) VALUES
('gopal.reddy@example.com', 'cardholder', 'Gopal Reddy', 'male', '1983-07-14',
 '912345678912', '5678912345', 'House 67, Anna Nagar, Chennai - 600040',
 'TN03BPL12345', 'BPL', 'blue', 4, 'General', 'self_employed', 48000.00, 'telugu', 'SHOP003', TRUE);

-- ----------------------------------------
-- STOCK ITEMS (Standard PDS Commodities)
-- Anti-Tampering: government_allocated tracks original allocation from government
--                 quantity tracks current stock (shopkeeper can update)
--                 allocated_by tracks which admin allocated the stock
-- ----------------------------------------
INSERT INTO stock_items (shop_id, item_code, item_name, item_name_hindi, government_allocated, quantity, unit, allocated_by, last_restocked) VALUES
-- SHOP001 (Delhi) - Allocated by admin user_id=1
('SHOP001', 'rice', 'Rice', 'चावल', 500.00, 500.00, 'kg', 1, NOW()),
('SHOP001', 'wheat', 'Wheat', 'गेहूं', 450.00, 450.00, 'kg', 1, NOW()),
('SHOP001', 'sugar', 'Sugar', 'चीनी', 120.00, 120.00, 'kg', 1, NOW()),
('SHOP001', 'kerosene', 'Kerosene', 'मिट्टी का तेल', 300.00, 300.00, 'liters', 1, NOW()),

-- SHOP002 (Mumbai) - Allocated by admin user_id=1
('SHOP002', 'rice', 'Rice', 'चावल', 600.00, 600.00, 'kg', 1, NOW()),
('SHOP002', 'wheat', 'Wheat', 'गेहूं', 380.00, 380.00, 'kg', 1, NOW()),
('SHOP002', 'sugar', 'Sugar', 'चीनी', 95.00, 95.00, 'kg', 1, NOW()),
('SHOP002', 'kerosene', 'Kerosene', 'मिट्टी का तेल', 250.00, 250.00, 'liters', 1, NOW()),

-- SHOP003 (Chennai) - Allocated by admin user_id=1
('SHOP003', 'rice', 'Rice', 'அரிசி', 700.00, 700.00, 'kg', 1, NOW()),
('SHOP003', 'wheat', 'Wheat', 'கோதுமை', 200.00, 200.00, 'kg', 1, NOW()),
('SHOP003', 'sugar', 'Sugar', 'சர்க்கரை', 150.00, 150.00, 'kg', 1, NOW()),
('SHOP003', 'kerosene', 'Kerosene', 'மண்ணெண்ணெய்', 400.00, 400.00, 'liters', 1, NOW());

-- ----------------------------------------
-- MONTHLY ALLOCATIONS (Auto-generated for current month)
-- ----------------------------------------
-- Calculate entitlements: AAY=35kg, PHH=family_size×5kg

-- AAY Allocations (35 kg fixed)
INSERT INTO monthly_allocations (user_id, item_code, eligible_quantity, collected_quantity, month, year) VALUES
-- Ramesh Kumar (AAY, 6 members) - 35kg rice
(2, 'rice', 35.00, 20.00, 11, 2025),
(2, 'wheat', 0.00, 0.00, 11, 2025),
(2, 'sugar', 5.00, 3.00, 11, 2025),

-- Lakshmi Devi (AAY, 4 members) - 35kg rice
(3, 'rice', 35.00, 35.00, 11, 2025),
(3, 'sugar', 5.00, 5.00, 11, 2025),

-- Suresh Patel (AAY, 5 members) - 35kg mixed
(4, 'rice', 20.00, 15.00, 11, 2025),
(4, 'wheat', 15.00, 10.00, 11, 2025),
(4, 'sugar', 5.00, 0.00, 11, 2025);

-- PHH Allocations (family_size × 5kg)
INSERT INTO monthly_allocations (user_id, item_code, eligible_quantity, collected_quantity, month, year) VALUES
-- Vijay Singh (PHH, 4 members) - 4×5=20kg
(5, 'rice', 10.00, 8.00, 11, 2025),
(5, 'wheat', 10.00, 6.00, 11, 2025),

-- Meena Sharma (PHH, 3 members) - 3×5=15kg
(6, 'rice', 15.00, 12.00, 11, 2025),
(6, 'sugar', 3.00, 2.00, 11, 2025),

-- Priya Venkatesh (PHH, 5 members) - 5×5=25kg
(7, 'rice', 15.00, 0.00, 11, 2025),
(7, 'wheat', 10.00, 0.00, 11, 2025),

-- Amit Yadav (PHH, 3 members) - 3×5=15kg
(8, 'rice', 10.00, 10.00, 11, 2025),
(8, 'wheat', 5.00, 5.00, 11, 2025);

-- BPL Allocations (legacy, varied entitlement)
INSERT INTO monthly_allocations (user_id, item_code, eligible_quantity, collected_quantity, month, year) VALUES
-- Gopal Reddy (BPL, 4 members) - 20kg
(9, 'rice', 15.00, 8.00, 11, 2025),
(9, 'wheat', 5.00, 3.00, 11, 2025);

-- ----------------------------------------
-- TOKENS (Queue booking system)
-- ----------------------------------------
INSERT INTO tokens (id, shop_id, user_id, token_date, time_slot, status, queue_position) VALUES
('TKN001', 'SHOP001', 2, '2025-11-21', '09:00-10:00', 'pending', 1),
('TKN002', 'SHOP001', 5, '2025-11-21', '09:00-10:00', 'pending', 2),
('TKN003', 'SHOP001', 8, '2025-11-21', '10:00-11:00', 'active', 1),
('TKN004', 'SHOP002', 4, '2025-11-21', '09:00-10:00', 'pending', 1),
('TKN005', 'SHOP002', 6, '2025-11-21', '11:00-12:00', 'pending', 1),
('TKN006', 'SHOP003', 3, '2025-11-20', '09:00-10:00', 'completed', 1),
('TKN007', 'SHOP003', 7, '2025-11-21', '10:00-11:00', 'pending', 1),
('TKN008', 'SHOP003', 9, '2025-11-21', '10:00-11:00', 'pending', 2);

-- ----------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------
INSERT INTO notifications (shop_id, user_id, type, message, is_sent) VALUES
('SHOP001', NULL, 'stock', 'Wheat stock replenished. 450 kg available.', TRUE),
('SHOP001', 2, 'alert', 'Low stock alert: Please collect your pending 15kg rice allocation soon.', TRUE),
('SHOP001', 8, 'token', 'Your token TKN003 is now active. Please visit the shop.', TRUE),
('SHOP002', NULL, 'stock', 'Sugar available. First come first served.', TRUE),
('SHOP003', 3, 'system', 'Your November allocation fully collected. Thank you!', TRUE),
('SHOP003', 7, 'alert', 'BPL Priority: Collect your rice quota (25kg) before month end.', FALSE);

-- ----------------------------------------
-- COMPLAINTS
-- ----------------------------------------
INSERT INTO complaints (user_id, shop_id, description, status) VALUES
(2, 'SHOP001', 'Rice quality was poor - found stones and insects in the bag', 'in_review'),
(4, 'SHOP002', 'Shop dealer was rude and refused to give full quota', 'open'),
(3, 'SHOP003', 'Long waiting time despite having token. Waited 2 hours.', 'resolved'),
(7, 'SHOP003', 'Wheat not available for 3 consecutive days', 'open');




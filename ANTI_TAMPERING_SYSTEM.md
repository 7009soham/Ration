# 🔒 Anti-Tampering System - 3-Tier Role Architecture

## Problem Statement

**Security Risk**: If shopkeeper can directly update stock quantities without audit trail:
- Government allocates 500kg rice to SHOP001
- Shopkeeper changes it to 300kg (stealing 200kg)
- No evidence of tampering
- Government loses track of actual stock

## Solution: 3-Tier Role System with Audit Trail

### **1. Roles & Permissions**

#### **Admin (Government Official)**
- **Email**: `admin@rationshop.gov.in`
- **Permissions**:
  - ✅ Allocate government stock to shops
  - ✅ View `government_allocated` vs `current stock` for all shops
  - ✅ View complete audit trail (who changed what, when)
  - ✅ Flag discrepancies (e.g., allocated 500kg but shop shows 300kg)
  - ✅ Correct stock with admin override
  - ✅ Send notifications to all users
  - ✅ Manage shops, allocations, complaints

#### **Shopkeeper (FPS Dealer)**
- **Email**: `shopkeeper.shop001@fps.gov.in`
- **Permissions**:
  - ✅ Update daily stock (quantity field only)
  - ✅ Cannot see `government_allocated` amount
  - ✅ Cannot edit `government_allocated`
  - ✅ Manage tokens for their shop
  - ✅ View cardholders at their shop
  - ✅ Send notifications to their shop cardholders
  - ❌ Cannot access audit logs
  - ❌ Cannot see other shops' data

#### **Cardholder (End User)**
- **Email**: `ramesh.kumar@example.com`
- **Permissions**:
  - ✅ View stock availability at assigned shop
  - ✅ Book token for ration collection
  - ✅ View monthly quota & collected amount
  - ✅ File complaints
  - ✅ View notifications
  - ❌ Cannot see government allocated stock
  - ❌ Cannot modify any data

---

## Database Schema Changes

### **1. users table - Added `shopkeeper` role**

```sql
role ENUM('cardholder','shopkeeper','admin') NOT NULL
```

**Sample Shopkeepers**:
| Email | Role | Name | Shop | Mobile |
|-------|------|------|------|--------|
| `shopkeeper.shop001@fps.gov.in` | shopkeeper | Ramesh Verma | SHOP001 | 9876543210 |
| `shopkeeper.shop002@fps.gov.in` | shopkeeper | Suresh Patil | SHOP002 | 9876543211 |
| `shopkeeper.shop003@fps.gov.in` | shopkeeper | Kumar Rajan | SHOP003 | 9876543212 |

---

### **2. stock_items table - Track Government Allocation**

```sql
CREATE TABLE stock_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id VARCHAR(50) NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  
  -- ANTI-TAMPERING FIELDS:
  government_allocated DECIMAL(10,2) NOT NULL DEFAULT 0 
    COMMENT 'Original stock allocated by admin/government',
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0 
    COMMENT 'Current stock (shopkeeper can update this)',
  
  allocated_by INT COMMENT 'Admin user_id who allocated stock',
  
  FOREIGN KEY (allocated_by) REFERENCES users(id) ON DELETE SET NULL
);
```

**Example**:
| Shop | Item | government_allocated | quantity | Discrepancy |
|------|------|---------------------|----------|-------------|
| SHOP001 | rice | 500.00 kg | 500.00 kg | ✅ 0 kg |
| SHOP001 | rice | 500.00 kg | 300.00 kg | ⚠️ -200 kg (suspicious!) |

---

### **3. stock_audit_log table - Complete Audit Trail**

```sql
CREATE TABLE stock_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_item_id INT NOT NULL,
  shop_id VARCHAR(50) NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  
  -- WHO MADE THE CHANGE
  changed_by_user_id INT NOT NULL,
  changed_by_role ENUM('shopkeeper','admin') NOT NULL,
  
  -- WHAT CHANGED
  change_type ENUM('government_allocation','shopkeeper_update','admin_correction'),
  old_quantity DECIMAL(10,2),
  new_quantity DECIMAL(10,2),
  quantity_difference DECIMAL(10,2),
  
  -- WHY & NOTES
  reason VARCHAR(255),
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (stock_item_id) REFERENCES stock_items(id),
  FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
);
```

**Audit Log Example**:
| ID | Item | Changed By | Role | Type | Old Qty | New Qty | Diff | Created At |
|----|------|-----------|------|------|---------|---------|------|------------|
| 1 | rice | Admin (admin@...) | admin | government_allocation | 0 | 500 | +500 | 2025-01-15 09:00 |
| 2 | rice | Ramesh (shopkeeper@...) | shopkeeper | shopkeeper_update | 500 | 450 | -50 | 2025-01-15 11:30 |
| 3 | rice | Ramesh (shopkeeper@...) | shopkeeper | shopkeeper_update | 450 | 300 | -150 | 2025-01-15 14:00 |

**Red Flag**: Entry #3 shows -150kg change with no distribution recorded → Likely theft!

---

## API Endpoints

### **Stock Management**

#### `GET /api/stocks?shopId=SHOP001`
- **All roles** can access
- **Admin sees**: `governmentAllocated`, `quantity`, discrepancy
- **Shopkeeper/Cardholder see**: Only `quantity`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "code": "rice",
      "name": "Rice",
      "governmentAllocated": 500,  // Only admin sees this
      "quantity": 300,               // Current stock
      "unit": "kg"
    }
  ]
}
```

---

#### `PATCH /api/stocks/:code` (Shopkeeper can update daily stock)
- **Shopkeeper**: Updates `quantity` field only
- **Admin**: Can update both `quantity` and `government_allocated`
- **Automatically logs** to `stock_audit_log`

**Request**:
```json
{
  "quantity": 450,
  "shopId": "SHOP001"
}
```

**Backend Behavior**:
1. Get current stock quantity (e.g., 500)
2. Update to new quantity (450)
3. Calculate difference (-50)
4. Log to audit table:
   - `changed_by_user_id`: Shopkeeper's user ID
   - `changed_by_role`: "shopkeeper"
   - `change_type`: "shopkeeper_update"
   - `old_quantity`: 500
   - `new_quantity`: 450
   - `quantity_difference`: -50

---

#### `GET /api/stocks/audit/:shopId` (Admin only)
- **Purpose**: View complete audit trail
- **Returns**: All stock changes with timestamps, user details, reasons

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "itemCode": "rice",
      "changedByName": "Ramesh Verma",
      "changedByEmail": "shopkeeper.shop001@fps.gov.in",
      "changedByRole": "shopkeeper",
      "changeType": "shopkeeper_update",
      "oldQuantity": 450,
      "newQuantity": 300,
      "quantityDifference": -150,
      "createdAt": "2025-01-15 14:00:00"
    }
  ]
}
```

---

#### `POST /api/stocks/allocate` (Admin only)
- **Purpose**: Allocate government stock to shop
- **Updates**: Both `government_allocated` AND `quantity` fields
- **Logs**: As "government_allocation" in audit trail

**Request**:
```json
{
  "shopId": "SHOP001",
  "itemCode": "rice",
  "quantity": 500,
  "reason": "Monthly allocation - January 2025"
}
```

**Backend Behavior**:
1. Update `government_allocated = 500`
2. Update `quantity = existing + (500 - old_allocated)`
3. Update `allocated_by = admin_user_id`
4. Log to audit trail

---

## How It Prevents Tampering

### **Scenario 1: Shopkeeper tries to hide stock**

1. **Government allocates** 500kg rice to SHOP001
   - `government_allocated = 500`
   - `quantity = 500`

2. **Shopkeeper sells** 50kg to cardholders
   - Updates `quantity = 450` (legitimate)
   - Audit log: `change_type = shopkeeper_update, diff = -50`

3. **Shopkeeper tries to steal** 150kg
   - Updates `quantity = 300` (suspicious!)
   - Audit log: `change_type = shopkeeper_update, diff = -150`

4. **Admin reviews audit trail**
   - Sees: government allocated 500kg
   - Current stock: 300kg
   - Only 50kg distributed to cardholders (from monthly_allocations table)
   - **Missing**: 500 - 50 - 300 = **150kg unaccounted!**
   - **Action**: Flag shop, investigate, take action

---

### **Scenario 2: Shopkeeper cannot tamper government allocation**

- **Shopkeeper attempts**: `PATCH /api/stocks/allocate`
- **Backend**: Returns `403 Forbidden` (requires admin role)
- **Result**: Only admin can change `government_allocated` field

---

### **Scenario 3: Admin can audit all changes**

Admin dashboard shows:

| Shop | Item | Govt Allocated | Current Stock | Discrepancy | Status |
|------|------|---------------|---------------|-------------|--------|
| SHOP001 | Rice | 500 kg | 300 kg | ⚠️ -200 kg | 🔴 ALERT |
| SHOP002 | Rice | 600 kg | 580 kg | ✅ -20 kg | 🟢 Normal |

**Clicking on SHOP001 alert** → Shows complete audit trail with all changes

---

## Frontend Changes

### **Login Credentials**

#### **Admin**
```
Email: admin@rationshop.gov.in
Role: admin
```

#### **Shopkeeper**
```
Email: shopkeeper.shop001@fps.gov.in
Role: shopkeeper
Shop: SHOP001
```

#### **Cardholder**
```
Email: ramesh.kumar@example.com
Role: cardholder
Shop: SHOP001
```

---

### **Dashboard Features**

#### **Admin Dashboard**
```
📊 Stock Overview
   ├── Government Allocated: 500 kg
   ├── Current Stock: 300 kg
   └── Discrepancy: ⚠️ -200 kg (FLAG!)

📜 Audit Trail (Last 10 Changes)
   ├── Jan 15, 14:00 | Ramesh (shopkeeper) | -150 kg | 450→300
   ├── Jan 15, 11:30 | Ramesh (shopkeeper) | -50 kg  | 500→450
   └── Jan 15, 09:00 | Admin | +500 kg | 0→500 (Allocation)

🚨 Alerts
   └── SHOP001: 200 kg rice missing - investigate!
```

#### **Shopkeeper Dashboard**
```
📦 Current Stock (can update)
   ├── Rice: 300 kg  [Update] [+] [-]
   ├── Wheat: 450 kg [Update] [+] [-]
   └── Sugar: 120 kg [Update] [+] [-]

🎟️ Tokens Today
   └── 15 tokens issued

👥 Cardholders
   └── 120 registered at SHOP001
```

**Shopkeeper CANNOT see**:
- ❌ Government allocated amounts
- ❌ Audit trail
- ❌ Other shops' data

---

## Security Benefits

✅ **Prevents stock theft**: Government allocation is immutable (shopkeeper can't change it)  
✅ **Complete audit trail**: Every change logged with user ID, role, timestamp  
✅ **Discrepancy detection**: Automatic alerts when `current stock` deviates too much from `allocated`  
✅ **Role-based access**: Shopkeeper can't see audit logs or government data  
✅ **Forensic evidence**: Full history of who changed what and when  
✅ **Accountability**: Each change tied to specific user account  

---

## Database Migration

To apply these changes to existing database:

```sql
-- 1. Add shopkeeper role
ALTER TABLE users MODIFY role ENUM('cardholder','shopkeeper','admin') NOT NULL;

-- 2. Add government tracking to stock_items
ALTER TABLE stock_items 
  ADD COLUMN government_allocated DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER item_name_hindi,
  ADD COLUMN allocated_by INT AFTER quantity,
  ADD CONSTRAINT fk_allocated_by FOREIGN KEY (allocated_by) REFERENCES users(id) ON DELETE SET NULL;

-- 3. Create audit log table
CREATE TABLE stock_audit_log (
  -- ... (see full schema above)
);

-- 4. Populate government_allocated with current quantities
UPDATE stock_items SET government_allocated = quantity;

-- 5. Insert shopkeeper users
INSERT INTO users (email, role, name, shop_id, ...) VALUES
  ('shopkeeper.shop001@fps.gov.in', 'shopkeeper', 'Ramesh Verma', 'SHOP001', ...);
```

---

## Testing the System

### **Test 1: Shopkeeper updates stock**
1. Login as `shopkeeper.shop001@fps.gov.in`
2. Update rice stock from 500 to 450
3. Logout
4. Login as admin
5. Check audit trail → Should see entry with shopkeeper's name, -50 kg change

### **Test 2: Admin views discrepancies**
1. Login as admin
2. Go to Stock Audit tab
3. See SHOP001 rice: Allocated 500, Current 300, Discrepancy -200
4. View audit logs → See shopkeeper reduced by 150kg in one transaction (red flag)

### **Test 3: Shopkeeper cannot see government allocation**
1. Login as shopkeeper
2. View stock → Only see current quantity (300)
3. No "Government Allocated" column visible
4. Cannot access `/api/stocks/audit` (403 Forbidden)

---

## Next Steps

1. ✅ **Database updated** with shopkeeper role, audit trail, government tracking
2. ✅ **Backend API** updated with audit logging on all stock changes
3. ⏳ **Create ShopkeeperDashboard.tsx** component
4. ⏳ **Update AdminDashboard.tsx** to show audit trail and discrepancies
5. ⏳ **Add discrepancy alerts** (auto-flag shops with >10% missing stock)
6. ⏳ **Generate monthly reports** for government audit

---

## Compliance & Regulations

This system aligns with:
- **National Food Security Act (NFSA) 2013** - Transparency in PDS
- **Aadhaar-based tracking** - Biometric verification prevents duplicate claims
- **Right to Information Act** - Citizens can audit stock distribution
- **Public Audit Requirements** - Government can track every kilogram of grain

---

**Built for**: Indian Public Distribution System (PDS)  
**Purpose**: Prevent stock tampering, ensure food security for poor families  
**Impact**: Transparent, accountable, tamper-proof ration distribution

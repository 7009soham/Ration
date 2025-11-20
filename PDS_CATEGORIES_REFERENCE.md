# India PDS Ration Card Categories - Official Reference

> **Source**: National Food Security Act (NFSA) 2013, Government of India  
> **Last Updated**: Based on 2020-2024 implementation data

---

## 📋 Current Ration Card Types

### 1. **AAY - Antyodaya Anna Yojana**
- **Card Color**: Saffron / Yellow
- **Target**: Poorest of the poor (destitute, homeless, daily wage laborers)
- **Monthly Entitlement**: **35 kg/household** (fixed, irrespective of family size)
- **Subsidized Price**:
  - Rice: ₹3/kg
  - Wheat: ₹2/kg
  - Millets: ₹1/kg
- **Coverage**: ~2.5 crore households (as of 2020)

### 2. **PHH - Priority Household**
- **Card Color**: Pink / Orange
- **Target**: Below poverty line families
- **Monthly Entitlement**: **5 kg per person per month**
  - Example: 4-member family = 20 kg/month
- **Subsidized Price**: Same as AAY (₹3/₹2/₹1)
- **Coverage**: ~67% of India's population (NFSA mandate)

### 3. **BPL - Below Poverty Line** *(Legacy - Being Phased Out)*
- **Card Color**: Blue / Pink (state-dependent)
- **Status**: Mostly replaced by PHH after NFSA 2013
- **Entitlement**: Varied by state (typically 10-35 kg)
- **Note**: Some states still use this terminology

### 4. **APL - Above Poverty Line** *(Discontinued)*
- **Card Color**: White
- **Status**: Largely abolished after NFSA 2013
- **Previous Entitlement**: 15 kg at economic cost (no subsidy)
- **Note**: APL category removed to reduce exclusion errors

---

## 🏷️ Socio-Economic Categories (All Card Types)

Additional classification for targeting:

| Category | Full Name | Description |
|----------|-----------|-------------|
| **SC** | Scheduled Caste | Historically disadvantaged communities |
| **ST** | Scheduled Tribe | Indigenous tribal populations |
| **OBC** | Other Backward Classes | Socially/educationally disadvantaged groups |
| **General** | General Category | Not covered by reservations |

Many states auto-include **all SC/ST households** in priority categories regardless of income.

---

## 🌾 Standard PDS Commodities

### Primary Items (Mandatory):
- **Rice** (₹3/kg for NFSA cardholders)
- **Wheat** (₹2/kg)
- **Millets** (₹1/kg)

### Secondary Items (State-Dependent):
- **Sugar** (subsidized in some states)
- **Kerosene** (for lighting/cooking - being phased out)
- **Pulses/Dal** (under state-specific expanded PDS schemes)
- **Edible Oil** (select states: Kerala, Tamil Nadu, Chhattisgarh)

---

## 📊 Entitlement Calculation Examples

### Example 1: AAY Household
- **Family Size**: 6 members
- **Card Type**: AAY
- **Monthly Entitlement**: **35 kg** (fixed)
- **Distribution**: Can choose rice, wheat, or mix

### Example 2: PHH Household
- **Family Size**: 4 members
- **Card Type**: PHH
- **Monthly Entitlement**: 4 × 5 kg = **20 kg**
- **If family grows**: Entitlement increases automatically

### Example 3: Mixed Allocation
- **Cardholder**: PHH with 5 members
- **Total Quota**: 25 kg
- **Can collect**: 
  - 15 kg Rice + 10 kg Wheat, OR
  - 25 kg Rice, OR
  - 12.5 kg Rice + 7.5 kg Wheat + 5 kg Millets
  
(Distribution flexibility varies by state)

---

## 🗂️ Database Schema Fields

### Users Table (Ration Cardholders):

```sql
-- Core Identity
ration_card_number VARCHAR(50)      -- Unique 10-digit card number
card_type ENUM('AAY','PHH','BPL','APL')
card_color ENUM('saffron','pink','orange','yellow','blue','white')

-- Personal Details
name VARCHAR(255)
gender ENUM('male','female','other')
date_of_birth DATE
aadhaar_number VARCHAR(12)          -- Unique ID for authentication
mobile_number VARCHAR(15)
address TEXT

-- Family & Category
family_size INT                      -- For PHH entitlement calculation
socio_economic_category ENUM('SC','ST','OBC','General')
occupation ENUM('agricultural_laborer','marginal_farmer','daily_wage',
                'salaried','self_employed','unemployed','others')
annual_income DECIMAL(10,2)
```

### Monthly Allocations Table:

```sql
user_id INT
item_code VARCHAR(50)               -- 'rice', 'wheat', 'sugar', 'kerosene'
eligible_quantity DECIMAL(10,2)     -- AAY: 35kg, PHH: family_size × 5kg
collected_quantity DECIMAL(10,2)    -- What was actually distributed
month INT (1-12)
year INT
collection_date DATE
fps_dealer_id VARCHAR(50)           -- Fair Price Shop dealer who issued
transaction_id VARCHAR(100)
```

---

## 🎯 State-Specific Variations

Some states run **expanded PDS** beyond NFSA:

| State | Expansion | Details |
|-------|-----------|---------|
| **Kerala** | Universal PDS | All households eligible, additional items (pulses, oil) |
| **Tamil Nadu** | State cards | 35 kg rice to all state card holders |
| **Chhattisgarh** | Lower prices | Rice at ₹2/kg (vs central ₹3) |
| **Odisha** | State cards | Rice at ₹1/kg for state beneficiaries |
| **West Bengal** | Expanded coverage | Tide-over grains for extra beneficiaries |

---

## 🔐 Aadhaar Integration (Mandatory)

Since 2016, **Aadhaar-based biometric authentication** (ABBA) is required:

1. Ration card must be **seeded** with Aadhaar number
2. **Fingerprint authentication** at Fair Price Shop (FPS)
3. Transaction recorded in **ePoS (electronic Point of Sale)** device
4. Real-time update to **Annavitran portal** (central tracking)

**Authentication Failure Rate**: ~12% (as of 2018 UIDAI data)
- Reasons: Poor fingerprint quality, network issues, POS device failures

---

## 📈 Coverage Statistics (2020)

| Metric | Value |
|--------|-------|
| NFSA Mandated Coverage | 67% of population |
| Actual Coverage (2020) | 59% (~810 million people) |
| Shortfall | ~100 million excluded due to outdated 2011 census |
| Total Fair Price Shops | 5.5 lakh (550,000) |
| Leakage Rate (2011-12) | 42% |
| Leakage Rate (2017-18) | 10-15% |

---

## 💡 Key Insights for Your Project

1. **Default to PHH**: Most new cardholders should be PHH (not BPL/APL)
2. **AAY is Special**: Only for verified poorest households
3. **Family Size Matters**: PHH entitlement = `family_size × 5 kg`
4. **Card Colors**: Use saffron/yellow for AAY, pink/orange for PHH
5. **Auto-Allocation**: Create `monthly_allocations` records automatically at month start
6. **Track Collections**: `collected_quantity` ≤ `eligible_quantity`
7. **Aadhaar Required**: Don't allow distribution without Aadhaar linkage
8. **SC/ST Priority**: Auto-grant PHH to all SC/ST applicants

---

## 🔗 Official Resources

- **NFSA Portal**: https://nfsa.gov.in/
- **Annavitran Dashboard**: https://annavitran.nic.in/
- **One Nation One Ration Card**: https://impds.nic.in/
- **Wikipedia PDS Page**: https://en.wikipedia.org/wiki/Public_Distribution_System_(India)

---

## 📝 Frontend UI Recommendations

### Signup Form:
```javascript
// Dropdown: Card Type
<select name="cardType">
  <option value="AAY">AAY - Antyodaya (Yellow/Saffron Card)</option>
  <option value="PHH">PHH - Priority Household (Pink/Orange Card)</option>
  <option value="BPL">BPL - Below Poverty Line (Legacy)</option>
</select>

// Dropdown: Socio-Economic Category
<select name="category">
  <option value="SC">Scheduled Caste (SC)</option>
  <option value="ST">Scheduled Tribe (ST)</option>
  <option value="OBC">Other Backward Classes (OBC)</option>
  <option value="General">General</option>
</select>

// Number Input: Family Size (for PHH entitlement)
<input type="number" name="familySize" min="1" max="20" />

// Calculated Entitlement Display:
if (cardType === 'AAY') {
  monthlyQuota = 35; // kg
} else if (cardType === 'PHH') {
  monthlyQuota = familySize * 5; // kg
}
```

### Dashboard Display:
```javascript
// Show monthly quota with progress bar
{
  item: 'Rice',
  eligible: 20,      // PHH: 4 members × 5 kg
  collected: 15,     // Already collected this month
  remaining: 5,      // Still available
  percentage: 75     // Progress bar: 75%
}
```

---

**Updated**: November 2025  
**Based on**: NFSA 2013, Wikipedia PDS research, Official government data

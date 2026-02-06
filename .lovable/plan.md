
# Admin Dashboard Refactor: Platform-Level Oversight

## Overview
This refactor transforms the admin dashboard from showing user-level operational data to displaying platform-level oversight metrics focused on system health, adoption, and risk signals.

## Current State Analysis

The existing `SystemDashboard.tsx` shows:
- Total Companies (with active count)
- Total Users
- Recent Activities count
- Global Activity Log

The existing `Dashboard.tsx` shows user-level metrics that should NOT appear in admin context:
- Inventory quantities
- Today's stock movement
- Average delivery time
- Low stock alerts
- Needs attention items
- In-transit shipments

---

## Implementation Plan

### 1. Refactor SystemDashboard.tsx - Platform Overview Section

**Remove**: Any user-level operational metrics (none currently exist in this file, but ensure it stays clean)

**Add/Modify Platform-Level Overview Cards**:

| Metric | Query Logic |
|--------|-------------|
| Total Companies | `COUNT(*)` from `companies` table |
| Active Companies | Companies with activity logs in last 7 days |
| Total Users | `COUNT(*)` from `profiles` table |
| New Companies | Companies with `created_at` within last 7 days |

### 2. Add System Usage Metrics Section

**New Cards**:

| Metric | Query Logic |
|--------|-------------|
| Total Shipments | `COUNT(*)` from `shipments` table (platform-wide) |
| Shipments (7 days) | Shipments with `created_at` within last 7 days |
| Delivered Shipments | `COUNT(*)` where `status = 'delivered'` |
| Cancelled Shipments | `COUNT(*)` where `status = 'cancelled'` |
| Total Inventory Items | `COUNT(*)` from `inventory_items` (count only, no quantities) |

### 3. Add Risk & Adoption Signals Section

**Informational Alerts** (read-only, no actions):

| Signal | Detection Logic |
|--------|-----------------|
| Companies with no shipments | Companies that exist but have zero shipments |
| Companies with inventory but no shipments | Companies with `inventory_items` but zero `shipments` |
| Companies with repeated cancellations | Companies with 3+ cancelled shipments |

These will be displayed as information cards with company names and counts.

### 4. Recent System Activity Feed

**Retain existing activity feed** but filter to show only these activity types:
- `COMPANY_CREATED`
- `INVENTORY_IN` (inventory created)
- `SHIPMENT_CREATED`
- `SHIPMENT_CANCELLED`

Display with company name attribution.

### 5. Update Translations

Add new translation keys for:
- `admin.activeCompanies7Days`
- `admin.newCompanies`
- `admin.systemUsage`
- `admin.totalShipments`
- `admin.shipmentsLast7Days`
- `admin.deliveredShipments`
- `admin.cancelledShipments`
- `admin.totalInventoryItems`
- `admin.riskSignals`
- `admin.companiesNoShipments`
- `admin.companiesInventoryNoShipments`
- `admin.companiesRepeatedCancellations`
- `admin.adoptionRisks`

---

## Technical Implementation

### Data Fetching Strategy

All data will be fetched directly from Supabase in the component using the existing `supabase` client. The queries will be:

```text
1. Companies Overview:
   - All companies count
   - New companies (created_at > 7 days ago)
   - Active companies (distinct company_id from activity_logs where created_at > 7 days ago)

2. System Usage:
   - Total shipments count
   - Shipments created in last 7 days
   - Delivered shipments count
   - Cancelled shipments count
   - Total inventory items count

3. Risk Signals:
   - Companies with 0 shipments (LEFT JOIN companies to shipments, WHERE shipment IS NULL)
   - Companies with inventory but no shipments
   - Companies with 3+ cancelled shipments (GROUP BY company_id HAVING COUNT > 2)
```

### Component Structure

```text
AdminSystemDashboard
+-- Platform Overview Section (4 cards grid)
|   +-- Total Companies
|   +-- Active Companies (7 days)
|   +-- Total Users
|   +-- New Companies (7 days)
|
+-- System Usage Section (5 cards grid)
|   +-- Total Shipments
|   +-- Shipments (7 days)
|   +-- Delivered
|   +-- Cancelled
|   +-- Inventory Items
|
+-- Risk & Adoption Signals Section (Card with list)
|   +-- Companies with no shipments after onboarding
|   +-- Companies with inventory but no shipments
|   +-- Companies with repeated cancellations
|
+-- Recent System Activity Feed (Card with filtered activity list)
    +-- COMPANY_CREATED
    +-- INVENTORY_IN
    +-- SHIPMENT_CREATED
    +-- SHIPMENT_CANCELLED
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/SystemDashboard.tsx` | Complete rewrite with new platform metrics |
| `src/contexts/LanguageContext.tsx` | Add new translation keys |

---

## Constraints Verification

- User dashboard (`Dashboard.tsx`) - NOT modified
- Database schema - NOT modified
- No new roles added
- This is purely UI + query refactor
- Admin navigation scope remains: Companies (read-only), Users (read-only), Activity logs, System dashboard

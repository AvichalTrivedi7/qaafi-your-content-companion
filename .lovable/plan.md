

# Refactor: Separate Admin Dashboard from User Dashboard

## Problem

When an admin logs in and goes to `/dashboard`, they see the same user-level operational dashboard (inventory quantities, stock movement, delivery time, low stock alerts) that regular users see. This is incorrect -- admins are platform operators, not business users.

The correct admin dashboard already exists at `/__internal__/admin/` (SystemDashboard.tsx) with platform-level metrics, but admins can still access user-level views via `/dashboard`, `/dashboard/inventory`, and `/dashboard/shipments`.

## Solution

Redirect admin users away from user-level routes entirely, so they always land on the platform oversight dashboard. No changes to the user dashboard.

---

## Changes

### 1. Redirect Admin Users from `/dashboard` to `/__internal__/admin`

**File: `src/pages/admin/Dashboard.tsx`**

Add an early check: if the user is an admin, redirect them to `/__internal__/admin` instead of showing user-level operational data. Non-admin users continue to see the exact same dashboard they see today -- zero changes for them.

Also remove the admin-specific "Company Overview" section (Suppliers / Wholesalers / Retailers cards) since admins will never reach this component anymore.

### 2. Remove Inventory & Shipments from Admin Navigation

**File: `src/components/AdminLayout.tsx`**

Update the navigation builder so that when the user is an admin (regardless of route), the sidebar only shows:
- System Dashboard
- Companies (read-only)
- Users (read-only)  
- Activity Logs

Remove Inventory and Shipments from admin's nav items entirely. Non-admin users still see their normal navigation.

### 3. Add INVENTORY_UPDATED to System Activity Feed

**File: `src/pages/admin/SystemDashboard.tsx`**

Add `INVENTORY_UPDATED` to the `SYSTEM_ACTIVITY_TYPES` filter so the platform activity feed includes inventory update events alongside the existing COMPANY_CREATED, INVENTORY_IN, SHIPMENT_CREATED, and SHIPMENT_CANCELLED types.

### 4. Add Translation Key

**File: `src/contexts/LanguageContext.tsx`**

Add the `admin.systemActivityDescription` translation key if missing (for the activity feed section subtitle).

---

## What Does NOT Change

- User dashboard (`Dashboard.tsx` for non-admins) -- identical experience
- Database schema -- no modifications
- Roles or permissions -- no additions
- `SystemDashboard.tsx` metrics -- already correct (Total Companies, Active Companies, Total Users, New Companies, System Usage, Risk Signals)

## Technical Details

### Redirect Logic in Dashboard.tsx

```text
if (isAdmin && rolesLoaded) {
  return <Navigate to="/__internal__/admin" replace />;
}
```

This ensures admins are immediately sent to the platform dashboard. The `rolesLoaded` check prevents premature redirects during auth initialization.

### Navigation Logic in AdminLayout.tsx

```text
if (isAdmin) {
  // Always show admin navigation (system dashboard, companies, users, activity)
  // Never show inventory or shipments
  return adminNavItems;
}
// Non-admin users see regular navigation (dashboard, inventory, shipments)
```

### Activity Types Update

```text
Before: ['COMPANY_CREATED', 'INVENTORY_IN', 'SHIPMENT_CREATED', 'SHIPMENT_CANCELLED']
After:  ['COMPANY_CREATED', 'INVENTORY_IN', 'INVENTORY_UPDATED', 'SHIPMENT_CREATED', 'SHIPMENT_CANCELLED']
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/admin/Dashboard.tsx` | Add admin redirect, remove admin-only company overview section |
| `src/components/AdminLayout.tsx` | Remove Inventory/Shipments from admin nav, always show admin nav for admins |
| `src/pages/admin/SystemDashboard.tsx` | Add `INVENTORY_UPDATED` to activity feed filter |
| `src/contexts/LanguageContext.tsx` | Add any missing translation keys |


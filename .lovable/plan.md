

## Fix Critical Security Issue: Anonymous Data Access

### Problem
All database tables are accessible to unauthenticated (anonymous) users. Anyone with the public API key can query all tables and read email addresses, customer data, company access codes, inventory details, and business information without logging in.

### Solution
Add explicit RLS deny policies for the `anon` role on all 7 tables, blocking any unauthenticated access.

### Database Migration

A single migration will add `FOR ALL TO anon USING (false) WITH CHECK (false)` policies on:

1. `profiles` - blocks access to user emails
2. `companies` - blocks access to company data and access codes
3. `inventory_items` - blocks access to product/stock data
4. `shipments` - blocks access to customer names and shipment details
5. `activity_logs` - blocks access to business activity history
6. `reservations` - blocks access to reservation data
7. `user_roles` - blocks access to role assignments

### Technical Details

```sql
CREATE POLICY "Block anonymous access" ON public.profiles FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block anonymous access" ON public.companies FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block anonymous access" ON public.inventory_items FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block anonymous access" ON public.shipments FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block anonymous access" ON public.activity_logs FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block anonymous access" ON public.reservations FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block anonymous access" ON public.user_roles FOR ALL TO anon USING (false) WITH CHECK (false);
```

### What Won't Change
- No code changes needed -- this is database-only
- Authenticated user access remains unchanged
- All existing RLS policies for authenticated users stay intact
- No impact on application functionality


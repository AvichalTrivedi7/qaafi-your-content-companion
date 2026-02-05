-- Drop and recreate RLS policies as PERMISSIVE for correct OR logic
-- This ensures: Admin access OR company-scoped access works properly

-- ==================== INVENTORY_ITEMS ====================
DROP POLICY IF EXISTS "Admins can manage all inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can delete own company inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can insert own company inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can update own company inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can view own company inventory" ON public.inventory_items;

CREATE POLICY "Admins can manage all inventory" 
ON public.inventory_items FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own company inventory" 
ON public.inventory_items FOR SELECT 
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own company inventory" 
ON public.inventory_items FOR INSERT 
TO authenticated
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own company inventory" 
ON public.inventory_items FOR UPDATE 
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete own company inventory" 
ON public.inventory_items FOR DELETE 
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

-- ==================== SHIPMENTS ====================
DROP POLICY IF EXISTS "Admins can manage all shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can delete own company shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can insert own company shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can update own company shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can view own company shipments" ON public.shipments;

CREATE POLICY "Admins can manage all shipments" 
ON public.shipments FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own company shipments" 
ON public.shipments FOR SELECT 
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own company shipments" 
ON public.shipments FOR INSERT 
TO authenticated
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own company shipments" 
ON public.shipments FOR UPDATE 
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete own company shipments" 
ON public.shipments FOR DELETE 
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

-- ==================== RESERVATIONS ====================
DROP POLICY IF EXISTS "Admins can manage all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can delete own company reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can insert own company reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can update own company reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can view own company reservations" ON public.reservations;

CREATE POLICY "Admins can manage all reservations" 
ON public.reservations FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own company reservations" 
ON public.reservations FOR SELECT 
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own company reservations" 
ON public.reservations FOR INSERT 
TO authenticated
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own company reservations" 
ON public.reservations FOR UPDATE 
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete own company reservations" 
ON public.reservations FOR DELETE 
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

-- ==================== ACTIVITY_LOGS ====================
DROP POLICY IF EXISTS "Admins can manage all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can insert own company activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can view own company activity logs" ON public.activity_logs;

CREATE POLICY "Admins can manage all activity logs" 
ON public.activity_logs FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own company activity logs" 
ON public.activity_logs FOR SELECT 
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own company activity logs" 
ON public.activity_logs FOR INSERT 
TO authenticated
WITH CHECK (company_id = get_user_company_id(auth.uid()));
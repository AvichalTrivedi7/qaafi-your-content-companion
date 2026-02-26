
CREATE POLICY "Block anonymous access" ON public.profiles FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block anonymous access" ON public.companies FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block anonymous access" ON public.inventory_items FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block anonymous access" ON public.shipments FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block anonymous access" ON public.activity_logs FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block anonymous access" ON public.reservations FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block anonymous access" ON public.user_roles FOR ALL TO anon USING (false) WITH CHECK (false);

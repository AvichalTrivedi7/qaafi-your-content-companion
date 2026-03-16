-- Allow authenticated users to see all active companies (for seller dropdown in RFQ creation)
CREATE POLICY "Authenticated users can view active companies"
ON public.companies
FOR SELECT
TO authenticated
USING (is_active = true);
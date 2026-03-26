
-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Parties can view their rfqs" ON public.rfqs;

-- Allow all authenticated users to view RFQs (marketplace visibility)
CREATE POLICY "Authenticated users can view rfqs"
ON public.rfqs
FOR SELECT
TO authenticated
USING (true);

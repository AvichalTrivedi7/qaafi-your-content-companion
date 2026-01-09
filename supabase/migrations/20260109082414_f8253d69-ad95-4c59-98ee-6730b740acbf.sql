-- Drop existing permissive UPDATE policy that allows users to modify any field
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create hardened UPDATE policy that prevents company_id changes
-- Uses get_user_company_id() which is SECURITY DEFINER to avoid infinite recursion
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() 
  AND (
    -- company_id must remain unchanged (handles NULL case with IS NOT DISTINCT FROM)
    company_id IS NOT DISTINCT FROM get_user_company_id(auth.uid())
  )
);
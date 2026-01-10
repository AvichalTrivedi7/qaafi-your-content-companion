-- Create a SECURITY DEFINER function to allow users to create a company and assign themselves
CREATE OR REPLACE FUNCTION public.create_and_assign_company(
  company_name TEXT,
  company_type company_type
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id uuid;
  current_user_id uuid;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check user doesn't already have a company
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = current_user_id 
    AND company_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'User already belongs to a company';
  END IF;
  
  -- Create company
  INSERT INTO companies (name, type, access_code, is_active)
  VALUES (company_name, company_type, upper(substr(md5(random()::text), 1, 8)), true)
  RETURNING id INTO new_company_id;
  
  -- Assign user to company
  UPDATE profiles 
  SET company_id = new_company_id 
  WHERE user_id = current_user_id;
  
  RETURN new_company_id;
END;
$$;
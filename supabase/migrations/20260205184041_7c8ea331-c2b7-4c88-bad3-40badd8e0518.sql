-- 1. Enable pgcrypto extension in the extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Drop and recreate the function with correct reference to extensions.gen_random_bytes()
DROP FUNCTION IF EXISTS public.create_and_assign_company(text, company_type);

CREATE OR REPLACE FUNCTION public.create_and_assign_company(company_name text, company_type company_type)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_company_id uuid;
  current_user_id uuid;
  new_access_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  random_bytes bytea;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Enforce one-user-one-company: check user doesn't already have a company
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = current_user_id 
    AND company_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'User already belongs to a company';
  END IF;
  
  -- Generate cryptographically secure access code using extensions.gen_random_bytes()
  random_bytes := extensions.gen_random_bytes(8);
  new_access_code := '';
  FOR i IN 0..7 LOOP
    new_access_code := new_access_code || substr(chars, (get_byte(random_bytes, i) % 32) + 1, 1);
  END LOOP;
  
  -- Create company with secure access code
  INSERT INTO public.companies (name, type, access_code, is_active)
  VALUES (company_name, company_type, new_access_code, true)
  RETURNING id INTO new_company_id;
  
  -- Assign user to company atomically
  UPDATE public.profiles 
  SET company_id = new_company_id 
  WHERE user_id = current_user_id;
  
  RETURN new_company_id;
END;
$$;

-- 3. Restrict execution permissions
REVOKE ALL ON FUNCTION public.create_and_assign_company(text, company_type) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_and_assign_company(text, company_type) TO authenticated;
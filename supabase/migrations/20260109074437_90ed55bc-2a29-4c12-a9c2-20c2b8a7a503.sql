-- Update handle_new_user function to assign 'retailer' instead of 'pending'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  -- Assign 'retailer' role for immediate dashboard access
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'retailer');
  
  RETURN NEW;
END;
$$;

-- Promote current user to admin
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = '5b4c289d-f742-48ae-ae84-1681fe2893b3';
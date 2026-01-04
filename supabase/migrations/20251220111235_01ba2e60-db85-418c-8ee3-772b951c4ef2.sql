-- Fix function search path for generate_change_number
CREATE OR REPLACE FUNCTION public.generate_change_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.change_number := 'CHG-' || LPAD(nextval('public.change_number_seq')::text, 5, '0');
  RETURN NEW;
END;
$$;
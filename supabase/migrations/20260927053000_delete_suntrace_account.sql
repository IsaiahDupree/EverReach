-- Let a signed-in SunTrace user permanently delete their own account.
-- Deleting auth.users cascades through private SunTrace rows; submitted public
-- spots remain but are detached via ON DELETE SET NULL.
CREATE OR REPLACE FUNCTION public.delete_suntrace_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  requesting_user_id uuid := auth.uid();
BEGIN
  IF requesting_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM auth.users WHERE id = requesting_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_suntrace_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_suntrace_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_suntrace_account() TO authenticated;

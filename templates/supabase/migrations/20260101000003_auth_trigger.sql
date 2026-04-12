-- Migration: auto-create sun_profiles row on new user signup.
-- Runs SECURITY DEFINER so the trigger can write to sun_profiles
-- regardless of the calling role.

CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO sun_profiles (user_id, skin_type, age, daily_d_target_iu)
  VALUES (NEW.id, 2, 30, 1000)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_on_signup();

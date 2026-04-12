-- SunTrace Database Schema
-- Creates all tables, RLS policies, indexes, and seed data

-- Enable UUID extension (already enabled in most Supabase projects)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: sun_profiles
-- ============================================
CREATE TABLE IF NOT EXISTS sun_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  skin_type SMALLINT NOT NULL DEFAULT 3 CHECK (skin_type BETWEEN 1 AND 6),
  age SMALLINT NOT NULL DEFAULT 30 CHECK (age BETWEEN 1 AND 120),
  daily_d_target_iu INTEGER NOT NULL DEFAULT 1500,
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_session_date DATE,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  healthkit_enabled BOOLEAN NOT NULL DEFAULT false,
  location_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE sun_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON sun_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users write own profile" ON sun_profiles
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- Table: sun_sessions
-- ============================================
CREATE TABLE IF NOT EXISTS sun_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes NUMERIC(6,2) NOT NULL DEFAULT 0,
  uv_index_avg NUMERIC(4,2) NOT NULL DEFAULT 0,
  d_earned_iu INTEGER NOT NULL DEFAULT 0,
  burn_risk_level TEXT NOT NULL DEFAULT 'low' CHECK (burn_risk_level IN ('low','moderate','high','very_high')),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  location_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE sun_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own sessions" ON sun_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users write own sessions" ON sun_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sun_sessions_user_started
  ON sun_sessions(user_id, started_at DESC);

-- ============================================
-- Table: sun_daily_stats
-- ============================================
CREATE TABLE IF NOT EXISTS sun_daily_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  total_d_earned_iu INTEGER NOT NULL DEFAULT 0,
  total_minutes NUMERIC(8,2) NOT NULL DEFAULT 0,
  session_count INTEGER NOT NULL DEFAULT 0,
  goal_achieved BOOLEAN NOT NULL DEFAULT false,
  peak_uv_index NUMERIC(4,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, date)
);

ALTER TABLE sun_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own daily stats" ON sun_daily_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users write own daily stats" ON sun_daily_stats
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sun_daily_stats_user_date
  ON sun_daily_stats(user_id, date DESC);

-- ============================================
-- Table: sun_spots
-- ============================================
CREATE TABLE IF NOT EXISTS sun_spots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'US',
  spot_type TEXT NOT NULL DEFAULT 'park' CHECK (spot_type IN ('park','beach','rooftop','garden','trail','plaza')),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE sun_spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users read spots" ON sun_spots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users write own spots" ON sun_spots
  FOR INSERT WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users update own spots" ON sun_spots
  FOR UPDATE USING (auth.uid() = submitted_by);

-- ============================================
-- Table: sun_badges
-- ============================================
CREATE TABLE IF NOT EXISTS sun_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('streak','milestone','consistency','exploration','health')),
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('streak_days','total_sessions','total_d_iu','spots_visited','consecutive_goal')),
  requirement_value INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE sun_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users read badges" ON sun_badges
  FOR SELECT TO authenticated USING (true);

-- ============================================
-- Table: sun_user_badges
-- ============================================
CREATE TABLE IF NOT EXISTS sun_user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES sun_badges(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, badge_id)
);

ALTER TABLE sun_user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own user_badges" ON sun_user_badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System insert user_badges" ON sun_user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Table: sun_tips
-- ============================================
CREATE TABLE IF NOT EXISTS sun_tips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('timing','safety','nutrition','skin_care','seasonal')),
  skin_types SMALLINT[],
  is_pro BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE sun_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users read tips" ON sun_tips
  FOR SELECT TO authenticated USING (true);

-- ============================================
-- Table: sun_supplement_logs
-- ============================================
CREATE TABLE IF NOT EXISTS sun_supplement_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  supplement_type TEXT NOT NULL CHECK (supplement_type IN ('vitamin_d3','vitamin_d2','cod_liver_oil','multivitamin')),
  dose_iu INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE sun_supplement_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own supplement_logs" ON sun_supplement_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users write own supplement_logs" ON sun_supplement_logs
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- Table: sun_coach_messages
-- ============================================
CREATE TABLE IF NOT EXISTS sun_coach_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE sun_coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own coach_messages" ON sun_coach_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users write own coach_messages" ON sun_coach_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sun_coach_messages_user_created
  ON sun_coach_messages(user_id, created_at DESC);

-- ============================================
-- SEED DATA: sun_badges (30 badges)
-- ============================================
INSERT INTO sun_badges (code, name, description, icon, category, requirement_type, requirement_value) VALUES
  ('first_ray', 'First Ray', 'Completed your first sun session', '☀️', 'milestone', 'total_sessions', 1),
  ('sun_seeker', 'Sun Seeker', 'Completed 5 sun sessions', '🌤️', 'milestone', 'total_sessions', 5),
  ('solar_explorer', 'Solar Explorer', 'Completed 10 sun sessions', '🌞', 'milestone', 'total_sessions', 10),
  ('sun_veteran', 'Sun Veteran', 'Completed 25 sun sessions', '🏅', 'milestone', 'total_sessions', 25),
  ('century_sun', 'Century Sun', 'Completed 100 sun sessions', '💯', 'milestone', 'total_sessions', 100),
  ('streak_3', '3-Day Streak', 'Maintained a 3-day sun streak', '🔥', 'streak', 'streak_days', 3),
  ('streak_7', 'Week Warrior', 'Maintained a 7-day sun streak', '🔥', 'streak', 'streak_days', 7),
  ('streak_14', 'Two Week Titan', 'Maintained a 14-day sun streak', '🔥', 'streak', 'streak_days', 14),
  ('streak_30', 'Month Master', 'Maintained a 30-day sun streak', '🏆', 'streak', 'streak_days', 30),
  ('streak_60', '60-Day Champion', 'Maintained a 60-day sun streak', '🥇', 'streak', 'streak_days', 60),
  ('streak_100', 'Sun Centurion', 'Maintained a 100-day sun streak', '👑', 'streak', 'streak_days', 100),
  ('d_1000', 'D Starter', 'Earned 1,000 IU of vitamin D', '💊', 'health', 'total_d_iu', 1000),
  ('d_10000', 'D Achiever', 'Earned 10,000 IU of vitamin D', '💊', 'health', 'total_d_iu', 10000),
  ('d_50000', 'D Champion', 'Earned 50,000 IU of vitamin D', '💊', 'health', 'total_d_iu', 50000),
  ('d_100000', 'D Master', 'Earned 100,000 IU of vitamin D from the sun', '🌟', 'health', 'total_d_iu', 100000),
  ('d_500000', 'D Legend', 'Earned 500,000 IU of vitamin D from the sun', '⭐', 'health', 'total_d_iu', 500000),
  ('goal_3', 'Goal Getter', 'Hit daily vitamin D goal 3 days in a row', '🎯', 'consistency', 'consecutive_goal', 3),
  ('goal_7', 'Goal Streaker', 'Hit daily vitamin D goal 7 days in a row', '🎯', 'consistency', 'consecutive_goal', 7),
  ('goal_14', 'Goal Machine', 'Hit daily vitamin D goal 14 days in a row', '🎯', 'consistency', 'consecutive_goal', 14),
  ('goal_30', 'Goal Legend', 'Hit daily vitamin D goal 30 days in a row', '🏆', 'consistency', 'consecutive_goal', 30),
  ('spot_1', 'Spot Finder', 'Visited your first sun spot', '📍', 'exploration', 'spots_visited', 1),
  ('spot_5', 'Spot Explorer', 'Visited 5 different sun spots', '🗺️', 'exploration', 'spots_visited', 5),
  ('spot_10', 'Spot Hunter', 'Visited 10 different sun spots', '🗺️', 'exploration', 'spots_visited', 10),
  ('spot_20', 'Spot Master', 'Visited 20 different sun spots', '🗺️', 'exploration', 'spots_visited', 20),
  ('early_bird', 'Early Bird', 'Completed a session before 9am', '🌅', 'consistency', 'total_sessions', 1),
  ('golden_hour', 'Golden Hour', 'Completed a session during golden hour', '🌇', 'consistency', 'total_sessions', 1),
  ('peak_chaser', 'Peak Chaser', 'Sessioned during peak UV (UV ≥ 8)', '⚡', 'exploration', 'total_sessions', 1),
  ('gentle_start', 'Gentle Start', 'Completed a low UV session safely (UV < 3)', '🌤️', 'health', 'total_sessions', 1),
  ('supplement_tracker', 'Supplement Tracker', 'Logged your first vitamin D supplement', '💊', 'health', 'total_sessions', 1),
  ('coach_first', 'Ask the Coach', 'Had your first AI coach conversation', '🤖', 'milestone', 'total_sessions', 1)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- SEED DATA: sun_spots (20 US city parks/beaches)
-- ============================================
INSERT INTO sun_spots (name, description, latitude, longitude, city, state, country, spot_type, is_verified) VALUES
  ('Central Park Great Lawn', 'Wide open lawn perfect for midday sun sessions', 40.7812, -73.9665, 'New York', 'NY', 'US', 'park', true),
  ('Venice Beach', 'Famous beach with year-round sun and boardwalk', 33.9850, -118.4695, 'Los Angeles', 'CA', 'US', 'beach', true),
  ('Millennium Park', 'Chicago''s iconic park near Lake Michigan', 41.8826, -87.6226, 'Chicago', 'IL', 'US', 'park', true),
  ('Piedmont Park', 'Atlanta''s premier urban park with open meadows', 33.7879, -84.3747, 'Atlanta', 'GA', 'US', 'park', true),
  ('Golden Gate Park Meadow', 'Restored meadow for picnics and sun bathing', 37.7694, -122.4862, 'San Francisco', 'CA', 'US', 'park', true),
  ('Lady Bird Lake Boardwalk', 'Austin''s popular waterfront trail', 30.2500, -97.7503, 'Austin', 'TX', 'US', 'trail', true),
  ('Lummus Park Beach', 'South Beach''s sunny oceanfront park', 25.7765, -80.1300, 'Miami', 'FL', 'US', 'beach', true),
  ('Washington Monument Grounds', 'Open National Mall grounds with wide sky', 38.8895, -77.0353, 'Washington', 'DC', 'US', 'park', true),
  ('Boston Common', 'America''s oldest public park in the heart of Boston', 42.3554, -71.0655, 'Boston', 'MA', 'US', 'park', true),
  ('Balboa Park Prado', 'San Diego''s cultural heart with sunny promenades', 32.7341, -117.1443, 'San Diego', 'CA', 'US', 'park', true),
  ('Hermann Park Discovery Green', 'Houston''s urban oasis with open lawn areas', 29.7220, -95.3900, 'Houston', 'TX', 'US', 'park', true),
  ('Wash Park Meadow', 'Denver''s beloved urban park at 5,280ft altitude', 39.6977, -104.9627, 'Denver', 'CO', 'US', 'park', true),
  ('Greenlake Park', 'Seattle''s popular lake loop with open southern shore', 47.6789, -122.3297, 'Seattle', 'WA', 'US', 'park', true),
  ('Tempe Town Lake', 'Phoenix area waterfront with intense desert sun', 33.4264, -111.9400, 'Tempe', 'AZ', 'US', 'trail', true),
  ('Forsyth Park', 'Savannah''s grand park under Spanish moss', 32.0698, -81.0953, 'Savannah', 'GA', 'US', 'park', true),
  ('Shelby Farms Park', 'Memphis'' massive park with open prairie fields', 35.1495, -89.8768, 'Memphis', 'TN', 'US', 'park', true),
  ('Creve Coeur Lake', 'St. Louis area park with wide open sky', 38.7213, -90.4874, 'St. Louis', 'MO', 'US', 'park', true),
  ('Buffalo Bayou Park', 'Houston''s linear park along the bayou', 29.7636, -95.3740, 'Houston', 'TX', 'US', 'trail', true),
  ('Riverside Park', 'Minneapolis riverside with open views', 44.9427, -93.2632, 'Minneapolis', 'MN', 'US', 'park', true),
  ('Klyde Warren Park', 'Dallas'' urban rooftop park over freeway', 32.7893, -96.8016, 'Dallas', 'TX', 'US', 'plaza', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED DATA: sun_tips (50 tips)
-- ============================================
INSERT INTO sun_tips (title, body, category, skin_types, is_pro) VALUES
  ('Best time for vitamin D', 'The best time for vitamin D production is when UV index is 3 or higher, typically 10am-2pm in summer. Aim for midday exposure.', 'timing', NULL, false),
  ('Short sessions are effective', 'Even 10-15 minutes of midday sun can produce significant vitamin D. Consistency beats marathon sessions.', 'timing', NULL, false),
  ('Know your burn time', 'Your burn time varies with UV index. At UV 8, type I skin burns in just ~4 minutes. Track your progress.', 'safety', '{1,2}', false),
  ('Expose large skin areas', 'Arms and legs exposed produce ~3x more vitamin D than face and hands alone. Shorts and t-shirt maximize production.', 'timing', NULL, false),
  ('Sunscreen blocks D production', 'SPF 30 blocks about 97% of UV radiation, including D-producing rays. Get your D first, then apply sunscreen.', 'safety', NULL, false),
  ('Glass blocks UVB', 'Glass blocks UVB rays (vitamin D-producing) but allows UVA through. Sitting by a sunny window won''t help your D levels.', 'timing', NULL, false),
  ('Altitude increases UV', 'UV intensity increases ~10% per 1,000m elevation. Denver residents get more D from shorter sessions.', 'timing', NULL, false),
  ('Darker skin needs more sun', 'Higher melanin (skin types V-VI) blocks UV, requiring 3-6x more sun time than lighter skin to produce the same D.', 'timing', '{5,6}', false),
  ('Vitamin D and Calcium', 'Vitamin D helps absorb calcium. Pair your sun sessions with dairy or leafy greens for maximum bone benefit.', 'nutrition', NULL, false),
  ('Supplement in winter', 'In winter above 37°N latitude, UVB is insufficient for D production Nov-Feb. A D3 supplement of 1000-2000 IU/day bridges the gap.', 'seasonal', NULL, false),
  ('Check your D levels', 'Get a 25(OH)D blood test to know your baseline. Optimal levels are 40-60 ng/mL. Ask your doctor about testing.', 'safety', NULL, true),
  ('Omega-3 and sun health', 'Omega-3 fatty acids may reduce sunburn inflammation. Fatty fish like salmon is both a D source and anti-inflammatory.', 'nutrition', NULL, false),
  ('UV and latitude', 'Above 51°N (UK, Canada), effective UV for vitamin D is limited to April-September. Below 35°N, year-round exposure is possible.', 'timing', NULL, false),
  ('Morning UV is gentler', 'Morning UV (before 10am) has lower UVB intensity. Good for a gentle start, but less efficient for D production.', 'timing', '{1,2,3}', false),
  ('Reflective surfaces boost UV', 'Snow reflects 80% of UV, sand ~15-30%, water ~10%. Adjust burn time expectations near reflective surfaces.', 'safety', NULL, false),
  ('Vitamin D fat-soluble storage', 'Vitamin D is fat-soluble and stored in body fat. Overweight individuals may need more sun time for the same blood D increase.', 'health', NULL, true),
  ('Magnesium activates vitamin D', 'Magnesium is required to convert vitamin D to its active form. Low Mg can cause D supplementation to be ineffective.', 'nutrition', NULL, true),
  ('Psoriasis and UV therapy', 'Controlled UV exposure is a proven treatment for psoriasis. Consult a dermatologist for narrowband UVB phototherapy.', 'skin_care', NULL, true),
  ('Cloud cover impact', 'Light clouds reduce UV by 25-50%. Overcast skies can cut UV by 70-90%. Track cloud cover in your forecast.', 'timing', NULL, false),
  ('Ozone layer protection', 'The ozone layer filters harmful UVC and most UVB. Ozone depletion (especially over poles) increases UV risk.', 'safety', NULL, false),
  ('Sensitive skin after winter', 'After months indoors, your skin loses its natural UV tolerance. Start with 5-minute sessions and build up gradually.', 'safety', '{1,2,3}', false),
  ('UV index 3 is the threshold', 'Vitamin D production requires UV index ≥ 3. Below this threshold, even long sun exposure won''t build D levels.', 'timing', NULL, false),
  ('Protect eyes during sessions', 'UV damages eyes even when skin is fine. Wear UV-blocking sunglasses, especially at high UV levels.', 'safety', NULL, false),
  ('After-sun skin care', 'Post-session, moisturize exposed skin to maintain the skin barrier. Aloe vera gel soothes mild redness.', 'skin_care', '{1,2}', false),
  ('Sun and mood benefits', 'Sun exposure triggers serotonin release, improving mood. Even 20 minutes can reduce symptoms of seasonal depression.', 'health', NULL, false),
  ('D3 is better than D2', 'Vitamin D3 (cholecalciferol) raises blood D levels about 2x more effectively than D2. Check your supplement label.', 'nutrition', NULL, false),
  ('Track your progress', 'Logging sessions helps you see patterns in your UV exposure and D production over time. Consistency is key.', 'timing', NULL, false),
  ('Hydration and sun exposure', 'Sun exposure increases water loss through sweat. Drink water before, during, and after long sessions.', 'safety', NULL, false),
  ('Vitamin K2 pairs with D', 'Vitamin K2 helps direct calcium (absorbed via D) to bones rather than arteries. Consider a D3+K2 supplement combo.', 'nutrition', NULL, true),
  ('UV and eczema', 'For eczema sufferers, moderate UV exposure can reduce flares. Short, regular sessions often work better than occasional long ones.', 'skin_care', NULL, true),
  ('Reapply sunscreen every 2 hours', 'If you continue outdoor activities after your D session, reapply SPF 30+ sunscreen every 2 hours, especially after swimming.', 'safety', NULL, false),
  ('Children and vitamin D', 'Children need adequate vitamin D for bone development. The AAP recommends 400-600 IU/day; safe sun exposure is ideal.', 'health', NULL, false),
  ('Medication and photosensitivity', 'Some medications (tetracyclines, NSAIDs, certain BP meds) increase photosensitivity. Check with your pharmacist.', 'safety', NULL, true),
  ('UV reflection from buildings', 'Urban areas with glass buildings can reflect UV unexpectedly. Check the UV index even in shaded city streets.', 'safety', NULL, false),
  ('Sunburn vs. tan difference', 'A tan is your skin''s protective response to UV. A burn means UV exceeded your skin''s defense. Aim for tan, never burn.', 'skin_care', NULL, false),
  ('Best body position for D', 'Lying horizontally exposes maximum skin area. If you have 10 minutes, lying down produces more D than standing.', 'timing', NULL, false),
  ('Seasonal D depletion', 'D stores built in summer can last 3-4 months. Without summer banking, wintertime deficiency is common.', 'seasonal', NULL, false),
  ('Vitamin D and immune function', 'D receptors are found on immune cells. Adequate D levels support T-cell activation and pathogen response.', 'health', NULL, false),
  ('UV index app accuracy', 'UV index forecasts are based on clear-sky models. Actual UV can be 20-30% lower on partly cloudy days.', 'timing', NULL, false),
  ('Type VI skin challenges', 'Very dark skin has natural SPF of ~13, which while protective, means much longer sun exposure is needed for D.', 'timing', '{6}', false),
  ('Type I skin safety first', 'With your skin type, burn risk is high at UV 4+. Keep sessions under your burn time and seek shade afterward.', 'safety', '{1}', false),
  ('Midday myth', 'Many people think midday sun is dangerous and avoid it. In reality, midday (10am-2pm) is the most efficient time for D.', 'timing', NULL, false),
  ('Cloudy day UV', 'UV can still cause D production on cloudy days if index is ≥ 3. Don''t skip sessions just because it''s partly cloudy.', 'timing', NULL, false),
  ('Walking counts too', 'You don''t need to sunbathe. A 20-minute lunch walk with arms exposed counts as a valid D session.', 'timing', NULL, false),
  ('Consistent small sessions beat sporadic long ones', 'Daily 15-minute sessions typically produce more total vitamin D than one 90-minute session per week.', 'health', NULL, false),
  ('Track supplement vs. sun D separately', 'Knowing your supplement IU and sun IU separately helps you optimize the right balance for your health goals.', 'nutrition', NULL, true),
  ('Skin cancer prevention and D balance', 'Balanced UV exposure — enough for D production but not burning — is the evidence-based approach to sun health.', 'safety', NULL, false),
  ('UV index meaning', 'UV index 1-2 is low, 3-5 moderate, 6-7 high, 8-10 very high, 11+ extreme. Each step up roughly doubles UV intensity.', 'timing', NULL, false),
  ('Vitamin D testing cost', 'A 25-hydroxyvitamin D test costs $30-80 out of pocket, or is often covered by insurance. Annual testing is recommended.', 'health', NULL, true),
  ('Winter sun angles', 'In winter, the sun sits lower in the sky, and UV must pass through more atmosphere. This greatly reduces UVB even on sunny days.', 'seasonal', NULL, false)
ON CONFLICT DO NOTHING;

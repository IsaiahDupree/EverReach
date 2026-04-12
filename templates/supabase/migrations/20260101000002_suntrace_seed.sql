-- SunTrace Seed Data
-- Badges, sun spots, and tips

-- ============================================================
-- BADGES (30 total)
-- ============================================================

INSERT INTO badges (code, name, description, icon, category, requirement_type, requirement_value) VALUES

-- Streak badges
('streak_1',   'First Step',       'Complete your first streak day',            '☀️',  'streak',    'streak_days',    1),
('streak_3',   'Three Day Shine',  'Maintain a 3-day streak',                   '🌤️',  'streak',    'streak_days',    3),
('streak_7',   'Week Warrior',     'Maintain a 7-day streak',                   '🏆',  'streak',    'streak_days',    7),
('streak_14',  'Fortnight Sun',    'Maintain a 14-day streak',                  '🌟',  'streak',    'streak_days',    14),
('streak_30',  'Solar Month',      'Maintain a 30-day streak',                  '🥇',  'streak',    'streak_days',    30),
('streak_60',  'Radiant Two Months','Maintain a 60-day streak',                 '💫',  'streak',    'streak_days',    60),
('streak_100', 'Century of Sun',   'Maintain a 100-day streak',                 '🌞',  'streak',    'streak_days',    100),

-- Session count badges
('session_1',   'Hello Sunshine',  'Log your first sun session',                '👋',  'session',   'session_count',  1),
('session_5',   'Getting Started', 'Log 5 sun sessions',                        '🌻',  'session',   'session_count',  5),
('session_10',  'Sun Regular',     'Log 10 sun sessions',                       '⭐',  'session',   'session_count',  10),
('session_25',  'Quarter Century', 'Log 25 sun sessions',                       '🎯',  'session',   'session_count',  25),
('session_50',  'Half Century',    'Log 50 sun sessions',                       '🎖️',  'session',   'session_count',  50),
('session_100', 'Century Chaser',  'Log 100 sun sessions',                      '💯',  'session',   'session_count',  100),

-- Vitamin D / IU badges
('iu_1000',    'D Starter',        'Produce 1,000 IU of Vitamin D naturally',   '💊',  'vitamin_d', 'total_iu',       1000),
('iu_5000',    'D Builder',        'Produce 5,000 IU of Vitamin D naturally',   '🌱',  'vitamin_d', 'total_iu',       5000),
('iu_10000',   'D Champion',       'Produce 10,000 IU of Vitamin D naturally',  '🏅',  'vitamin_d', 'total_iu',       10000),
('iu_50000',   'D Legend',         'Produce 50,000 IU of Vitamin D naturally',  '🦁',  'vitamin_d', 'total_iu',       50000),

-- Explorer badges (spots visited, using session_count as proxy for spots visited)
('spots_1',     'Spot Seeker',     'Visit your first sun spot',                 '📍',  'explorer',  'spots_visited',  1),
('spots_5',     'Location Scout',  'Visit 5 different sun spots',               '🗺️',  'explorer',  'spots_visited',  5),
('spots_10',    'Sun Cartographer','Visit 10 different sun spots',              '🧭',  'explorer',  'spots_visited',  10),
('explorer_5km',  'Neighborhood Sun','Get sun within 5 km of home',             '🏘️',  'explorer',  'spots_visited',  5),
('explorer_10km', 'City Explorer', 'Explore sun spots across 10 km',            '🏙️',  'explorer',  'spots_visited',  10),
('explorer_50km', 'Regional Rover','Explore sun spots across 50 km',            '🚗',  'explorer',  'spots_visited',  50),

-- Coach / social badges
('coach_1',    'First Conversation','Have your first AI coach chat',             '🤖',  'social',    'coach_messages', 1),
('coach_10',   'Coach Regular',    'Have 10 AI coach conversations',             '💬',  'social',    'coach_messages', 10),
('coach_50',   'Sun Scholar',      'Have 50 AI coach conversations',             '📚',  'social',    'coach_messages', 50),

-- Health badges
('health_sync',     'Connected',     'Enable Apple Health sync',                '❤️',  'health',    'session_count',  1),
('supplement_first','Supplement Pro','Log your first supplement entry',          '💉',  'health',    'session_count',  1),
('early_bird',      'Early Bird',    'Log a session before 9 AM',               '🐦',  'health',    'session_count',  1),
('golden_hour',     'Golden Hour',   'Log a session during the golden hour',    '🌅',  'health',    'session_count',  1)

ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- SUN SPOTS (20 famous US locations with real coordinates)
-- ============================================================

INSERT INTO sun_spots (name, description, lat, lng, city, state, country, avg_uv_index, best_time_start, best_time_end, tags, is_verified, rating) VALUES

('Central Park — The Great Lawn',
 'Vast open lawn in the heart of Manhattan. Excellent open-sky exposure with minimal shade obstruction midday.',
 40.7812, -73.9665, 'New York', 'NY', 'US', 6.2, '10:00', '14:00',
 ARRAY['park', 'lawn', 'urban', 'iconic'], true, 4.7),

('Millennium Park — Crown Fountain Plaza',
 'Open plaza adjacent to Cloud Gate. Surrounded by low-rise buildings with excellent southern exposure.',
 41.8827, -87.6233, 'Chicago', 'IL', 'US', 5.8, '10:30', '14:30',
 ARRAY['park', 'plaza', 'urban', 'iconic'], true, 4.6),

('Golden Gate Park — Sharon Meadow',
 'Large open meadow in Golden Gate Park. Often foggy mornings but clears by late morning in summer.',
 37.7694, -122.4862, 'San Francisco', 'CA', 'US', 5.1, '11:00', '15:00',
 ARRAY['park', 'meadow', 'coastal', 'iconic'], true, 4.5),

('Zilker Metropolitan Park — Main Meadow',
 'Massive sunny meadow along Barton Creek in Austin. High UV and reliable sunshine most of the year.',
 30.2672, -97.7726, 'Austin', 'TX', 'US', 8.4, '09:00', '13:00',
 ARRAY['park', 'meadow', 'riverside', 'sunny'], true, 4.8),

('Balboa Park — Botanical Building Lawn',
 'Wide open lawns surrounded by Spanish Colonial Revival architecture. San Diego sunshine nearly every day.',
 32.7319, -117.1483, 'San Diego', 'CA', 'US', 8.9, '09:30', '13:30',
 ARRAY['park', 'garden', 'historic', 'sunny'], true, 4.9),

('South Beach — Ocean Drive',
 'Iconic Miami beach with intense UV exposure. Very high UV index year-round. Bring sunscreen.',
 25.7765, -80.1300, 'Miami', 'FL', 'US', 10.5, '08:00', '12:00',
 ARRAY['beach', 'ocean', 'iconic', 'high-uv'], true, 4.8),

('Lincoln Memorial Reflecting Pool',
 'Open plaza on the National Mall. No shade for long stretches. Great for midday Vitamin D.',
 38.8893, -77.0501, 'Washington', 'DC', 'US', 6.5, '10:00', '14:00',
 ARRAY['mall', 'historic', 'open', 'urban'], true, 4.4),

('Piedmont Park — Lake Clara Meer',
 'Open lakeside lawn in Atlanta. Warm sun most of the year. Popular dog-walking and picnic spot.',
 33.7879, -84.3733, 'Atlanta', 'GA', 'US', 7.8, '09:30', '13:30',
 ARRAY['park', 'lake', 'urban', 'sunny'], true, 4.6),

('Griffith Observatory Lawn',
 'Southwest-facing hillside lawn with sweeping LA Basin views. Very high UV on clear days.',
 34.1184, -118.3004, 'Los Angeles', 'CA', 'US', 9.2, '09:00', '13:00',
 ARRAY['park', 'hilltop', 'iconic', 'high-uv'], true, 4.7),

('Tempe Town Lake — Rio Salado Park',
 'Flat open desert park with almost zero cloud cover. Extreme UV — bring protection after 20 min.',
 33.4265, -111.9400, 'Tempe', 'AZ', 'US', 11.8, '07:30', '10:00',
 ARRAY['desert', 'lake', 'extreme-uv', 'morning-only'], true, 4.3),

('Discovery Green — Houston',
 'Downtown Houston park with open lawns. Hot and sunny; peak UV intensity from April–October.',
 29.7528, -95.3693, 'Houston', 'TX', 'US', 9.1, '09:00', '13:00',
 ARRAY['park', 'urban', 'downtown', 'sunny'], true, 4.4),

('Washington Park — Denver',
 'Large open-sky park with stunning Front Range views. High elevation boosts UV ~10% above sea level.',
 39.6989, -104.9750, 'Denver', 'CO', 'US', 8.7, '09:00', '13:00',
 ARRAY['park', 'high-altitude', 'mountain-view', 'open'], true, 4.7),

('Greenlake Park — Seattle',
 'Rare sunny spot in Seattle — open south-facing shoreline. Best May–September when skies clear.',
 47.6796, -122.3294, 'Seattle', 'WA', 'US', 4.8, '11:00', '15:00',
 ARRAY['park', 'lake', 'seasonal', 'pacific-nw'], true, 4.2),

('Forsyth Park — Savannah',
 'Beautiful historic park with large open lawns. Subtropical sun — excellent year-round exposure.',
 32.0686, -81.0960, 'Savannah', 'GA', 'US', 7.6, '09:30', '13:30',
 ARRAY['park', 'historic', 'fountain', 'sunny'], true, 4.8),

('Forest Park — St. Louis',
 'One of the largest urban parks in the US. Wide-open meadows with consistent midday sun.',
 38.6371, -90.2850, 'St. Louis', 'MO', 'US', 6.9, '10:00', '14:00',
 ARRAY['park', 'large', 'urban', 'meadow'], true, 4.5),

('Cheesman Park — Denver',
 'Elevated open-air park with 360-degree sky exposure. Thin air means higher UV — prime Vitamin D spot.',
 39.7294, -104.9640, 'Denver', 'CO', 'US', 9.0, '09:00', '13:00',
 ARRAY['park', 'high-altitude', 'open-sky', 'panoramic'], true, 4.6),

('Piedmont Park — Midtown Loop',
 'Popular running path around the perimeter meadow. South-facing stretch catches optimal UV 10–2pm.',
 33.7842, -84.3714, 'Atlanta', 'GA', 'US', 7.5, '10:00', '14:00',
 ARRAY['park', 'running', 'loop', 'urban'], true, 4.4),

('Bayfront Park — Miami',
 'Waterfront park in downtown Miami with stunning bay views. Intense year-round sun; bring water.',
 25.7717, -80.1873, 'Miami', 'FL', 'US', 10.2, '08:30', '12:00',
 ARRAY['waterfront', 'urban', 'bay', 'high-uv'], true, 4.5),

('Dolores Park — San Francisco',
 'South-facing hillside park in the Mission. One of SF''s sunniest spots — microclimate avoids the fog.',
 37.7596, -122.4269, 'San Francisco', 'CA', 'US', 6.4, '11:00', '15:00',
 ARRAY['park', 'hillside', 'sunny', 'urban'], true, 4.7),

('Palisades Park — Santa Monica',
 'Bluff-top park facing the Pacific. Excellent sun exposure; sea breeze keeps it cool in summer.',
 34.0195, -118.5108, 'Santa Monica', 'CA', 'US', 8.6, '09:00', '13:00',
 ARRAY['bluff', 'ocean-view', 'coastal', 'sunny'], true, 4.8)

ON CONFLICT DO NOTHING;


-- ============================================================
-- TIPS (10 entries)
-- ============================================================

INSERT INTO tips (category, skin_type_min, skin_type_max, title, content, source, is_active) VALUES

('safety', 1, 2,
 'Short Sessions Are Key for Fair Skin',
 'If you have very fair or light skin (Fitzpatrick Type 1–2), limit unprotected sun exposure to 10–15 minutes during peak hours. Your skin produces Vitamin D quickly but also burns quickly. After your target minutes, cover up or apply SPF 30+.',
 'American Academy of Dermatology', true),

('safety', 3, 4,
 'Optimal Window for Medium Skin Tones',
 'Medium olive skin (Fitzpatrick Type 3–4) typically needs 15–25 minutes of midday sun for adequate Vitamin D synthesis. You have more melanin protection, but UV damage still accumulates. Aim for sessions of 20 minutes maximum without sunscreen during your target window.',
 'Vitamin D Council', true),

('safety', 5, 6,
 'Longer Exposure Needed for Darker Skin',
 'Darker skin tones (Fitzpatrick Type 5–6) have higher melanin which reduces Vitamin D synthesis efficiency. You may need 30–60 minutes of sun exposure to produce the same amount as lighter skin types. Sessions of 30–45 minutes at a moderate UV index (4–7) are beneficial.',
 'Journal of Investigative Dermatology', true),

('vitamin_d', 1, 6,
 'Arms and Legs Matter Most',
 'The surface area exposed directly affects Vitamin D production. Exposing arms and legs (rather than just face and hands) increases synthesis by up to 4x. On warm days, roll up sleeves and wear shorts to maximize your session efficiency without extending exposure time.',
 'National Institutes of Health', true),

('timing', 1, 6,
 'The 10 AM to 2 PM Window',
 'UVB rays — the ones that trigger Vitamin D synthesis — are most intense between 10 AM and 2 PM. Sessions outside this window (early morning or late afternoon) produce significantly less Vitamin D per minute. For the most efficient dose, aim for solar noon ±2 hours.',
 'Endocrine Society Clinical Practice Guidelines', true),

('weather', 1, 6,
 'Clouds Reduce UVB But Not to Zero',
 'Light cloud cover reduces UVB intensity by about 25–50%. Heavy overcast can reduce it by 70–90%. On partly cloudy days, you may need to extend your session by 20–50% to reach your Vitamin D target. The SunTrace UV forecast adjusts your session goal based on cloud cover.',
 'World Health Organization', true),

('supplement', 1, 6,
 'When to Add a Supplement',
 'If you live above 37° latitude (roughly north of San Francisco or Washington DC), winter sun angles are too low for UVB to reach the surface from November to March. During these months, consider a Vitamin D3 supplement (1,000–2,000 IU/day) and log it in SunTrace to track your combined total.',
 'Endocrine Society', true),

('health', 1, 6,
 'Pair Vitamin D with K2 for Bone Health',
 'Vitamin D3 helps absorb calcium, but Vitamin K2 (MK-7 form) directs that calcium to your bones rather than soft tissue. If you take a Vitamin D supplement, consider pairing it with 90–200 mcg of Vitamin K2 daily. Log both in the Supplement section to track your intake.',
 'Harvard School of Public Health', true),

('skin', 1, 6,
 'Sunscreen After Your Target Minutes',
 'The goal is precise Vitamin D exposure — not zero protection. Complete your SunTrace session goal with unprotected skin, then apply SPF 30+ if you plan to stay outside longer. This strategy gets you the benefit without increasing skin damage risk.',
 'Skin Cancer Foundation', true),

('lifestyle', 1, 6,
 'Movement Boosts Circulation and D Uptake',
 'Light activity during sun sessions — walking, stretching, or yoga — improves circulation and may enhance Vitamin D processing. A 20-minute walk in the sun is more beneficial than sitting in the shade for an hour. Try combining your daily walk with your SunTrace session.',
 'Mayo Clinic', true)

ON CONFLICT DO NOTHING;

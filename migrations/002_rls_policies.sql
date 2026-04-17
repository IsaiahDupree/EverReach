-- Row-Level Security policies for events table

-- Allow authenticated users to insert events
CREATE POLICY "Users can insert events" ON events
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to read their own events
CREATE POLICY "Users can read own events" ON events
  FOR SELECT USING (
    auth.uid()::text = user_id
    OR user_id IS NULL
    OR (SELECT auth.role()) = 'service_role'
  );

-- Allow service role to perform all operations
CREATE POLICY "Service role can manage all events" ON events
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- Similar policies for metrics table
ALTER TABLE event_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read metrics" ON event_metrics
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage metrics" ON event_metrics
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

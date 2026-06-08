-- Disable Row Level Security (RLS) completely for these tables
-- Since you are running a local-first system with custom local auth,
-- the Supabase client doesn't have an auth.user session, which causes
-- the database to block all requests and return empty arrays.

ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;

-- Alternatively, if you want to keep RLS enabled but allow public access:
-- CREATE POLICY "Allow public read" ON students FOR SELECT USING (true);
-- CREATE POLICY "Allow public read" ON attendance FOR SELECT USING (true);
-- CREATE POLICY "Allow public read" ON subjects FOR SELECT USING (true);
-- CREATE POLICY "Allow public read" ON classes FOR SELECT USING (true);

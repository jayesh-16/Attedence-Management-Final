-- Clean up existing data to avoid conflicts
TRUNCATE TABLE attendance CASCADE;
TRUNCATE TABLE students CASCADE;
TRUNCATE TABLE subjects CASCADE;

-- 1. Insert Mock Subjects
INSERT INTO subjects (id, subject_name, class_id) VALUES
  (gen_random_uuid(), 'Advanced Database Systems', '61d3f3cc-748e-49d2-8212-6a3fc97136c8'),
  (gen_random_uuid(), 'Machine Learning', '22935fbd-2565-4dd8-8a14-f766e2c42cc3'),
  (gen_random_uuid(), 'Web Engineering', '65a136ff-b5a9-4c01-941e-d63499c101a7');

-- 2. Insert Mock Students
INSERT INTO students (id, roll_no, first_name, last_name, class_id) VALUES
  (gen_random_uuid(), '2021001', 'Aarav', 'Patel', '61d3f3cc-748e-49d2-8212-6a3fc97136c8'),
  (gen_random_uuid(), '2021002', 'Diya', 'Sharma', '61d3f3cc-748e-49d2-8212-6a3fc97136c8'),
  (gen_random_uuid(), '2021003', 'Rohan', 'Singh', '22935fbd-2565-4dd8-8a14-f766e2c42cc3'),
  (gen_random_uuid(), '2021004', 'Ananya', 'Gupta', '22935fbd-2565-4dd8-8a14-f766e2c42cc3'),
  (gen_random_uuid(), '2021005', 'Vikram', 'Verma', '65a136ff-b5a9-4c01-941e-d63499c101a7'),
  (gen_random_uuid(), '2021006', 'Neha', 'Reddy', '65a136ff-b5a9-4c01-941e-d63499c101a7');

-- 3. Generate Mock Attendance for the last 30 days
DO $$
DECLARE
  sub_record RECORD;
  stu_record RECORD;
  day_offset INT;
  target_date DATE;
  is_present VARCHAR;
  random_val FLOAT;
BEGIN
  -- Loop through the last 30 days
  FOR day_offset IN 0..29 LOOP
    target_date := CURRENT_DATE - day_offset;
    
    -- Skip weekends (EXTRACT ISODOW: 6 = Saturday, 7 = Sunday)
    IF EXTRACT(ISODOW FROM target_date) < 6 THEN
    
      -- For each subject
      FOR sub_record IN SELECT id, subject_name, class_id FROM subjects LOOP
        
        -- For each student that matches the subject's class
        FOR stu_record IN SELECT id FROM students WHERE class_id = sub_record.class_id LOOP
          
          -- Randomly assign present (85% chance) or absent (15% chance)
          random_val := random();
          IF random_val < 0.85 THEN
            is_present := 'Present';
          ELSE
            is_present := 'Absent';
          END IF;

          -- Insert attendance record
          INSERT INTO attendance (id, student_id, subject_name, class_id, date, status, recorded_by)
          VALUES (
            gen_random_uuid(),
            stu_record.id,
            sub_record.subject_name,
            sub_record.class_id,
            target_date,
            is_present,
            NULL
          );
        
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;
END $$;

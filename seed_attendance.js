const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].replace(/['"\r]+/g, '').trim() : '';
};

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const supabase = createClient(
  getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
);

async function seedAttendance() {
  console.log("Starting Attendance Seed for the last 30 days...");

  // 1. Get all classes
  const classes = [
    { id: "61d3f3cc-748e-49d2-8212-6a3fc97136c8", name: "SE MME" },
    { id: "22935fbd-2565-4dd8-8a14-f766e2c42cc3", name: "TE MME" },
    { id: "65a136ff-b5a9-4c01-941e-d63499c101a7", name: "BE MME" }
  ];

  // 2. Fetch all students and subjects
  console.log("Fetching students and subjects...");
  const { data: students, error: studentErr } = await supabase.from("students").select("id, class_id");
  const { data: subjects, error: subErr } = await supabase.from("subjects").select("subject_name, class_id");

  if (studentErr || subErr || !students || !subjects) {
    console.error("Failed to fetch students or subjects", studentErr || subErr);
    return;
  }

  // 3. Generate dates for the last 30 days
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // Skip Sundays
    if (d.getDay() !== 0) {
      dates.push(d.toISOString().split('T')[0]); // YYYY-MM-DD
    }
  }

  console.log(`Generated ${dates.length} valid working days. Spawning records...`);

  let records = [];

  for (const cls of classes) {
    const classStudents = students.filter(s => s.class_id === cls.id);
    const classSubjects = subjects.filter(s => s.class_id === cls.id);

    if (classSubjects.length === 0 || classStudents.length === 0) continue;

    for (const date of dates) {
      // Pick 2 random subjects taught on this day for the class
      const todaySubjects = [
        classSubjects[Math.floor(Math.random() * classSubjects.length)].subject_name,
        classSubjects[Math.floor(Math.random() * classSubjects.length)].subject_name
      ];

      for (const subject_name of [...new Set(todaySubjects)]) { // avoid duplicate subject on same day
        for (const student of classStudents) {
          // 85% chance of being present to make the graphs look realistic but show some absences
          const isPresent = Math.random() < 0.85;
          
          records.push({
            id: crypto.randomUUID(),
            student_id: student.id,
            class_id: cls.id,
            subject_name: subject_name,
            date: date,
            status: isPresent ? 'Present' : 'Absent'
          });
        }
      }
    }
  }

  console.log(`Total Attendance Records to Insert: ${records.length}`);
  console.log("Inserting in batches of 500 to prevent payload limits...");

  const batchSize = 500;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from("attendance").insert(batch);
    if (error) {
      console.error(`Error inserting batch ${i / batchSize}:`, error);
    } else {
      console.log(`Successfully inserted batch ${i / batchSize + 1} / ${Math.ceil(records.length / batchSize)}`);
    }
  }

  console.log("\n✅ Attendance Seeding Complete! The analytics graphs should now be fully populated.");
}

seedAttendance();

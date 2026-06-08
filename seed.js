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

const classes = [
  { id: "61d3f3cc-748e-49d2-8212-6a3fc97136c8", name: "SE MME" },
  { id: "22935fbd-2565-4dd8-8a14-f766e2c42cc3", name: "TE MME" },
  { id: "65a136ff-b5a9-4c01-941e-d63499c101a7", name: "BE MME" }
];

const subjectNames = {
  "SE MME": ["Thermodynamics", "Material Science", "Fluid Mechanics", "Strength of Materials", "Engineering Mathematics"],
  "TE MME": ["Heat Treatment", "Mechanical Metallurgy", "Foundry Technology", "Welding Technology", "Metal Forming"],
  "BE MME": ["Composite Materials", "Failure Analysis", "Powder Metallurgy", "Surface Engineering", "Nanomaterials"]
};

const firstNames = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Ayaan", "Krishna", "Ishaan", "Shaurya", "Atharv", "Ananya", "Myra", "Saanvi", "Kiara", "Diya", "Pari", "Navya", "Riya", "Avni"];
const lastNames = ["Sharma", "Patel", "Singh", "Kumar", "Gupta", "Deshmukh", "Joshi", "Kulkarni", "Desai", "Rao", "Reddy", "Nair", "Pillai", "Chauhan", "Yadav", "Verma"];

function getRandomName() {
  const f = firstNames[Math.floor(Math.random() * firstNames.length)];
  const l = lastNames[Math.floor(Math.random() * lastNames.length)];
  return { f, l };
}

async function seed() {
  console.log("Starting DB Seed...");

  for (const cls of classes) {
    console.log(`\n--- Seeding ${cls.name} ---`);
    
    // 1. Generate 5 Subjects
    console.log("Generating Subjects...");
    const subjects = [];
    for (const subName of subjectNames[cls.name]) {
      subjects.push({
        id: crypto.randomUUID(),
        subject_name: subName,
        class_id: cls.id
      });
    }
    const { error: subErr } = await supabase.from("subjects").insert(subjects);
    if (subErr) console.error("Error inserting subjects:", subErr);
    
    // 2. Generate 5 Teachers
    console.log("Generating Teachers...");
    const teachers = [];
    for (let i = 0; i < 5; i++) {
      const { f, l } = getRandomName();
      teachers.push({
        id: crypto.randomUUID(),
        first_name: "Dr. " + f,
        last_name: l,
        email: `${f.toLowerCase()}.${l.toLowerCase()}${Math.floor(Math.random()*100)}@tcet.edu`,
        role: "teacher"
      });
    }
    const { error: tErr } = await supabase.from("users").insert(teachers);
    if (tErr) console.error("Error inserting teachers:", tErr);

    // 3. Generate 60 Students
    console.log("Generating Students...");
    const students = [];
    for (let i = 0; i < 60; i++) {
      const { f, l } = getRandomName();
      students.push({
        id: crypto.randomUUID(),
        first_name: f,
        last_name: l,
        email: `${f.toLowerCase()}.${l.toLowerCase()}${Math.floor(Math.random()*1000)}@tcet.edu`,
        role: "student",
        class_id: cls.id
      });
    }
    
    // Insert students in batches of 30 to avoid payload size limits if any
    await supabase.from("users").insert(students.slice(0, 30));
    await supabase.from("users").insert(students.slice(30, 60));

    // 4. Generate Timetable (Mon - Fri)
    console.log("Generating Timetable...");
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const timetable = [];
    
    for (const day of days) {
      // 08:00 - Theory (1 hour)
      timetable.push({
        class_id: cls.id,
        subject_id: subjects[Math.floor(Math.random() * 5)].id,
        teacher_id: teachers[Math.floor(Math.random() * 5)].id,
        day_of_week: day,
        start_time: "08:00:00",
        end_time: "09:00:00",
        class_type: "Theory"
      });
      // 09:00 - Theory (1 hour)
      timetable.push({
        class_id: cls.id,
        subject_id: subjects[Math.floor(Math.random() * 5)].id,
        teacher_id: teachers[Math.floor(Math.random() * 5)].id,
        day_of_week: day,
        start_time: "09:00:00",
        end_time: "10:00:00",
        class_type: "Theory"
      });
      // 10:00 - Theory (1 hour)
      timetable.push({
        class_id: cls.id,
        subject_id: subjects[Math.floor(Math.random() * 5)].id,
        teacher_id: teachers[Math.floor(Math.random() * 5)].id,
        day_of_week: day,
        start_time: "10:00:00",
        end_time: "11:00:00",
        class_type: "Theory"
      });
      // 11:00 - Practical (2 hours)
      timetable.push({
        class_id: cls.id,
        subject_id: subjects[Math.floor(Math.random() * 5)].id,
        teacher_id: teachers[Math.floor(Math.random() * 5)].id,
        day_of_week: day,
        start_time: "11:00:00",
        end_time: "13:00:00",
        class_type: "Practical"
      });
      // 14:00 - Tutorial (1 hour)
      timetable.push({
        class_id: cls.id,
        subject_id: subjects[Math.floor(Math.random() * 5)].id,
        teacher_id: teachers[Math.floor(Math.random() * 5)].id,
        day_of_week: day,
        start_time: "14:00:00",
        end_time: "15:00:00",
        class_type: "Tutorial"
      });
    }
    const { error: ttErr } = await supabase.from("timetable").insert(timetable);
    if (ttErr) console.error("Error inserting timetable:", ttErr);
  }

  console.log("\n✅ Seeding Complete!");
}

seed();

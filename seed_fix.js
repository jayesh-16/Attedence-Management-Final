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

const firstNames = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Ayaan", "Krishna", "Ishaan", "Shaurya", "Atharv", "Ananya", "Myra", "Saanvi", "Kiara", "Diya", "Pari", "Navya", "Riya", "Avni"];
const lastNames = ["Sharma", "Patel", "Singh", "Kumar", "Gupta", "Deshmukh", "Joshi", "Kulkarni", "Desai", "Rao", "Reddy", "Nair", "Pillai", "Chauhan", "Yadav", "Verma"];

function getRandomName() {
  const f = firstNames[Math.floor(Math.random() * firstNames.length)];
  const l = lastNames[Math.floor(Math.random() * lastNames.length)];
  return { f, l };
}

async function fixStudents() {
  console.log("Fixing Students Seed...");

  for (const cls of classes) {
    console.log(`Generating 60 Students for ${cls.name}...`);
    const students = [];
    for (let i = 0; i < 60; i++) {
      const { f, l } = getRandomName();
      students.push({
        id: crypto.randomUUID(),
        first_name: f,
        last_name: l,
        roll_no: `2026${cls.name.substring(0,1)}${i.toString().padStart(3, '0')}`,
        class_id: cls.id
      });
    }
    
    await supabase.from("students").insert(students.slice(0, 30));
    await supabase.from("students").insert(students.slice(30, 60));
  }

  console.log("✅ Students Fix Complete!");
}

fixStudents();

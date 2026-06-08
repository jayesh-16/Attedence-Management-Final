const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const match = envContent.match(/GEMINI_API_KEY=(.*)/);

if (match && match[1]) {
  const key = match[1].replace(/['"\r]+/g, '').trim();
  console.log("Found key ending in: " + key.slice(-4));
  
  fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + key)
    .then(r => r.json())
    .then(d => {
      if (d.error) {
        console.error("API Error:", d.error.message);
      } else if (d.models) {
        console.log("Available models:");
        d.models.filter(m => m.supportedGenerationMethods.includes("generateContent")).forEach(m => console.log(m.name));
      } else {
        console.log(d);
      }
    })
    .catch(console.error);
} else {
  console.log("Key not found");
}

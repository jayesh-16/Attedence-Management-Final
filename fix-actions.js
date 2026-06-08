const fs = require('fs');
let content = fs.readFileSync('app/actions.ts', 'utf8');

const oldFunc = \export const loginLocalAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Local Auth (Option 1): Hardcoded master password
  if (email === "admin@tcet.edu" && password === "admin") {
    // Set a secure HTTP-only cookie to track local session
    const cookieStore = await cookies();
    const cookieOpts = {
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    };
    cookieStore.set("local_auth_session", "authenticated", { ...cookieOpts, httpOnly: true });
    cookieStore.set("auth_role", "admin", cookieOpts);
    cookieStore.set("auth_name", "Master Admin", cookieOpts);
    cookieStore.set("auth_email", "admin@tcet.edu", cookieOpts);
    
    return redirect("/");
  }

  // If login fails
  return encodedRedirect("error", "/sign-in", "Invalid email or password");
};\;

const newFunc = \export const loginLocalAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (email === "admin@tcet.edu" && password === "admin") {
    const cookieStore = await cookies();
    const cookieOpts = {
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    };
    cookieStore.set("local_auth_session", "authenticated", { ...cookieOpts, httpOnly: true });
    cookieStore.set("auth_role", "admin", cookieOpts);
    cookieStore.set("auth_name", "Master Admin", cookieOpts);
    cookieStore.set("auth_email", "admin@tcet.edu", cookieOpts);
    return redirect("/");
  }

  const { createClient } = await import("@/utils/supabase/server");
  const supabase = await createClient();
  const crypto = require("crypto");
  const hash = crypto.createHash('sha256').update(password).digest('hex');

  const { data: userData } = await supabase.from('users').select('*').eq('email', email).single();
  if (userData && userData.password === hash) {
    const cookieStore = await cookies();
    const cookieOpts = { secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 };
    cookieStore.set("local_auth_session", "authenticated", { ...cookieOpts, httpOnly: true });
    cookieStore.set("auth_role", userData.role, cookieOpts);
    cookieStore.set("auth_name", \\\\ \\\\, cookieOpts);
    cookieStore.set("auth_email", userData.email, cookieOpts);
    return redirect("/");
  }

  const { data: studentData } = await supabase.from('students').select('*').eq('roll_no', email).single();
  if (studentData && studentData.password === hash) {
    const cookieStore = await cookies();
    const cookieOpts = { secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 };
    cookieStore.set("local_auth_session", "authenticated", { ...cookieOpts, httpOnly: true });
    cookieStore.set("auth_role", "student", cookieOpts);
    cookieStore.set("auth_name", \\\\ \\\\, cookieOpts);
    cookieStore.set("auth_email", studentData.roll_no, cookieOpts);
    return redirect("/");
  }

  return encodedRedirect("error", "/sign-in", "Invalid credentials or password not set.");
};\;

content = content.replace(oldFunc, newFunc);
// Remove trailing \r from the string comparison in case it differs
content = content.replace(/export const loginLocalAction = async \\(formData: FormData\\) => \\{[\\s\\S]*?return encodedRedirect\\("error", "\\/sign-in", "Invalid email or password"\\);\\s*\\};/g, newFunc);

fs.writeFileSync('app/actions.ts', content);

"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { encodedRedirect } from "@/utils/utils";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Helper to check admin
async function requireAdmin() {
  const cookieStore = await cookies();
  const authRole = cookieStore.get("auth_role");
  if (authRole?.value !== "admin") {
    throw new Error("Unauthorized");
  }
}

export async function updateSemesterDatesAction(formData: FormData) {
  try {
    await requireAdmin();
    const classId = formData.get("class_id")?.toString();
    const startDate = formData.get("start_date")?.toString();
    const endDate = formData.get("end_date")?.toString();

    if (!classId || !startDate || !endDate) {
      return { success: false, error: "Class ID, Start, and End dates are required." };
    }

    const supabase = await createClient();
    
    // UPSERT pattern: onConflict uses class_id now
    const { error } = await supabase
      .from("semester_config")
      .upsert({ class_id: classId, start_date: startDate, end_date: endDate }, { onConflict: "class_id" });

    if (error) throw error;
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function uploadCalendarAction(formData: FormData) {
  try {
    await requireAdmin();
    const file = formData.get("file") as File;
    const classId = formData.get("class_id")?.toString();
    
    if (!file) {
      return { success: false, error: "No file uploaded." };
    }
    
    if (!classId) {
      return { success: false, error: "Class ID is missing." };
    }

    if (!process.env.GEMINI_API_KEY) {
      return { success: false, error: "GEMINI_API_KEY is not set in your .env file." };
    }

    console.log("Processing Vision AI OCR for:", file.name);
    
    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    
    // Map MIME type
    const mimeType = file.type || "image/jpeg";
    
    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `
      You are an expert at extracting structured data from academic calendar images.
      Extract all holidays, exams, and major events from the attached calendar.
      Return ONLY a raw JSON array of objects. Do not include markdown codeblocks (\`\`\`json) or any other text.
      Each object must strictly match this structure:
      {
        "event_name": "Name of the event",
        "start_date": "YYYY-MM-DD",
        "end_date": "YYYY-MM-DD",
        "event_type": "holiday" // Must be exactly one of: "holiday", "exam", "event"
      }
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]);

    const responseText = result.response.text().trim();
    console.log("Vision AI Raw Response:", responseText);
    
    // Try to parse the JSON (handle potential markdown formatting just in case)
    let parsedEvents = [];
    try {
      const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedEvents = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse JSON from AI:", e);
      return { success: false, error: "AI failed to return valid JSON format." };
    }

    if (!Array.isArray(parsedEvents) || parsedEvents.length === 0) {
      return { success: false, error: "No events were detected in the uploaded file." };
    }

    // Inject class_id into each event
    const eventsWithClass = parsedEvents.map((e: any) => ({
      ...e,
      class_id: classId
    }));

    const supabase = await createClient();
    
    // Insert extracted events into DB
    const { error } = await supabase.from("calendar_events").insert(eventsWithClass);
    if (error) throw error;

    return { success: true, message: `Successfully extracted and saved ${parsedEvents.length} events from the calendar!` };
  } catch (err: any) {
    console.error("Calendar Upload Error:", err);
    return { success: false, error: err.message };
  }
}

export async function addTimetableEntryAction(formData: FormData) {
  try {
    await requireAdmin();
    const classId = formData.get("class_id")?.toString();
    const subjectId = formData.get("subject_id")?.toString();
    const teacherId = formData.get("teacher_id")?.toString();
    const dayOfWeek = formData.get("day_of_week")?.toString();
    const startTime = formData.get("start_time")?.toString();
    const endTime = formData.get("end_time")?.toString();
    const classType = formData.get("class_type")?.toString();

    if (!classId || !subjectId || !teacherId || !dayOfWeek || !startTime || !endTime || !classType) {
      return { success: false, error: "All fields are required." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("timetable")
      .insert({
        class_id: classId,
        subject_id: subjectId,
        teacher_id: teacherId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        class_type: classType
      });

    if (error) throw error;
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTimetableEntryAction(id: string) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("timetable").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteCalendarEventAction(id: string) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const classIdMap: Record<string, string> = {
  "61d3f3cc-748e-49d2-8212-6a3fc97136c8": "SE MME",
  "22935fbd-2565-4dd8-8a14-f766e2c42cc3": "TE MME",
  "65a136ff-b5a9-4c01-941e-d63499c101a7": "BE MME",
};

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: timetables, error: tErr } = await supabase.from('timetable').select('*');
    const { data: subjects, error: sErr } = await supabase.from('subjects').select('*');
    const { data: extraLectures, error: eErr } = await supabase.from('extra_lectures').select('*');
    const { data: students, error: stdErr } = await supabase.from('students').select('id, class_id');

    if (tErr) console.error("Timetable fetch error:", tErr);
    if (sErr) console.error("Subjects fetch error:", sErr);
    if (eErr) console.error("Special lectures fetch error:", eErr);
    if (stdErr) console.error("Students fetch error:", stdErr);
    
    if (tErr || eErr || sErr || stdErr) {
        return NextResponse.json({ 
            error: "Failed to fetch data from Supabase.", 
            details: { tErr, sErr, eErr, stdErr } 
        }, { status: 500 });
    }

    // Transform regular timetables
    const transformedTimetables = (timetables || []).map(t => {
      const subject = (subjects || []).find(s => s.id === t.subject_id);
      return {
        id: t.id,
        teacher_id: t.teacher_id,
        class_id: classIdMap[t.class_id] || t.class_id,
        subject_name: subject?.subject_name || "Unknown",
        class_type: t.class_type,
        day_of_week: t.day_of_week,
        start_time: t.start_time.substring(0, 5),
        end_time: t.end_time.substring(0, 5),
        is_extra: 0,
        date: null
      };
    });

    // Transform extra_lectures
    const transformedExtra = (extraLectures || []).map(ex => {
      const subject = (subjects || []).find(s => s.id === ex.subject_id);
      const isExchange = ex.lecture_type === 'exchange';
      return {
        id: ex.id,
        teacher_id: isExchange ? ex.exchange_teacher_id : ex.teacher_id,
        class_id: classIdMap[ex.class_id] || ex.class_id,
        subject_name: subject?.subject_name || "Special Class",
        class_type: ex.class_type,
        day_of_week: 0,
        start_time: ex.start_time.substring(0, 5),
        end_time: ex.end_time.substring(0, 5),
        is_extra: 1,
        date: ex.lecture_date
      };
    });

    const combinedTimetable = [
      ...transformedTimetables,
      ...transformedExtra
    ];

    // Transform assigned subjects
    const teacherSubjectsMap = new Map();
    (timetables || []).forEach(t => {
      const key = `${t.teacher_id}-${t.subject_id}-${t.class_id}`;
      if (!teacherSubjectsMap.has(key)) {
        const subject = (subjects || []).find(s => s.id === t.subject_id);
        if (subject) {
          teacherSubjectsMap.set(key, {
            teacher_id: t.teacher_id,
            subject_name: subject.subject_name,
            class_id: classIdMap[t.class_id] || t.class_id
          });
        }
      }
    });

    // Transform students
    const transformedStudents = (students || []).map(s => ({
      id: s.id,
      class_id: classIdMap[s.class_id] || s.class_id
    }));

    return NextResponse.json({
        success: true,
        timetables: [...transformedTimetables, ...transformedExtra],
        teacher_subjects: Array.from(teacherSubjectsMap.values()),
        students: transformedStudents
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const records = body.records || [];

    if (records.length === 0) {
      return NextResponse.json({ success: true, inserted: 0 });
    }

    require('fs').appendFileSync('sync_debug.log', JSON.stringify(records, null, 2) + '\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Helper to validate UUID
    const isValidUUID = (uuid: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid);

    const reverseClassIdMap: Record<string, string> = {
      "SE MME": "61d3f3cc-748e-49d2-8212-6a3fc97136c8",
      "TE MME": "22935fbd-2565-4dd8-8a14-f766e2c42cc3",
      "BE MME": "65a136ff-b5a9-4c01-941e-d63499c101a7",
    };

    // Find all teachers to filter them out of student attendance
    const allUserIds = records.map((r: any) => r.user_id).filter(isValidUUID);
    const teacherIds = new Set();
    if (allUserIds.length > 0) {
        const { data: teachers } = await supabase.from('users').select('id').in('id', allUserIds);
        (teachers || []).forEach((t: any) => teacherIds.add(t.id));
    }

    // Prepare data for insertion, filtering out legacy/invalid records and teachers
    const insertData = records
      .map((r: any) => {
        let classId = r.class_id;
        if (classId && reverseClassIdMap[classId]) {
            classId = reverseClassIdMap[classId];
        }
        return {
          student_id: r.user_id,
          class_id: classId || null,
          subject_name: r.subject_name || 'N/A',
          date: r.timestamp.split(' ')[0], // Extract just the date part (YYYY-MM-DD)
          status: 'Present',               // If they scanned the device, they are present
          created_at: new Date(r.timestamp).toISOString() // Exact scan time
        };
      })
      .filter((r: any) => isValidUUID(r.student_id) && !teacherIds.has(r.student_id) && (!r.class_id || isValidUUID(r.class_id)));

    // --- NEW: Automatically create extra lectures when teachers start them ---
    const extraSessions = records.filter((r: any) => r.session_type === 'Extra' && (r.type === 'IN' || r.status === 'IN') && teacherIds.has(r.user_id));
    if (extraSessions.length > 0) {
      for (const r of extraSessions) {
        let classId = r.class_id;
        if (classId && reverseClassIdMap[classId]) classId = reverseClassIdMap[classId];

            if (classId && isValidUUID(classId) && r.subject_name) {
              // Lookup subject_id
              const { data: subjectData } = await supabase.from('subjects')
                .select('id').eq('subject_name', r.subject_name).eq('class_id', classId).single();
              
              if (subjectData) {
                const dateStr = r.timestamp.split(' ')[0];
                const timeStr = r.timestamp.split(' ')[1].substring(0, 5); // HH:MM
                
                // Check if this extra lecture already exists
                const { data: existing } = await supabase.from('extra_lectures')
                  .select('id').eq('subject_id', subjectData.id).eq('class_id', classId)
                  .eq('teacher_id', r.user_id).eq('lecture_date', dateStr).maybeSingle();
                
                if (!existing) {
                  const startHour = parseInt(timeStr.split(':')[0]) || 9;
                  const endHour = (startHour + 1).toString().padStart(2, '0') + ":00";
                  
                  await supabase.from('extra_lectures').insert({
                    subject_id: subjectData.id,
                    class_id: classId,
                    teacher_id: r.user_id,
                    lecture_date: dateStr,
                    start_time: timeStr,
                    end_time: endHour,
                    class_type: "Theory",
                    lecture_type: "extra"
                  });
                }
              }
            }
      }
    }
    // -------------------------------------------------------------------------
    // --- NEW: Mark un-scanned students as Absent ---
    const absentData: any[] = [];
    if (insertData.length > 0) {
      // Group by class_id + date + subject
      const sessionGroups = new Map();
      insertData.forEach((r: any) => {
        if (!r.class_id) return;
        const key = `${r.class_id}|${r.date}|${r.subject_name}`;
        if (!sessionGroups.has(key)) sessionGroups.set(key, new Set());
        sessionGroups.get(key).add(r.student_id);
      });

      for (const [key, presentIds] of sessionGroups.entries()) {
        const [classId, dateStr, subjectName] = key.split('|');
        
        // 1. Fetch all students belonging to this class
        const { data: allStudents } = await supabase.from('students').select('id').eq('class_id', classId);
        if (!allStudents || allStudents.length === 0) continue;

        // 2. Fetch existing attendance records for this class/subject/date to avoid overwriting early syncs
        const { data: existingRecords } = await supabase.from('attendance')
          .select('student_id')
          .eq('class_id', classId).eq('date', dateStr).eq('subject_name', subjectName);
        
        const existingIds = new Set((existingRecords || []).map(r => r.student_id));

        // 3. Mark students absent if they didn't scan NOW and haven't scanned PREVIOUSLY today
        for (const student of allStudents) {
          if (!presentIds.has(student.id) && !existingIds.has(student.id)) {
            absentData.push({
              student_id: student.id,
              class_id: classId,
              subject_name: subjectName,
              date: dateStr,
              status: 'Absent',
              created_at: new Date().toISOString()
            });
          }
        }
      }
    }
    // -------------------------------------------------------------------------

    const allInsertData = [...insertData, ...absentData];

    if (allInsertData.length === 0) {
      return NextResponse.json({ success: true, inserted: 0, note: "All records processed" });
    }

    const { error } = await supabase.from('attendance').insert(allInsertData);

    if (error) {
      console.error("Failed to insert attendance records:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, inserted: allInsertData.length });

  } catch (error: any) {
    console.error("Attendance sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

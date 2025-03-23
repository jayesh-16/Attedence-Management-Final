import { createClient } from './supabase/client';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  roll_no: string;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: 'Present' | 'Absent';
  recorded_by?: string;
  created_at?: string;
  updated_at?: string;
  subject_name: string;
  students: Student;
}

interface StudentAttendance {
  id: string;
  studentId: string;
  rollNo: string;
  name: string;
  date: string;
  status: "Present" | "Absent";
  subject: string;
  classSection: string;
  createdAt: string;
}

/**
 * Check if attendance was recently recorded for this class (within the last hour)
 * @returns true if attendance was recently recorded, false otherwise
 */
async function wasAttendanceRecentlyRecorded(classId: string, date: string) {
  const supabase = createClient();
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('created_at')
      .eq('class_id', classId)
      .eq('date', date)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error checking recent attendance:', error);
      return false; // If we can't check, allow recording to prevent locking users out
    }
    
    if (data && data.length > 0) {
      const lastRecordTime = new Date(data[0].created_at);
      const timeDiff = Date.now() - lastRecordTime.getTime();
      const hourInMs = 60 * 60 * 1000;
      
      console.log(`Last attendance record was ${Math.round(timeDiff / 60000)} minutes ago`);
      
      // If less than an hour has passed since the last recording
      if (timeDiff < hourInMs) {
        return true;
      }
    }
    
    return false;
  } catch (e) {
    console.error('Error in wasAttendanceRecentlyRecorded:', e);
    return false;
  }
}

/**
 * Save attendance records to the database with the current user's ID
 */
export async function saveAttendance(
  students: Array<{id: string; status: string; date: string}>,
  subjectName: string,
  classId: string,
  recordedBy?: string,
  forceUpdate: boolean = false
) {
  try {
    const supabase = createClient();
    
    // If not forcing update, check if there was a recent record for this subject
    if (!forceUpdate) {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('attendance')
        .select('id')
        .eq('subject_name', subjectName)
        .eq('class_id', classId)
        .gte('created_at', oneHourAgo.toISOString())
        .limit(1);
      
      if (error) {
        console.error("Error checking recent attendance:", error);
      } else if (data && data.length > 0) {
        return {
          success: false,
          message: `Attendance for ${subjectName} was already recorded within the last hour.`
        };
      }
    }
    
    // Create attendance records
    const records = students.map(student => ({
      student_id: student.id,
      status: student.status,
      date: student.date,
      subject_name: subjectName,
      class_id: classId,
      recorded_by: recordedBy
    }));
    
    // Insert attendance records
    const { error } = await supabase
      .from('attendance')
      .insert(records);
    
    if (error) {
      console.error("Error saving attendance:", error);
      return {
        success: false,
        message: `Failed to save attendance: ${error.message}`
      };
    }
    
    return {
      success: true,
      message: `Successfully recorded attendance for ${subjectName}`
    };
  } catch (error) {
    console.error("Exception saving attendance:", error);
    return {
      success: false,
      message: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Get attendance records for a class on a specific date
 */
export async function getAttendanceByDate(
  classId: string,
  date: string
) {
  const supabase = createClient();
  
  try {
    interface AttendanceWithStudent {
      id: string;
      status: 'Present' | 'Absent';
      date: string;
      student_id: string;
      students: Student;
    }
    
    // Query attendance with joined student data
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        id, 
        status, 
        date,
        student_id,
        students(id, first_name, last_name, roll_no)
      `)
      .eq('class_id', classId)
      .eq('date', date);
    
    if (error) {
      throw error;
    }
    
    return data as unknown as AttendanceWithStudent[] || [];
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return [];
  }
}

/**
 * Get attendance summary for a class (e.g., attendance percentage)
 */
export async function getAttendanceSummary(classId: string, startDate?: string, endDate?: string) {
  const supabase = createClient();
  
  try {
    // Define the correct return type for the query
    interface AttendanceWithStudent {
      student_id: string;
      status: 'Present' | 'Absent';
      date: string;
      students: Student;
    }
    
    let query = supabase
      .from('attendance')
      .select(`
        student_id,
        status,
        date,
        students!inner(id, first_name, last_name, roll_no)
      `)
      .eq('class_id', classId);
    
    if (startDate) {
      query = query.gte('date', startDate);
    }
    
    if (endDate) {
      query = query.lte('date', endDate);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      return { totalDays: 0, students: [] };
    }
    
    // Cast data to the correct type - Supabase foreign table data structure
    const typedData = data as unknown as AttendanceWithStudent[];
    
    // Calculate attendance summary
    const studentMap = new Map();
    const dates = new Set();
    
    typedData.forEach(record => {
      dates.add(record.date);
      
      const studentId = record.student_id;
      if (!studentMap.has(studentId)) {
        // Access the student data correctly - students is now properly typed
        const student = record.students;
        
        studentMap.set(studentId, {
          id: studentId,
          name: `${student.first_name} ${student.last_name}`,
          rollNo: student.roll_no,
          present: 0,
          absent: 0,
          percentage: 0
        });
      }
      
      const studentRecord = studentMap.get(studentId);
      if (record.status === 'Present') {
        studentRecord.present += 1;
      } else {
        studentRecord.absent += 1;
      }
    });
    
    // Calculate percentages
    const totalDays = dates.size;
    studentMap.forEach(student => {
      const total = student.present + student.absent;
      student.percentage = total > 0 ? Math.round((student.present / total) * 100) : 0;
    });
    
    return {
      totalDays,
      students: Array.from(studentMap.values())
    };
    
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    return { totalDays: 0, students: [] };
  }
}

/**
 * Get attendance records for a specified date range
 */
export async function getAttendanceForDateRange(
  classId: string, 
  startDate: string, 
  endDate: string,
  subjectName?: string
): Promise<StudentAttendance[]> {
  const supabase = createClient();
  
  try {
    let query = supabase
      .from('attendance')
      .select(`
        id,
        student_id,
        class_id,
        date,
        status,
        subject_name,
        created_at,
        students (
          id,
          first_name,
          last_name,
          roll_no
        )
      `)
      .eq('class_id', classId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (subjectName) {
      query = query.eq('subject_name', subjectName);
    }

    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    if (!data) return [];
    
    // Transform data for report format
    return data.map((record: any) => ({
      id: record.id,
      studentId: record.student_id,
      rollNo: record.students.roll_no,
      name: `${record.students.first_name} ${record.students.last_name}`,
      status: record.status,
      date: record.date,
      subject: record.subject_name,
      classSection: getClassNameById(record.class_id),
      createdAt: record.created_at || new Date().toISOString()
    }));
    
  } catch (error) {
    console.error('Error fetching attendance for date range:', error);
    return [];
  }
}

// Helper function to get class name from class ID
function getClassNameById(classId: string): string {
  const classNames: Record<string, string> = {
    '61d3f3cc-748e-49d2-8212-6a3fc97136c8': 'SE MME',
    '22935fbd-2565-4dd8-8a14-f766e2c42cc3': 'TE MME',
    '65a136ff-b5a9-4c01-941e-d63499c101a7': 'BE MME'
  };
  
  return classNames[classId] || 'Unknown Class';
}
import { createClient } from './supabase/client';

export type Student = {
  id: string;
  first_name: string;
  last_name: string;
  roll_no: string;
  class_id: string;
  created_at: string;
  updated_at: string;
};

export type StudentBasic = {
  id: string;
  first_name: string;
  last_name: string;
  roll_no: string;
  class_id: string;
};

export async function fetchStudentsByClass(classId: string) {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('students')
      .select('id, first_name, last_name, roll_no, class_id')
      .eq('class_id', classId)
      .order('roll_no');

    if (error) {
      throw error;
    }

    return data as StudentBasic[];
  } catch (error) {
    console.error(`Error fetching students for class ${classId}:`, error);
    return [];
  }
}

// Function to fetch all students for SE, TE, and BE MME
export async function fetchAllMMEStudents() {
  // These class IDs should match the ones in subjects.ts
  const SE_MME_CLASS_ID = '61d3f3cc-748e-49d2-8212-6a3fc97136c8'; // Update this with correct ID
  const TE_MME_CLASS_ID = '22935fbd-2565-4dd8-8a14-f766e2c42cc3'; // Update this with correct ID
  const BE_MME_CLASS_ID = '65a136ff-b5a9-4c01-941e-d63499c101a7'; 

  try {
    const [seStudents, teStudents, beStudents] = await Promise.all([
      fetchStudentsByClass(SE_MME_CLASS_ID),
      fetchStudentsByClass(TE_MME_CLASS_ID),
      fetchStudentsByClass(BE_MME_CLASS_ID),
    ]);

    return {
      SE: seStudents,
      TE: teStudents,
      BE: beStudents,
    };
  } catch (error) {
    console.error('Error fetching all MME students:', error);
    return {
      SE: [],
      TE: [],
      BE: [],
    };
  }
}

// Function to get a student's full name
export function getFullName(student: StudentBasic): string {
  return `${student.first_name} ${student.last_name}`;
}

// Function to fetch students for a specific subject
export async function fetchStudentsForSubject(subjectClassId: string) {
  try {
    const students = await fetchStudentsByClass(subjectClassId);
    return students.map(student => ({
      id: student.id,
      name: getFullName(student),
      rollNo: student.roll_no
    }));
  } catch (error) {
    console.error(`Error fetching students for subject:`, error);
    return [];
  }
} 
import { createClient } from './supabase/client';

export type Subject = {
  uuid: string;
  subject_name: string;
  class_id: string;
  created_at: string;
  updated_at: string;
};

export type SubjectBasic = {
  subject_name: string;
  class_id: string;
};

export async function fetchSubjectsByProgram(classId: string) {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('subject_name, class_id')
      .eq('class_id', classId)
      .order('subject_name');

    if (error) {
      throw error;
    }

    return data as SubjectBasic[];
  } catch (error) {
    console.error(`Error fetching subjects for class ${classId}:`, error);
    return [];
  }
}

// Function to fetch all subjects for SE, TE, and BE MME
export async function fetchAllMMESubjects() {
  // These should be your actual class_ids for SE, TE, and BE MME
  const SE_MME_CLASS_ID = '61d3f3cc-748e-49d2-8212-6a3fc97136c8'; // Update this with correct ID
  const TE_MME_CLASS_ID = '22935fbd-2565-4dd8-8a14-f766e2c42cc3'; // Update this with correct ID
  const BE_MME_CLASS_ID = '65a136ff-b5a9-4c01-941e-d63499c101a7'; // Update this with correct ID

  try {
    const [seSubjects, teSubjects, beSubjects] = await Promise.all([
      fetchSubjectsByProgram(SE_MME_CLASS_ID),
      fetchSubjectsByProgram(TE_MME_CLASS_ID),
      fetchSubjectsByProgram(BE_MME_CLASS_ID),
    ]);

    return {
      SE: seSubjects,
      TE: teSubjects,
      BE: beSubjects,
    };
  } catch (error) {
    console.error('Error fetching all MME subjects:', error);
    return {
      SE: [],
      TE: [],
      BE: [],
    };
  }
}

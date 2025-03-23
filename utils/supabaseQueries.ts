import { createClient } from '@/utils/supabase/client'; // Correct import for createClient

// Function to fetch the number of students
export async function fetchNumberOfStudents() {
    const supabase = createClient(); // Use the existing client
    const { count, error } = await supabase
        .from('students')
        .select('*', { count: 'exact' });

    if (error) {
        console.error('Error fetching number of students:', error);
        return 0; // Return 0 or handle error as needed
    }
    return count;
}

// Function to fetch the number of teachers
export async function fetchNumberOfTeachers() {
    const supabase = createClient(); // Use the existing client
    const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('role', 'teacher'); // Assuming there's a 'role' column to distinguish teachers

    if (error) {
        console.error('Error fetching number of teachers:', error);
        return 0; // Return 0 or handle error as needed
    }
    return count;
} 
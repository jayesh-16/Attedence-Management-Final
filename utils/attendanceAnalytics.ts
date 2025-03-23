import { createClient } from './supabase/client';

// Interface for the basic attendance record
interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: 'Present' | 'Absent';
  recorded_by: string;
  created_at: string;
  updated_at: string;
  subject_name: string;
  // Add time period if you have one in your table
  time_period?: 'Morning' | 'Midday' | 'Afternoon';
}

// Interface for time-based attendance summary
interface TimeBasedAttendance {
  period: 'Morning' | 'Midday' | 'Afternoon';
  present: number;
  absent: number;
  total: number;
  presentPercentage: number;
}

// Interface for daily attendance summary
interface DayAttendanceSummary {
  date: string;
  present: number;
  absent: number;
  total: number;
  presentPercentage: number;
}

// Interface for weekly attendance summary
interface WeekAttendanceSummary {
  dayOfWeek: string;
  present: number;
  absent: number;
  total: number;
  presentPercentage: number;
}

// Interface for monthly attendance summary
interface MonthAttendanceSummary {
  date: string;
  present: number;
  absent: number;
  total: number;
  presentPercentage: number;
}

// Interface for yearly attendance summary
interface YearAttendanceSummary {
  month: string;
  present: number;
  absent: number;
  total: number;
  presentPercentage: number;
}

// Interface for consecutive absences
interface ConsecutiveAbsencesSummary {
  days: '1 Day' | '2 Days' | '3 Days' | '4+ Days';
  count: number;
}

// Helper function to format date to YYYY-MM-DD
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Helper function to get start and end of week
const getWeekRange = (date: Date = new Date()): { start: string; end: string } => {
  const currentDay = date.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const diff = date.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Adjust to get Monday
  
  const startOfWeek = new Date(date);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6); // End on Sunday
  endOfWeek.setHours(23, 59, 59, 999);
  
  return {
    start: formatDate(startOfWeek),
    end: formatDate(endOfWeek)
  };
};

// Helper function to get start and end of month
const getMonthRange = (date: Date = new Date()): { start: string; end: string } => {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  return {
    start: formatDate(startOfMonth),
    end: formatDate(endOfMonth)
  };
};

// Helper function to get start and end of year
const getYearRange = (date: Date = new Date()): { start: string; end: string } => {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const endOfYear = new Date(date.getFullYear(), 11, 31);
  
  return {
    start: formatDate(startOfYear),
    end: formatDate(endOfYear)
  };
};

/**
 * Get today's attendance summary for a specific class
 */
export async function getCurrentDayAttendance(classId: string, subjectName?: string): Promise<DayAttendanceSummary> {
  try {
    const supabase = createClient();
    const today = formatDate(new Date());
    
    // Create the base query
    let query = supabase
      .from('attendance')
      .select('status')
      .eq('class_id', classId)
      .eq('date', today);
    
    // Add subject filter if provided
    if (subjectName) {
      query = query.eq('subject_name', subjectName);
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching daily attendance:', error);
      return { date: today, present: 0, absent: 0, total: 0, presentPercentage: 0 };
    }
    
    // Count present and absent students
    const present = data.filter(record => record.status === 'Present').length;
    const absent = data.filter(record => record.status === 'Absent').length;
    const total = present + absent;
    
    // Calculate present percentage
    const presentPercentage = total > 0 ? Math.round((present / total) * 100) : 0;
    
    return {
      date: today,
      present,
      absent,
      total,
      presentPercentage
    };
  } catch (error) {
    console.error('Error in getCurrentDayAttendance:', error);
    return { date: formatDate(new Date()), present: 0, absent: 0, total: 0, presentPercentage: 0 };
  }
}

/**
 * Get current week's attendance summary by day for a specific class
 */
export async function getCurrentWeekAttendance(classId: string, subjectName?: string): Promise<WeekAttendanceSummary[]> {
  try {
    const supabase = createClient();
    const { start, end } = getWeekRange();
    
    // Create the base query
    let query = supabase
      .from('attendance')
      .select('status, date')
      .eq('class_id', classId)
      .gte('date', start)
      .lte('date', end);
    
    // Add subject filter if provided
    if (subjectName) {
      query = query.eq('subject_name', subjectName);
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching weekly attendance:', error);
      return [];
    }
    
    // Group by day of week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daysOfWeek = new Map<string, { present: number; absent: number; total: number }>();
    
    // Initialize all days of the week
    dayNames.forEach(day => {
      daysOfWeek.set(day, { present: 0, absent: 0, total: 0 });
    });
    
    // Process attendance data
    data.forEach(record => {
      const date = new Date(record.date);
      const dayOfWeek = dayNames[date.getDay()];
      const dayData = daysOfWeek.get(dayOfWeek)!;
      
      if (record.status === 'Present') {
        dayData.present += 1;
      } else if (record.status === 'Absent') {
        dayData.absent += 1;
      }
      
      dayData.total = dayData.present + dayData.absent;
    });
    
    // Convert to array and calculate percentages
    const result: WeekAttendanceSummary[] = [];
    
    daysOfWeek.forEach((data, dayOfWeek) => {
      const presentPercentage = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
      
      result.push({
        dayOfWeek,
        present: data.present,
        absent: data.absent,
        total: data.total,
        presentPercentage
      });
    });
    
    return result;
  } catch (error) {
    console.error('Error in getCurrentWeekAttendance:', error);
    return [];
  }
}

/**
 * Get current month's attendance summary for a specific class
 */
export async function getCurrentMonthAttendance(classId: string, subjectName?: string): Promise<MonthAttendanceSummary[]> {
  try {
    const supabase = createClient();
    const { start, end } = getMonthRange();
    
    // Create the base query
    let query = supabase
      .from('attendance')
      .select('status, date')
      .eq('class_id', classId)
      .gte('date', start)
      .lte('date', end);
    
    // Add subject filter if provided
    if (subjectName) {
      query = query.eq('subject_name', subjectName);
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching monthly attendance:', error);
      return [];
    }
    
    // Group by date
    const dateMap = new Map<string, { present: number; absent: number; total: number }>();
    
    // Process attendance data
    data.forEach(record => {
      const date = record.date;
      
      if (!dateMap.has(date)) {
        dateMap.set(date, { present: 0, absent: 0, total: 0 });
      }
      
      const dateData = dateMap.get(date)!;
      
      if (record.status === 'Present') {
        dateData.present += 1;
      } else if (record.status === 'Absent') {
        dateData.absent += 1;
      }
      
      dateData.total = dateData.present + dateData.absent;
    });
    
    // Convert to array and calculate percentages
    const result: MonthAttendanceSummary[] = [];
    
    dateMap.forEach((data, date) => {
      const presentPercentage = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
      
      result.push({
        date,
        present: data.present,
        absent: data.absent,
        total: data.total,
        presentPercentage
      });
    });
    
    // Sort by date
    result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return result;
  } catch (error) {
    console.error('Error in getCurrentMonthAttendance:', error);
    return [];
  }
}

/**
 * Get current year's attendance summary by month for a specific class
 */
export async function getCurrentYearAttendance(classId: string, subjectName?: string): Promise<YearAttendanceSummary[]> {
  const supabase = createClient();
  const { start, end } = getYearRange();
  
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('status, date')
      .eq('class_id', classId)
      .gte('date', start)
      .lte('date', end);
    
    if (error) {
      console.error("Error fetching current year's attendance:", error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      // Return empty data for each month
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      
      return months.map(month => ({
        month,
        present: 0,
        absent: 0,
        total: 0,
        presentPercentage: 0
      }));
    }
    
    // Group by month
    const monthsMap = new Map<string, { present: number; absent: number }>();
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    // Initialize map with all months
    months.forEach(month => {
      monthsMap.set(month, { present: 0, absent: 0 });
    });
    
    // Update with actual data
    data.forEach(record => {
      const date = new Date(record.date);
      const monthIndex = date.getMonth();
      const monthName = months[monthIndex];
      
      const monthStats = monthsMap.get(monthName)!;
      if (record.status === 'Present') {
        monthStats.present += 1;
      } else {
        monthStats.absent += 1;
      }
      monthsMap.set(monthName, monthStats);
    });
    
    // Convert map to array and calculate percentages
    return months.map(month => {
      const stats = monthsMap.get(month)!;
      const total = stats.present + stats.absent;
      
      return {
        month,
        present: stats.present,
        absent: stats.absent,
        total,
        presentPercentage: total > 0 ? Math.round((stats.present / total) * 100) : 0
      };
    });
  } catch (error) {
    console.error("Exception in getCurrentYearAttendance:", error);
    return [];
  }
}

/**
 * Get attendance analysis by time of day (Morning, Midday, Afternoon)
 * Note: This assumes you have a time_period field in your attendance table.
 * If not, you'll need to add that field or determine the time period based on created_at.
 */
export async function getTimeOfDayAttendance(
  classId: string,
  subjectName?: string,
  startDate?: string,
  endDate?: string
): Promise<TimeBasedAttendance[]> {
  const supabase = createClient();
  
  try {
    // Build query
    let query = supabase
      .from('attendance')
      .select('status, created_at')
      .eq('class_id', classId);
    
    if (subjectName) {
      query = query.eq('subject_name', subjectName);
    }
    
    if (startDate) {
      query = query.gte('date', startDate);
    }
    
    if (endDate) {
      query = query.lte('date', endDate);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error fetching time of day attendance:", error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      // Return empty data for each time period
      return [
        { period: 'Morning', present: 0, absent: 0, total: 0, presentPercentage: 0 },
        { period: 'Midday', present: 0, absent: 0, total: 0, presentPercentage: 0 },
        { period: 'Afternoon', present: 0, absent: 0, total: 0, presentPercentage: 0 }
      ];
    }
    
    // Group by time period
    const timeMap = new Map<string, { present: number; absent: number }>();
    
    // Initialize map with all time periods
    timeMap.set('Morning', { present: 0, absent: 0 });
    timeMap.set('Midday', { present: 0, absent: 0 });
    timeMap.set('Afternoon', { present: 0, absent: 0 });
    
    // Update with actual data
    data.forEach(record => {
      // Determine time period based on created_at if time_period is not available
      let timePeriod: 'Morning' | 'Midday' | 'Afternoon';
      
      // If your table has a time_period field
      if ('time_period' in record && record.time_period) {
        timePeriod = record.time_period as 'Morning' | 'Midday' | 'Afternoon';
      } else {
        // Determine time period based on created_at
        const hour = new Date(record.created_at).getHours();
        
        if (hour < 12) {
          timePeriod = 'Morning';
        } else if (hour < 16) {
          timePeriod = 'Midday';
        } else {
          timePeriod = 'Afternoon';
        }
      }
      
      const timeStats = timeMap.get(timePeriod)!;
      if (record.status === 'Present') {
        timeStats.present += 1;
      } else {
        timeStats.absent += 1;
      }
      timeMap.set(timePeriod, timeStats);
    });
    
    // Convert map to array and calculate percentages
    return Array.from(timeMap.entries()).map(([period, stats]) => {
      const total = stats.present + stats.absent;
      
      return {
        period: period as 'Morning' | 'Midday' | 'Afternoon',
        present: stats.present,
        absent: stats.absent,
        total,
        presentPercentage: total > 0 ? Math.round((stats.present / total) * 100) : 0
      };
    });
  } catch (error) {
    console.error("Exception in getTimeOfDayAttendance:", error);
    return [];
  }
}

/**
 * Calculate consecutive absences for students in a specific class
 */
export async function getConsecutiveAbsences(classId: string, subjectName?: string): Promise<ConsecutiveAbsencesSummary[]> {
  const supabase = createClient();
  
  try {
    // First, get all students in the class
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name')
      .eq('class_id', classId);
    
    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return [];
    }
    
    // Initialize counters for consecutive absences
    const consecutiveAbsences = {
      '1 Day': 0,
      '2 Days': 0,
      '3 Days': 0,
      '4+ Days': 0
    };
    
    // Get attendance for each student
    for (const student of students) {
      // Get all attendance records for this student, sorted by date
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', student.id)
        .eq('class_id', classId)
        .order('date', { ascending: true });
      
      if (attendanceError) {
        console.error(`Error fetching attendance for student ${student.id}:`, attendanceError);
        continue;
      }
      
      // Skip if no attendance records
      if (!attendanceData || attendanceData.length === 0) {
        continue;
      }
      
      // Filter by subject if provided
      let filteredAttendance = attendanceData;
      if (subjectName) {
        filteredAttendance = attendanceData.filter(record => record.subject_name === subjectName);
      }
      
      // Calculate consecutive absences
      let maxConsecutive = 0;
      let currentConsecutive = 0;
      
      for (const record of filteredAttendance) {
        if (record.status === 'Absent') {
          currentConsecutive++;
          maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        } else {
          currentConsecutive = 0;
        }
      }
      
      // Update counters
      if (maxConsecutive === 1) {
        consecutiveAbsences['1 Day']++;
      } else if (maxConsecutive === 2) {
        consecutiveAbsences['2 Days']++;
      } else if (maxConsecutive === 3) {
        consecutiveAbsences['3 Days']++;
      } else if (maxConsecutive >= 4) {
        consecutiveAbsences['4+ Days']++;
      }
    }
    
    // Convert to array format
    return [
      { days: '1 Day', count: consecutiveAbsences['1 Day'] },
      { days: '2 Days', count: consecutiveAbsences['2 Days'] },
      { days: '3 Days', count: consecutiveAbsences['3 Days'] },
      { days: '4+ Days', count: consecutiveAbsences['4+ Days'] }
    ];
  } catch (error) {
    console.error('Error in getConsecutiveAbsences:', error);
    return [];
  }
}

/**
 * Get all attendance analytics for a specific class
 */
export async function getClassAttendanceAnalytics(classId: string, subjectName?: string) {
  try {
    const [
      todayData,
      weekData,
      monthData,
      yearData,
      timeOfDayData,
      consecutiveAbsencesData
    ] = await Promise.all([
      getCurrentDayAttendance(classId, subjectName),
      getCurrentWeekAttendance(classId, subjectName),
      getCurrentMonthAttendance(classId, subjectName),
      getCurrentYearAttendance(classId, subjectName),
      getTimeOfDayAttendance(classId, subjectName),
      getConsecutiveAbsences(classId, subjectName)
    ]);
    
    return {
      today: todayData,
      week: weekData,
      month: monthData,
      year: yearData,
      timeOfDay: timeOfDayData,
      consecutiveAbsences: consecutiveAbsencesData
    };
  } catch (error) {
    console.error("Error getting class analytics:", error);
    throw error;
  }
}

/**
 * Get attendance analytics for all MME classes
 */
export async function getAllMMEClassesAnalytics() {
  // These should be your actual class_ids for SE, TE, and BE MME
  const SE_MME_CLASS_ID = '61d3f3cc-748e-49d2-8212-6a3fc97136c8'; 
  const TE_MME_CLASS_ID = '22935fbd-2565-4dd8-8a14-f766e2c42cc3'; 
  const BE_MME_CLASS_ID = '65a136ff-b5a9-4c01-941e-d63499c101a7';
  
  try {
    const [seAnalytics, teAnalytics, beAnalytics] = await Promise.all([
      getClassAttendanceAnalytics(SE_MME_CLASS_ID),
      getClassAttendanceAnalytics(TE_MME_CLASS_ID),
      getClassAttendanceAnalytics(BE_MME_CLASS_ID)
    ]);
    
    return {
      'SE MME': seAnalytics,
      'TE MME': teAnalytics,
      'BE MME': beAnalytics
    };
  } catch (error) {
    console.error("Error getting all MME classes analytics:", error);
    throw error;
  }
} 
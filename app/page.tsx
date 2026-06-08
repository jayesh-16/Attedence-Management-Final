"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { GraduationCap, Users, CalendarDays, BookOpen, Loader2, UserPlus, User, Calendar, Clock, ArrowRight, Layers } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Loader from "@/components/ui/loader";
import { AdminPopup } from "@/components/ui/admin-popup";
import { fetchNumberOfStudents, fetchNumberOfTeachers } from '@/utils/supabaseQueries';
import { 
  getCurrentDayAttendance, 
  getCurrentWeekAttendance, 
  getCurrentMonthAttendance,
} from '@/utils/attendanceAnalytics';
import { Button } from "@/components/ui/button";
import { useRefresh } from "@/components/Sidebar";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "@/components/ui/chart";

// Interface for attendance data
interface AttendanceData {
  date: string;
  present: number;
  absent: number;
  total: number;
}

// Interface for weekly attendance data matching the utility function's return type
interface WeekAttendanceSummary {
  dayOfWeek: string;
  present: number;
  absent: number;
  total: number;
  presentPercentage: number;
}

// Interface for overall attendance chart data
interface OverallAttendanceData {
  name: string;
  present: number;
  absent: number;
}

const classIdMap: Record<string, string> = {
  "SE MME": "61d3f3cc-748e-49d2-8212-6a3fc97136c8",
  "TE MME": "22935fbd-2565-4dd8-8a14-f766e2c42cc3",
  "BE MME": "65a136ff-b5a9-4c01-941e-d63499c101a7"
};

// Reverse map for displaying class names
const idToClassMap: Record<string, string> = {
  "61d3f3cc-748e-49d2-8212-6a3fc97136c8": "SE MME",
  "22935fbd-2565-4dd8-8a14-f766e2c42cc3": "TE MME",
  "65a136ff-b5a9-4c01-941e-d63499c101a7": "BE MME"
};

// Available classes
const classes = ["SE MME", "TE MME", "BE MME"];

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [totalTeachers, setTotalTeachers] = useState<number>(0);
  const [totalClasses, setTotalClasses] = useState<number>(0);
  
  // State for attendance percentages
  const [todayAttendance, setTodayAttendance] = useState<number>(0);
  const [weeklyAttendance, setWeeklyAttendance] = useState<number>(0);
  const [monthlyAttendance, setMonthlyAttendance] = useState<number>(0);
  
  // State for overall attendance data for chart
  const [overallAttendanceData, setOverallAttendanceData] = useState<OverallAttendanceData[]>([]);

  // State for events
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  // State for upcoming lectures (teacher)
  const [upcomingLectures, setUpcomingLectures] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState("");
  
  // Admin popup state
  const [adminPopupOpen, setAdminPopupOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState({
    title: "Admin Access Required",
    message: "Only administrators can perform this action. Please contact an administrator for assistance."
  });
  
  // Get the refresh context
  const { realtimeStatus } = useRefresh();

  // User info state
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    // Get user info from cookies
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
      return '';
    };

    const name = getCookie('auth_name') || 'Admin';
    const role = getCookie('auth_role') || 'administrator';
    const email = getCookie('auth_email') || '';
    
    setUserName(decodeURIComponent(name).replace(/\+/g, ' '));
    setUserRole(decodeURIComponent(role).replace(/\+/g, ' '));
    setUserEmail(decodeURIComponent(email));

    // Check first time login
    const hasVisited = localStorage.getItem('hasVisitedDashboard');
    if (!hasVisited) {
      setWelcomeMessage('Welcome');
      localStorage.setItem('hasVisitedDashboard', 'true');
    } else {
      setWelcomeMessage('Welcome back');
    }
  }, []);

  useEffect(() => {
    // Auth is now handled by middleware.ts
    setIsLoading(false);
  }, []);
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch general data
        const studentsCount = await fetchNumberOfStudents();
        const teachersCount = await fetchNumberOfTeachers();
        setTotalStudents(studentsCount || 0);
        setTotalTeachers(teachersCount || 0);
        
        // Get class count
        // We have 3 predefined classes in classIdMap
        setTotalClasses(Object.keys(classIdMap).length);
        
        // Fetch attendance analytics data
        await fetchAttendanceData();
        
        // Fetch events
        await fetchEventsData();
        
        // Fetch upcoming lectures for teachers
        const emailVal = document.cookie.split('; ').find(r => r.startsWith('auth_email='))?.split('=')[1];
        const roleVal = document.cookie.split('; ').find(r => r.startsWith('auth_role='))?.split('=')[1];
        if (emailVal && roleVal !== 'admin') {
          await fetchUpcomingLectures(decodeURIComponent(emailVal));
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchData();
  }, []);
  
  const fetchUpcomingLectures = async (email: string) => {
    try {
      const supabase = createClient();
      const { data: teacherData } = await supabase.from('users').select('id').eq('email', email).single();
      if (!teacherData) return;

      const todayISO = new Date().toISOString().split('T')[0];
      const now = new Date();
      const todayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][now.getDay()];
      const todayTime = now.toTimeString().substring(0, 8);

      // Generate next 7 days as [{ date: ISO, dayName }]
      const nextDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        return {
          date: d.toISOString().split('T')[0],
          dayName: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()],
          isToday: i === 0,
        };
      });

      const [{ data: ttData }, { data: subjects }, { data: extraData }] = await Promise.all([
        supabase.from('timetable').select('*').eq('teacher_id', teacherData.id),
        supabase.from('subjects').select('id, subject_name, class_id'),
        supabase.from('extra_lectures').select('*').eq('teacher_id', teacherData.id).gte('lecture_date', todayISO).order('lecture_date', { ascending: true }).limit(5),
      ]);

      const lectures: any[] = [];

      // Regular lectures from timetable for the next 7 days
      nextDays.forEach(({ date, dayName, isToday }) => {
        (ttData || []).filter(t => {
          if (t.day_of_week !== dayName) return false;
          // For today, only show remaining (future) time slots
          if (isToday && t.start_time <= todayTime) return false;
          return true;
        }).forEach(t => {
          const subj = (subjects || []).find(s => s.id === t.subject_id);
          lectures.push({ type: 'regular', subject: subj?.subject_name || 'Unknown', class_id: t.class_id, start_time: t.start_time, end_time: t.end_time, day: dayName, date, class_type: t.class_type });
        });
      });

      // Upcoming special (extra/exchange) lectures
      (extraData || []).forEach(e => {
        const subj = (subjects || []).find(s => s.id === e.subject_id);
        lectures.push({ type: e.lecture_type, subject: subj?.subject_name || 'Unknown', class_id: e.class_id, start_time: e.start_time, end_time: e.end_time, day: new Date(e.lecture_date + 'T00:00:00').toLocaleDateString('en-US',{weekday:'short'}), date: e.lecture_date, class_type: e.class_type });
      });

      lectures.sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
      setUpcomingLectures(lectures.slice(0, 5));
    } catch (err) {
      console.error('Error fetching upcoming lectures:', err);
    }
  };

  const fetchEventsData = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase.from('calendar_events').select('*').order('start_date', { ascending: true });
      if (data) {
        const now = new Date();
        const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        const tEvents: any[] = [];
        const uEvents: any[] = [];
        
        data.forEach(e => {
          const [sy, sm, sd] = e.start_date.split('-');
          const start = new Date(parseInt(sy), parseInt(sm)-1, parseInt(sd)).getTime();
          
          const [ey, em, ed] = e.end_date.split('-');
          const end = new Date(parseInt(ey), parseInt(em)-1, parseInt(ed)).getTime();
          
          if (todayTime >= start && todayTime <= end) {
            tEvents.push(e);
          } else if (start > todayTime) {
            uEvents.push(e);
          }
        });
        
        setTodayEvents(tEvents);
        setUpcomingEvents(uEvents.slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const fetchAttendanceData = async () => {
    setDashboardLoading(true);
    try {
      // Fetch today's attendance for all classes
      let dailyData = await Promise.all(classes.map(async (cls) => {
        const classId = classIdMap[cls as keyof typeof classIdMap];
        if (!classId) {
          console.error("Invalid class selected");
          return { present: 0, absent: 0, total: 0 };
        }
        
        return await getCurrentDayAttendance(classId);
      }));
      
      // Calculate today's attendance percentage
      const dailyPresent = dailyData.reduce((acc, curr) => acc + curr.present, 0);
      const dailyTotal = dailyData.reduce((acc, curr) => acc + curr.total, 0);
      const dailyPercentage = dailyTotal > 0 ? Math.round((dailyPresent / dailyTotal) * 100) : 0;
      setTodayAttendance(dailyPercentage);
      
      // We will calculate overall data after fetching weekly data.
      
      // Fetch weekly attendance data
      let weeklyData = await Promise.all(classes.map(async (cls) => {
        const classId = classIdMap[cls as keyof typeof classIdMap];
        if (!classId) {
          console.error("Invalid class selected");
          return [];
        }
        
        try {
          return await getCurrentWeekAttendance(classId);
        } catch (error) {
          console.error("Error fetching weekly attendance:", error);
          return [];
        }
      }));
      
      // Calculate weekly attendance percentage and trend data
      let weeklyPresent = 0;
      let weeklyTotal = 0;
      
      const trendMap = new Map<string, OverallAttendanceData>();
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      dayNames.forEach(day => {
        trendMap.set(day, { name: day.substring(0, 3), present: 0, absent: 0 });
      });
      
      weeklyData.forEach(classData => {
        classData.forEach((day: WeekAttendanceSummary) => {
          weeklyPresent += day.present;
          weeklyTotal += day.total;
          
          if (trendMap.has(day.dayOfWeek)) {
            const trend = trendMap.get(day.dayOfWeek)!;
            trend.present += day.present;
            trend.absent += day.absent;
          }
        });
      });
      
      const weeklyPercentage = weeklyTotal > 0 ? Math.round((weeklyPresent / weeklyTotal) * 100) : 0;
      setWeeklyAttendance(weeklyPercentage);
      
      // Filter out days that have absolutely 0 total attendance (like future days in the week)
      const validTrendData = Array.from(trendMap.values()).filter(d => d.present > 0 || d.absent > 0);
      setOverallAttendanceData(validTrendData);
      
      // Fetch monthly attendance data
      let monthlyData = await Promise.all(classes.map(async (cls) => {
        const classId = classIdMap[cls as keyof typeof classIdMap];
        if (!classId) {
          console.error("Invalid class selected");
          return [];
        }
        
        return await getCurrentMonthAttendance(classId);
      }));
      
      // Calculate monthly attendance percentage
      let monthlyPresent = 0;
      let monthlyTotal = 0;
      
      monthlyData.forEach(classData => {
        classData.forEach((day: any) => {
          monthlyPresent += day.present;
          monthlyTotal += day.total;
        });
      });
      
      const monthlyPercentage = monthlyTotal > 0 ? Math.round((monthlyPresent / monthlyTotal) * 100) : 0;
      setMonthlyAttendance(monthlyPercentage);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    } finally {
      setDashboardLoading(false);
    }
  };

  // Show admin popup with custom message based on action
  const showAdminPopup = (action: string) => {
    let message = "";
    
    switch(action) {
      case "students":
        message = "Only administrators can add new students. This requires direct database access.";
        break;
      case "teachers":
        message = "Only administrators can add new teachers. This requires direct database access.";
        break;
      case "subjects":
        message = "Only administrators can add new subjects. This requires direct database access.";
        break;
      default:
        message = "Only administrators can perform this action. Please contact an administrator for assistance.";
    }
    
    setPopupMessage({
      title: "Admin Access Required",
      message
    });
    setAdminPopupOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 p-6 bg-gray-50">
      
      {dashboardLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Welcome Banner */}
          <div className="bg-white/70 backdrop-blur-md rounded-xl p-6 shadow-sm border border-gray-100 mb-2">
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
              {welcomeMessage}, <span className="text-blue-600">{userName}</span>
            </h1>
            <p className="text-gray-500 font-medium mt-1 flex items-center capitalize">
              <User className="h-4 w-4 mr-1.5" />
              Logged in as: {userRole}
            </p>
          </div>
          
          {/* Main Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6 shadow-md rounded-lg border-0 bg-gradient-to-r from-blue-50 to-blue-100 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-400 to-blue-600"></div>
              <div className="flex items-center justify-between">
                <div className="pl-2">
                  <p className="text-sm font-medium text-gray-500">Today's Attendance</p>
                  <h3 className="text-3xl font-bold mt-1">{todayAttendance}%</h3>
                </div>
                <div className="p-3 rounded-full bg-blue-100 border border-blue-200">
                  <CalendarDays className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>
            
            <Card className="p-6 shadow-md rounded-lg border-0 bg-gradient-to-r from-green-50 to-green-100 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-green-400 to-green-600"></div>
              <div className="flex items-center justify-between">
                <div className="pl-2">
                  <p className="text-sm font-medium text-gray-500">Weekly Attendance</p>
                  <h3 className="text-3xl font-bold mt-1">{weeklyAttendance}%</h3>
                </div>
                <div className="p-3 rounded-full bg-green-100 border border-green-200">
                  <CalendarDays className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>
            
            <Card className="p-6 shadow-md rounded-lg border-0 bg-gradient-to-r from-purple-50 to-purple-100 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-purple-400 to-purple-600"></div>
              <div className="flex items-center justify-between">
                <div className="pl-2">
                  <p className="text-sm font-medium text-gray-500">Monthly Attendance</p>
                  <h3 className="text-3xl font-bold mt-1">{monthlyAttendance}%</h3>
                </div>
                <div className="p-3 rounded-full bg-purple-100 border border-purple-200">
                  <CalendarDays className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </Card>
            
            <Card className="p-6 shadow-md rounded-lg border-0 bg-gradient-to-r from-amber-50 to-amber-100 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-400 to-amber-600"></div>
              <div className="flex items-center justify-between">
                <div className="pl-2">
                  <p className="text-sm font-medium text-gray-500">Total Classes</p>
                  <h3 className="text-3xl font-bold mt-1">{totalClasses}</h3>
                </div>
                <div className="p-3 rounded-full bg-amber-100 border border-amber-200">
                  <BookOpen className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </Card>
          </div>
          
          {/* Secondary Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6 shadow-md rounded-lg border-0 bg-gradient-to-r from-blue-50 to-indigo-50 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-400 to-indigo-600"></div>
              <div className="flex items-center space-x-4 pl-2">
                <div className="p-4 rounded-full bg-blue-100 border border-blue-200">
                  <GraduationCap className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Students</p>
                  <h3 className="text-3xl font-bold mt-1">{totalStudents}</h3>
                  <p className="text-sm text-gray-500 mt-1">Across all classes</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6 shadow-md rounded-lg border-0 bg-gradient-to-r from-purple-50 to-pink-50 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-purple-400 to-pink-600"></div>
              <div className="flex items-center space-x-4 pl-2">
                <div className="p-4 rounded-full bg-purple-100 border border-purple-200">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Teachers</p>
                  <h3 className="text-3xl font-bold mt-1">{totalTeachers}</h3>
                  <p className="text-sm text-gray-500 mt-1">Across all departments</p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Area Chart for Overall Attendance */}
          <Card className="p-6 shadow-md rounded-lg border-0 bg-white overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-400 to-indigo-600"></div>
            <div className="mb-4 pl-2">
              <h3 className="text-xl font-semibold">Weekly Attendance Trend</h3>
              <p className="text-sm text-gray-500">Present and absent students over the current week</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={overallAttendanceData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="present" 
                    stackId="1" 
                    stroke="#4ade80" 
                    fill="#86efac" 
                    name="Present Students" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="absent" 
                    stackId="1" 
                    stroke="#f87171" 
                    fill="#fca5a5" 
                    name="Absent Students" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          
          {/* Events Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Today's Events */}
            {userRole === 'admin' && (
              <Card className="p-6 shadow-md rounded-lg border-0 bg-white overflow-hidden relative min-h-[300px]">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-400 to-teal-600"></div>
              <div className="flex items-center justify-between mb-6 pl-2">
                <div>
                  <h3 className="text-xl font-semibold flex items-center text-gray-800">
                    <Clock className="w-5 h-5 mr-2 text-emerald-500" />
                    Today's Events
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">What's happening today</p>
                </div>
              </div>
              
              <div className="space-y-4 pl-2">
                {todayEvents.length > 0 ? (
                  todayEvents.map((e, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border-l-4 shadow-sm transition-all hover:-translate-y-0.5 ${
                      e.event_type === 'holiday' ? 'bg-green-50 border-green-500' :
                      e.event_type === 'exam' ? 'bg-red-50 border-red-500' :
                      'bg-blue-50 border-blue-500'
                    }`}>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          e.event_type === 'holiday' ? 'bg-green-100 text-green-700' : 
                          e.event_type === 'exam' ? 'bg-red-100 text-red-700' : 
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {e.event_type}
                        </span>
                        {e.class_id && idToClassMap[e.class_id] && (
                          <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200">
                            {idToClassMap[e.class_id]}
                          </span>
                        )}
                      </div>
                      <h4 className={`font-bold text-lg ${
                        e.event_type === 'holiday' ? 'text-green-900' :
                        e.event_type === 'exam' ? 'text-red-900' :
                        'text-blue-900'
                      }`}>
                        {e.event_name}
                      </h4>
                      <p className={`text-sm mt-1 font-medium flex items-center ${
                        e.event_type === 'holiday' ? 'text-green-700/70' :
                        e.event_type === 'exam' ? 'text-red-700/70' :
                        'text-blue-700/70'
                      }`}>
                        <Calendar className="w-3 h-3 mr-1" />
                        {e.start_date} {e.end_date !== e.start_date ? `to ${e.end_date}` : ''}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <div className="p-4 rounded-full bg-gray-50 mb-3">
                      <CalendarDays className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="font-medium text-gray-500">No events scheduled for today</p>
                  </div>
                )}
              </div>
            </Card>
            )}

            {/* Upcoming Events */}
            <Card className="p-6 shadow-md rounded-lg border-0 bg-white overflow-hidden relative min-h-[300px]">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-400 to-orange-600"></div>
              <div className="flex items-center justify-between mb-6 pl-2">
                <div>
                  <h3 className="text-xl font-semibold flex items-center text-gray-800">
                    <Calendar className="w-5 h-5 mr-2 text-amber-500" />
                    Upcoming Events
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">What's coming next</p>
                </div>
                <Button variant="ghost" className="text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => router.push('/calendar')}>
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              
              <div className="space-y-4 pl-2">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((e, idx) => (
                    <div key={idx} className="flex items-start p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                      <div className={`p-2.5 rounded-lg mr-4 flex-shrink-0 ${
                        e.event_type === 'holiday' ? 'bg-green-100 text-green-600' :
                        e.event_type === 'exam' ? 'bg-red-100 text-red-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        <CalendarDays className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-800 truncate pr-2">{e.event_name}</h4>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            {e.class_id && idToClassMap[e.class_id] && (
                              <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                {idToClassMap[e.class_id]}
                              </span>
                            )}
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              e.event_type === 'holiday' ? 'bg-green-100 text-green-700' : 
                              e.event_type === 'exam' ? 'bg-red-100 text-red-700' : 
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {e.event_type}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 font-medium mt-0.5 flex items-center">
                          {new Date(e.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <div className="p-4 rounded-full bg-gray-50 mb-3">
                      <CalendarDays className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="font-medium text-gray-500">No upcoming events found</p>
                  </div>
                )}
              </div>
            </Card>

          {/* Upcoming Lectures - for teachers/non-admin */}
          {userRole !== 'admin' && (
            <Card className="p-6 shadow-md rounded-lg border-0 bg-white overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-violet-400 to-purple-700"></div>
              <div className="flex items-center justify-between mb-5 pl-2">
                <div>
                  <h3 className="text-xl font-semibold flex items-center text-gray-800">
                    <Layers className="w-5 h-5 mr-2 text-violet-500" />
                    My Upcoming Lectures
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Today's remaining & scheduled lectures</p>
                </div>
                <Button variant="ghost" className="text-sm font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50" onClick={() => router.push('/manage-lectures')}>
                  Manage <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="space-y-3 pl-2">
                {upcomingLectures.length > 0 ? upcomingLectures.map((lec, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${lec.type === 'regular' ? 'bg-violet-500' : lec.type === 'extra' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{lec.subject}</p>
                        <p className="text-xs text-gray-500 flex items-center mt-0.5">
                          <Clock className="w-3 h-3 mr-1" />
                          {lec.day} · {lec.date === new Date().toISOString().split('T')[0] ? 'Today' : new Date(lec.date + 'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})} · {lec.start_time?.substring(0,5)} – {lec.end_time?.substring(0,5)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {lec.type !== 'regular' && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${lec.type === 'extra' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{lec.type}</span>
                      )}
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${lec.class_type === 'Theory' ? 'bg-blue-100 text-blue-700' : lec.class_type === 'Practical' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>{lec.class_type}</span>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <div className="p-4 rounded-full bg-gray-50 mb-3"><Layers className="w-7 h-7 text-gray-300" /></div>
                    <p className="font-medium text-gray-500">No upcoming lectures in the next 7 days</p>
                    <p className="text-sm text-gray-400 mt-1">Check your timetable in My Lectures</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          </div>

        </>
      )}
      
      {/* Admin Access Popup */}
      <AdminPopup 
        isOpen={adminPopupOpen}
        onClose={() => setAdminPopupOpen(false)}
        title={popupMessage.title}
        message={popupMessage.message}
      />
    </div>
  );
}

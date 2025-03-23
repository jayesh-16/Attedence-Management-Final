"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { GraduationCap, Users, CalendarDays, BookOpen, Loader2, UserPlus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Loader from "@/components/ui/loader";
import Navbar from '@/components/Navbar';
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

// Map class names to class IDs
const classIdMap: Record<string, string> = {
  "SE MME": "61d3f3cc-748e-49d2-8212-6a3fc97136c8",
  "TE MME": "22935fbd-2565-4dd8-8a14-f766e2c42cc3",
  "BE MME": "65a136ff-b5a9-4c01-941e-d63499c101a7"
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
  
  // Admin popup state
  const [adminPopupOpen, setAdminPopupOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState({
    title: "Admin Access Required",
    message: "Only administrators can perform this action. Please contact an administrator for assistance."
  });
  
  // Get the refresh context
  const { realtimeStatus } = useRefresh();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/sign-in');
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch general data
        const studentsCount = await fetchNumberOfStudents();
        const teachersCount = await fetchNumberOfTeachers();
        setTotalStudents(studentsCount || 0);
        setTotalTeachers(teachersCount || 0);
        
        // Get class count
        const supabase = createClient();
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('id');
        
        if (!classesError && classesData) {
          setTotalClasses(classesData.length);
        }
        
        // Fetch attendance analytics data
        await fetchAttendanceData();
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchData();
  }, []);
  
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
      
      // Create a single data point for overall attendance
      const overallData: OverallAttendanceData[] = [
        {
          name: "All Classes",
          present: dailyPresent,
          absent: dailyTotal - dailyPresent
        }
      ];
      
      setOverallAttendanceData(overallData);
      
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
      
      // Calculate weekly attendance percentage
      let weeklyPresent = 0;
      let weeklyTotal = 0;
      
      weeklyData.forEach(classData => {
        classData.forEach((day: WeekAttendanceSummary) => {
          weeklyPresent += day.present;
          weeklyTotal += day.total;
        });
      });
      
      const weeklyPercentage = weeklyTotal > 0 ? Math.round((weeklyPresent / weeklyTotal) * 100) : 0;
      setWeeklyAttendance(weeklyPercentage);
      
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
      <Navbar title="Mme Attendance" className="shadow-lg" />
      
      {dashboardLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
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
              <h3 className="text-xl font-semibold">Today's Overall Attendance</h3>
              <p className="text-sm text-gray-500">Present and absent students across all classes</p>
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
          
          {/* Quick Actions Section */}
          <Card className="p-6 shadow-md rounded-lg border-0 bg-white overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-gray-400 to-gray-600"></div>
            <div className="mb-4 pl-2">
              <h3 className="text-xl font-semibold">Quick Actions</h3>
              <p className="text-sm text-gray-500">Frequently used actions</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 hover:bg-gray-50 cursor-pointer transition-colors shadow-md rounded-lg border-0 bg-gradient-to-r from-blue-50 to-blue-100 overflow-hidden relative" 
                onClick={() => showAdminPopup("students")}>
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-blue-600"></div>
                <div className="flex flex-col items-center text-center pl-1">
                  <div className="p-3 rounded-full bg-blue-100 border border-blue-200 mb-3">
                    <UserPlus className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-medium">Add Students</h3>
                  <p className="text-sm text-gray-500 mt-1">Register new students</p>
                </div>
              </Card>
              
              <Card className="p-5 hover:bg-gray-50 cursor-pointer transition-colors shadow-md rounded-lg border-0 bg-gradient-to-r from-purple-50 to-purple-100 overflow-hidden relative" 
                onClick={() => showAdminPopup("teachers")}>
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-400 to-purple-600"></div>
                <div className="flex flex-col items-center text-center pl-1">
                  <div className="p-3 rounded-full bg-purple-100 border border-purple-200 mb-3">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-medium">Add Teachers</h3>
                  <p className="text-sm text-gray-500 mt-1">Register new teachers</p>
                </div>
              </Card>
              
              <Card className="p-5 hover:bg-gray-50 cursor-pointer transition-colors shadow-md rounded-lg border-0 bg-gradient-to-r from-green-50 to-green-100 overflow-hidden relative" 
                onClick={() => showAdminPopup("subjects")}>
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-400 to-green-600"></div>
                <div className="flex flex-col items-center text-center pl-1">
                  <div className="p-3 rounded-full bg-green-100 border border-green-200 mb-3">
                    <BookOpen className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-medium">Add Subjects</h3>
                  <p className="text-sm text-gray-500 mt-1">Create new subjects</p>
                </div>
              </Card>
              
              <Card className="p-5 hover:bg-gray-50 cursor-pointer transition-colors shadow-md rounded-lg border-0 bg-gradient-to-r from-amber-50 to-amber-100 overflow-hidden relative" 
                onClick={() => router.push('/addSubject')}>
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-amber-600"></div>
                <div className="flex flex-col items-center text-center pl-1">
                  <div className="p-3 rounded-full bg-amber-100 border border-amber-200 mb-3">
                    <CalendarDays className="h-6 w-6 text-amber-600" />
                  </div>
                  <h3 className="font-medium">Take Attendance</h3>
                  <p className="text-sm text-gray-500 mt-1">Record daily attendance</p>
                </div>
              </Card>
            </div>
          </Card>
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

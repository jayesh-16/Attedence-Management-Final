"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "@/components/ui/chart"
import { 
  getAllMMEClassesAnalytics, 
  getCurrentYearAttendance, 
  getCurrentDayAttendance,
  getCurrentWeekAttendance,
  getTimeOfDayAttendance,
  getConsecutiveAbsences
} from "@/utils/attendanceAnalytics"
import { createClient } from "@/utils/supabase/client"
import { RefreshCw, BarChart2, PieChart as PieChartIcon, Calendar, Clock, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRefresh } from "@/components/Sidebar"
import { fetchSubjectsByProgram } from "@/utils/subjects"
import Navbar from "@/components/Navbar"

// Map class names to class IDs - ensure these match your database IDs
const classIdMap: Record<string, string> = {
  "SE MME": "61d3f3cc-748e-49d2-8212-6a3fc97136c8",
  "TE MME": "22935fbd-2565-4dd8-8a14-f766e2c42cc3",
  "BE MME": "65a136ff-b5a9-4c01-941e-d63499c101a7"
};

// Available classes
const classes = ["SE MME", "TE MME", "BE MME"]

// Mock data for charts
const monthlyData = [
  { name: "Jan", present: 92, absent: 8 },
  { name: "Feb", present: 88, absent: 12 },
  { name: "Mar", present: 90, absent: 10 },
  { name: "Apr", present: 85, absent: 15 },
  { name: "May", present: 82, absent: 18 },
  { name: "Jun", present: 78, absent: 22 },
  { name: "Jul", present: 80, absent: 20 },
  { name: "Aug", present: 85, absent: 15 },
  { name: "Sep", present: 87, absent: 13 },
  { name: "Oct", present: 89, absent: 11 },
  { name: "Nov", present: 91, absent: 9 },
  { name: "Dec", present: 86, absent: 14 },
]

const weekdayData = [
  { name: "Monday", attendance: 92 },
  { name: "Tuesday", attendance: 88 },
  { name: "Wednesday", attendance: 90 },
  { name: "Thursday", attendance: 85 },
  { name: "Friday", attendance: 82 },
]

const studentTrendData = [
  { name: "Week 1", attendance: 100 },
  { name: "Week 2", attendance: 95 },
  { name: "Week 3", attendance: 90 },
  { name: "Week 4", attendance: 85 },
  { name: "Week 5", attendance: 80 },
  { name: "Week 6", attendance: 75 },
  { name: "Week 7", attendance: 70 },
  { name: "Week 8", attendance: 75 },
  { name: "Week 9", attendance: 80 },
  { name: "Week 10", attendance: 85 },
]

const reasonData = [
  { name: "Illness", value: 45 },
  { name: "Family", value: 20 },
  { name: "Transport", value: 15 },
  { name: "Other", value: 20 },
]

const COLORS = ["#4ade80", "#f87171", "#facc15", "#60a5fa", "#c084fc"]

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center h-60">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      <span className="ml-3 text-gray-600">Loading data...</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const [selectedClass, setSelectedClass] = useState("SE MME")
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [subjects, setSubjects] = useState<{subject_name: string; class_id: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<any>(null)
  
  // Get the refresh context but we'll only use it to receive global refresh events
  const { realtimeStatus } = useRefresh()

  // Load subjects when class changes
  useEffect(() => {
    async function loadSubjects() {
      if (!selectedClass) return;
      
      const classId = classIdMap[selectedClass as keyof typeof classIdMap];
      if (!classId) return;
      
      try {
        const subjectList = await fetchSubjectsByProgram(classId);
        setSubjects(subjectList);
      } catch (error) {
        console.error("Error loading subjects:", error);
      }
    }
    
    loadSubjects();
  }, [selectedClass]);

  // Create a function to load analytics data
  const loadAnalytics = useCallback(async (classId: string, subject?: string) => {
    try {
      setLoading(true);
      
      console.log(`Fetching analytics for class ID: ${classId}${subject && subject !== 'all' ? `, subject: ${subject}` : ''}`);
      
      // Get all analytics for the selected class and subject
      const [
        yearData,
        todayData,
        weekData,
        timeData,
        consecutiveData
      ] = await Promise.all([
        getCurrentYearAttendance(classId, subject !== 'all' ? subject : undefined),
        getCurrentDayAttendance(classId, subject !== 'all' ? subject : undefined),
        getCurrentWeekAttendance(classId, subject !== 'all' ? subject : undefined),
        getTimeOfDayAttendance(classId, subject !== 'all' ? subject : undefined),
        getConsecutiveAbsences(classId, subject !== 'all' ? subject : undefined)
      ]);
      
      console.log(`Analytics data loaded for class ID: ${classId}`);
      
      setAnalytics({
        yearData,
        todayData,
        weekData,
        timeData,
        consecutiveData
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    const classId = classIdMap[selectedClass as keyof typeof classIdMap];
    if (classId) loadAnalytics(classId, selectedSubject);
  }, [selectedClass, selectedSubject, loadAnalytics]);

  // Handle global refresh events from the Sidebar
  useEffect(() => {
    const handleGlobalRefresh = (e: Event) => {
      console.log('Analytics page received global refresh event');
      const classId = classIdMap[selectedClass as keyof typeof classIdMap];
      if (classId) loadAnalytics(classId, selectedSubject);
    };
    
    // Add event listener for global refresh
    window.addEventListener('app:refresh', handleGlobalRefresh);
    
    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('app:refresh', handleGlobalRefresh);
    };
  }, [selectedClass, selectedSubject, loadAnalytics]);

  return (
    <div className="w-full max-w-full p-4 sm:p-6">
      {/* Navbar */}
      <Navbar title="Analytics" />
      
      {/* Page Header Card */}
      <div className="grid grid-cols-1 gap-4 mt-6">
        <Card className="overflow-hidden relative border border-gray-200 shadow-md">
          {/* Gradient border on the left */}
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-blue-600 to-indigo-600"></div>
          
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center space-x-4">
                <div className="p-2 rounded-full bg-blue-100">
                  <BarChart2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Attendance Analytics</h2>
                  <p className="text-gray-600">
                    {loading ? (
                      "Loading attendance data..."
                    ) : (
                      `Viewing attendance data for ${selectedClass}${selectedSubject !== 'all' ? ` - ${selectedSubject}` : ''}`
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-[180px] bg-white border border-gray-200 shadow-sm">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {classes.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select 
                  value={selectedSubject} 
                  onValueChange={setSelectedSubject}
                  disabled={subjects.length === 0}
                >
                  <SelectTrigger className="w-[180px] bg-white border border-gray-200 shadow-sm">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.subject_name} value={subject.subject_name}>
                        {subject.subject_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs Container */}
      <div className="mt-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border border-gray-200 shadow-sm rounded-lg p-1">
            <TabsTrigger value="overview" className="rounded-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600">Overview</TabsTrigger>
            <TabsTrigger value="trends" className="rounded-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="overflow-hidden relative border border-gray-200 shadow-md">
                {/* Gradient border on the left */}
                <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-green-500 to-emerald-500"></div>
                
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-green-100">
                      <BarChart2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-800">Yearly Attendance</CardTitle>
                      <CardDescription className="text-gray-600">Monthly attendance rates for Class {selectedClass}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="h-80">
                  {loading ? (
                    <LoadingSpinner />
                  ) : analytics?.yearData?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.yearData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="presentPercentage" fill="#4ade80" name="Present %" />
                        <Bar dataKey="absent" fill="#f87171" name="Absent %" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-full">
                      <p className="text-gray-500">No attendance data available for {selectedClass}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden relative border border-gray-200 shadow-md">
                {/* Gradient border on the left */}
                <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-purple-500 to-pink-500"></div>
                
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-purple-100">
                      <PieChartIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-800">Today's Analysis</CardTitle>
                      <CardDescription className="text-gray-600">Distribution of attendance status</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="h-80">
                  {loading ? (
                    <LoadingSpinner />
                  ) : analytics?.todayData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        {(analytics.todayData.present > 0 || analytics.todayData.absent > 0) ? (
                          <Pie
                            data={[
                              { name: "Present", value: analytics.todayData.present || 0 },
                              { name: "Absent", value: analytics.todayData.absent || 0 },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            <Cell fill="#4ade80" stroke="#065f46" strokeWidth={2} />
                            <Cell fill="#f87171" stroke="#7f1d1d" strokeWidth={2} />
                          </Pie>
                        ) : (
                          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                            No attendance data for today
                          </text>
                        )}
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-full">
                      <p className="text-gray-500">No attendance data available for today</p>
                    </div>
                  )}
                  {!loading && analytics?.todayData && (
                    <div className="text-sm text-center mt-2">
                      <p>
                        <span className="font-medium">Total Students:</span> {analytics.todayData.total}
                      </p>
                      <p>
                        <span className="font-medium">Present:</span> {analytics.todayData.present} 
                        ({analytics.todayData.presentPercentage}%)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden relative border border-gray-200 shadow-md">
              {/* Gradient border on the left */}
              <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-blue-500 to-cyan-500"></div>
              
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-blue-100">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-800">Weekday Analysis</CardTitle>
                    <CardDescription className="text-gray-600">Attendance rates by day of the week</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.weekData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dayOfWeek" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="presentPercentage" 
                      fill="#60a5fa" 
                      stroke="#3b82f6" 
                      name="Attendance %" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card className="overflow-hidden relative border border-gray-200 shadow-md">
              {/* Gradient border on the left */}
              <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-amber-500 to-orange-500"></div>
              
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-amber-100">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-800">Time of Day</CardTitle>
                    <CardDescription className="text-gray-600">Attendance by time of day</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.timeData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="presentPercentage" fill="#f97316" name="Attendance %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden relative border border-gray-200 shadow-md h-full flex flex-col">
              {/* Gradient border on the left */}
              <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-red-500 to-rose-500"></div>
              
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-red-100">
                    <Users className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-800">Consecutive Absences</CardTitle>
                    <CardDescription className="text-gray-600">Students with consecutive absences</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-80 flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.consecutiveData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="days" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f87171" name="Student Count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
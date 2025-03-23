"use client";

import { useState, useRef, useEffect } from "react";
import DatePicker from "react-datepicker";
import { useReactToPrint } from "react-to-print";
import "react-datepicker/dist/react-datepicker.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReportTable from "./ReportTable";
import Loader from "./ui/loader";
import { FileText, Download, RefreshCw } from "lucide-react";
import { 
  getCurrentDayAttendance, 
  getCurrentWeekAttendance, 
  getCurrentMonthAttendance 
} from "@/utils/attendanceAnalytics";
import { getAttendanceForDateRange } from "@/utils/attendance";
import { fetchSubjectsByProgram } from "@/utils/subjects";
import { format } from "date-fns";
import { useRefresh } from "@/components/Sidebar";

// Map class names to class IDs
const classIdMap: Record<string, string> = {
  "SE MME": "61d3f3cc-748e-49d2-8212-6a3fc97136c8",
  "TE MME": "22935fbd-2565-4dd8-8a14-f766e2c42cc3",
  "BE MME": "65a136ff-b5a9-4c01-941e-d63499c101a7"
};

// Available classes
const classes = ["SE MME", "TE MME", "BE MME"];

interface ReportData {
  id: string;
  studentId: string;
  rollNo: string;
  name: string;
  date: string;
  status: string;
  subject: string;
  classSection: string;
  createdAt: string;
}

export default function ReportGenerator() {
  const [reportType, setReportType] = useState("today");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [subjects, setSubjects] = useState<{subject_name: string; class_id: string}[]>([]);
  const [reportData, setReportData] = useState<ReportData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingFullReport, setDownloadingFullReport] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Corrected useReactToPrint hook configuration
  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `${reportType}_attendance_report`,
    onPrintError: (errorLocation, error) => console.error('Print failed:', error),
    onAfterPrint: () => setDownloadingFullReport(false)
  });

  // Function to handle print button click
  const handlePrintClick = () => {
    setDownloadingFullReport(true);
    // Allow state to update before printing
    setTimeout(() => {
      handlePrint();
    }, 100);
  };
  
  // Get the refresh context for real-time updates
  const { realtimeStatus, lastUpdated, triggerRefresh } = useRefresh();

  // Helper function to filter data by subject
  function filterDataBySubject(data: any, subject: string) {
    if (!data || !data.details) return data;
    
    return {
      ...data,
      details: data.details.filter((item: any) => 
        item.subject === subject
      )
    };
  }

  // Load subjects when class changes
  useEffect(() => {
    async function loadSubjects() {
      if (!selectedClass) return;
      
      const classId = classIdMap[selectedClass];
      if (!classId) return;
      
      try {
        const subjectList = await fetchSubjectsByProgram(classId);
        setSubjects(subjectList);
        setSelectedSubject("all"); // Reset subject selection when class changes to "all" instead of empty string
      } catch (error) {
        console.error("Error loading subjects:", error);
        setSubjects([]);
      }
    }
    
    loadSubjects();
  }, [selectedClass]);
  
  // Listen for real-time updates
  useEffect(() => {
    const handleRefresh = (e: Event) => {
      if (reportData && reportData.length > 0) {
        // Regenerate the current report when data updates
        generateReport();
      }
    };
    
    window.addEventListener('app:refresh', handleRefresh);
    return () => {
      window.removeEventListener('app:refresh', handleRefresh);
    };
  }, [reportData, reportType, selectedClass, selectedSubject, startDate, endDate]);

  const generateReport = async () => {
    if (!selectedClass) {
      alert("Please select a class");
      return;
    }
    
    const classId = classIdMap[selectedClass];
    if (!classId) {
      alert("Invalid class selected");
      return;
    }
    
    setIsLoading(true);
    try {
      let data: ReportData[] = [];
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Generate report based on selected type
      switch (reportType) {
        case "today":
          // Directly fetch today's detailed attendance records instead of summary
          data = await getAttendanceForDateRange(
            classId,
            today,
            today,
            selectedSubject !== "all" ? selectedSubject : undefined
          );
          
          // For today's report, if no data is found, show empty data instead of mock data
          if (!data || !Array.isArray(data) || data.length === 0) {
            console.log("No attendance records found for today");
            data = []; // Empty array instead of mock data
          }
          break;
          
        case "weekly":
          // Get the current week's date range
          const weekRange = getWeekDateRange();
          data = await getAttendanceForDateRange(
            classId,
            weekRange.start,
            weekRange.end,
            selectedSubject !== "all" ? selectedSubject : undefined
          );
          
          // For weekly report, if no data is found, show empty data instead of mock data
          if (!data || !Array.isArray(data) || data.length === 0) {
            console.log("No attendance records found for this week");
            data = []; // Empty array instead of mock data
          }
          break;
          
        case "monthly":
          // Get the current month's date range
          const monthRange = getMonthDateRange();
          data = await getAttendanceForDateRange(
            classId,
            monthRange.start,
            monthRange.end,
            selectedSubject !== "all" ? selectedSubject : undefined
          );
          
          // For monthly report, if no data is found, show empty data instead of mock data
          if (!data || !Array.isArray(data) || data.length === 0) {
            console.log("No attendance records found for this month");
            data = []; // Empty array instead of mock data
          }
          break;
          
        case "custom":
          const customStartDate = format(startDate, 'yyyy-MM-dd');
          const customEndDate = format(endDate, 'yyyy-MM-dd');
          try {
            data = await getAttendanceForDateRange(
              classId, 
              customStartDate, 
              customEndDate,
              selectedSubject !== "all" ? selectedSubject : undefined
            );
            
            console.log("Custom date range data:", data); // Debugging
            
            // For custom date range, if no data is found, show empty data
            if (!data || !Array.isArray(data) || data.length === 0) {
              console.log("No attendance records found for custom date range");
              data = []; // Empty array instead of mock data
            }
          } catch (error) {
            console.error("Error fetching custom date range:", error);
            data = []; // Empty array instead of mock data
          }
          break;
      }
      
      setReportData(data);
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report. Please try again.");
      setReportData([]); // Set empty data on error
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to get the date range for the current week
  function getWeekDateRange() {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    
    // Calculate the date of Monday (start of week)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - day + (day === 0 ? -6 : 1)); // If today is Sunday, go back to previous Monday
    startDate.setHours(0, 0, 0, 0);
    
    // Calculate the date of Sunday (end of week)
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    
    return {
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd')
    };
  }
  
  // Helper function to get the date range for the current month
  function getMonthDateRange() {
    const today = new Date();
    
    // Calculate the first day of the month
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Calculate the last day of the month
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    return {
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd')
    };
  }

  // Helper function to group data by subject
  const groupDataBySubject = (data: ReportData[]): { [subject: string]: ReportData[] } => {
    const grouped: { [subject: string]: ReportData[] } = {};
    
    data.forEach(record => {
      const subject = record.subject || 'Unknown Subject';
      
      if (!grouped[subject]) {
        grouped[subject] = [];
      }
      
      grouped[subject].push(record);
    });
    
    return grouped;
  };

  // Helper function to group data by date and subject
  const groupDataByDateAndSubject = (data: ReportData[]): { [dateSubject: string]: ReportData[] } => {
    const grouped: { [dateSubject: string]: ReportData[] } = {};
    
    data.forEach(record => {
      const date = record.date || 'Unknown Date';
      const subject = record.subject || 'Unknown Subject';
      const key = `${date}-${subject}`;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      
      grouped[key].push(record);
    });
    
    return grouped;
  };

  // Helper function to calculate attendance percentages for a group of records
  const calculateAttendancePercentage = (records: ReportData[]) => {
    if (!records || records.length === 0) return 0;
    
    const presentCount = records.filter(record => record.status === 'Present').length;
    return Math.round((presentCount / records.length) * 100);
  };

  // Helper function to group data by date for weekly/monthly reports
  const groupDataByDate = (data: ReportData[]): { [date: string]: ReportData[] } => {
    const grouped: { [date: string]: ReportData[] } = {};
    
    data.forEach(record => {
      const date = record.date || 'Unknown Date';
      
      if (!grouped[date]) {
        grouped[date] = [];
      }
      
      grouped[date].push(record);
    });
    
    return grouped;
  };

  // Helper function to group data by weekday for weekly reports
  const groupDataByWeekday = (data: ReportData[]): { [weekday: string]: ReportData[] } => {
    const grouped: { [weekday: string]: ReportData[] } = {};
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Initialize all weekdays
    weekdays.forEach(day => {
      grouped[day] = [];
    });
    
    data.forEach(record => {
      try {
        const date = new Date(record.date);
        const weekday = weekdays[date.getDay()];
        grouped[weekday].push(record);
      } catch (error) {
        // If date parsing fails, add to Unknown
        if (!grouped['Unknown']) {
          grouped['Unknown'] = [];
        }
        grouped['Unknown'].push(record);
      }
    });
    
    // Remove empty weekdays
    Object.keys(grouped).forEach(key => {
      if (grouped[key].length === 0 && key !== 'Unknown') {
        delete grouped[key];
      }
    });
    
    return grouped;
  };

  // Helper function to generate mock data when real data isn't available
  function generateMockData(count: number, className: string): ReportData[] {
    const mockData: ReportData[] = [];
    const subjects = ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science"];
    const statuses = ["Present", "Absent"];
    
    for (let i = 0; i < count; i++) {
      mockData.push({
        id: `mock-${i}`,
        studentId: `student-${i}`,
        rollNo: `${100 + i}`,
        name: `Student ${i + 1}`,
        date: format(new Date(), 'yyyy-MM-dd'),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        subject: selectedSubject !== "all" ? selectedSubject : subjects[Math.floor(Math.random() * subjects.length)],
        classSection: className,
        createdAt: new Date().toISOString()
      });
    }
    
    return mockData;
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-3 sm:p-4">
        <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Generate Report</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedClass || subjects.length === 0}
            >
              <option value="all">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.subject_name} value={subject.subject_name}>
                  {subject.subject_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mb-3 sm:mb-4 border border-gray-200 rounded-lg p-3 sm:p-4">
          <div className="flex flex-wrap justify-center gap-2 mb-2">
            <button
              onClick={() => setReportType('today')}
              className={`px-3 py-1 sm:px-4 sm:py-2 text-sm sm:text-base rounded-md ${reportType === 'today' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
            >
              Today
            </button>
            <button
              onClick={() => setReportType('weekly')}
              className={`px-3 py-1 sm:px-4 sm:py-2 text-sm sm:text-base rounded-md ${reportType === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setReportType('monthly')}
              className={`px-3 py-1 sm:px-4 sm:py-2 text-sm sm:text-base rounded-md ${reportType === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setReportType('custom')}
              className={`px-3 py-1 sm:px-4 sm:py-2 text-sm sm:text-base rounded-md ${reportType === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
            >
              Custom
            </button>
          </div>
        </div>
        
        {/* Separate Date Selection Section */}
        {reportType === 'custom' && (
          <div className="mb-4 sm:mb-6 border border-gray-200 rounded-lg p-4 max-w-md mx-auto">
            <h3 className="text-center font-medium text-gray-800 mb-3">Select Date Range</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="text-center">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <DatePicker
                  selected={startDate}
                  onChange={(date: Date | null) => date && setStartDate(date)}
                  className="w-full p-2 border border-gray-300 rounded-md text-center"
                  dateFormat="yyyy-MM-dd"
                />
              </div>
              <div className="text-center">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <DatePicker
                  selected={endDate}
                  onChange={(date: Date | null) => date && setEndDate(date)}
                  className="w-full p-2 border border-gray-300 rounded-md text-center"
                  dateFormat="yyyy-MM-dd"
                  minDate={startDate}
                />
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-center mb-4 sm:mb-6">
          <button
            onClick={generateReport}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center text-sm sm:text-base"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              'Generate Report'
            )}
          </button>
        </div>
      </div>
      
      {reportData && reportData.length > 0 && (
        <div className="mt-4 sm:mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 px-3 sm:px-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2 sm:mb-0">
              {reportType === 'today' && 'Today\'s Attendance Report'}
              {reportType === 'weekly' && 'Weekly Attendance Report'}
              {reportType === 'monthly' && 'Monthly Attendance Report'}
              {reportType === 'custom' && 'Custom Date Range Attendance Report'}
              {selectedSubject !== 'all' ? ` - ${selectedSubject}` : ''}
              {selectedClass ? ` (${selectedClass})` : ''}
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setReportData([])}
                className="text-gray-600 hover:text-gray-800 focus:outline-none h-8 w-8 sm:h-auto sm:w-auto p-1 sm:p-2 bg-white border border-gray-200 rounded-md"
              >
                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline ml-1">Refresh</span>
              </button>
              
              <button
                onClick={handlePrintClick}
                className="bg-purple-600 text-white px-2 sm:px-4 py-1 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center text-xs sm:text-sm h-8 sm:h-auto"
              >
                <Download size={16} className="mr-1" />
                <span className="hidden sm:inline">Download PDF</span>
              </button>
            </div>
          </div>
          
          <div ref={reportRef} className="bg-white p-3 sm:p-4 rounded-lg shadow overflow-x-auto print:shadow-none print:p-0">
            {/* Report Header */}
            <div className="text-center mb-2 sm:mb-3 print:mb-2">
              <h2 className="text-xl sm:text-2xl font-bold print:text-lg">
                {reportType === 'today' && 'Today\'s Attendance Report'}
                {reportType === 'weekly' && 'Weekly Attendance Report'}
                {reportType === 'monthly' && 'Monthly Attendance Report'}
                {reportType === 'custom' && 'Custom Date Range Attendance Report'}
              </h2>
              <p className="text-gray-600 text-sm sm:text-base print:text-sm">
                {selectedClass} {selectedSubject !== 'all' ? `- ${selectedSubject}` : ''}
              </p>
              <p className="text-gray-500 text-xs sm:text-sm print:text-xs">
                {reportType === 'custom' 
                  ? `${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`
                  : reportType === 'today'
                    ? format(new Date(), 'yyyy-MM-dd')
                    : ''}
              </p>
            </div>
            
            {/* Weekly Report with Percentage */}
            {reportType === 'weekly' && (
              <div className="mb-2 sm:mb-3 print:mb-2">
                <h3 className="text-md sm:text-lg font-semibold mb-1 print:text-sm print:mb-1">Weekly Attendance Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 print:grid-cols-3 print:gap-1 mb-2 print:mb-1">
                  {Object.entries(groupDataByWeekday(reportData)).map(([weekday, records]) => (
                    <div key={weekday} className="bg-gray-50 p-2 rounded-lg border border-gray-200 print:p-1 print:text-xs">
                      <h4 className="font-medium text-gray-800 text-sm print:text-xs">{weekday}</h4>
                      <div className="flex justify-between items-center mt-1">
                        <div>
                          <p className="text-xs text-gray-600 print:text-xs">Present: {records.filter(r => r.status === 'Present').length}</p>
                          <p className="text-xs text-gray-600 print:text-xs">Absent: {records.filter(r => r.status === 'Absent').length}</p>
                          <p className="text-xs text-gray-600 print:text-xs">Total: {records.length}</p>
                        </div>
                        <div className="text-xl font-bold text-blue-600 print:text-lg">
                          {calculateAttendancePercentage(records)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Monthly Report with Percentage */}
            {reportType === 'monthly' && (
              <div className="mb-2 sm:mb-3 print:mb-2">
                <h3 className="text-md sm:text-lg font-semibold mb-1 print:text-sm print:mb-1">Monthly Attendance Summary</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 text-sm print:text-xs">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="py-1 px-2 border-b text-left print:py-0.5 print:px-1">Date</th>
                        <th className="py-1 px-2 border-b text-center print:py-0.5 print:px-1">Present</th>
                        <th className="py-1 px-2 border-b text-center print:py-0.5 print:px-1">Absent</th>
                        <th className="py-1 px-2 border-b text-center print:py-0.5 print:px-1">Total</th>
                        <th className="py-1 px-2 border-b font-medium text-blue-600 text-center print:py-0.5 print:px-1">
                          Attendance
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(groupDataByDate(reportData)).map(([date, records]) => (
                        <tr key={date} className="hover:bg-gray-50">
                          <td className="py-1 px-2 border-b print:py-0.5 print:px-1">{date}</td>
                          <td className="py-1 px-2 border-b text-center print:py-0.5 print:px-1">{records.filter(r => r.status === 'Present').length}</td>
                          <td className="py-1 px-2 border-b text-center print:py-0.5 print:px-1">{records.filter(r => r.status === 'Absent').length}</td>
                          <td className="py-1 px-2 border-b text-center print:py-0.5 print:px-1">{records.length}</td>
                          <td className="py-1 px-2 border-b font-medium text-blue-600 text-center print:py-0.5 print:px-1">
                            {calculateAttendancePercentage(records)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* If all subjects are selected, group by subject and date */}
            {selectedSubject === 'all' ? (
              <>
                <h3 className="text-md sm:text-lg font-semibold mb-2 print:text-sm print:mb-1">Attendance by Subject</h3>
                {Object.entries(groupDataBySubject(reportData)).map(([subject, subjectData]) => (
                  <div key={subject} className="mb-3 print:mb-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-1">
                      <h4 className="text-sm font-medium mb-1 sm:mb-0 print:text-xs">{subject}</h4>
                      <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded self-start sm:self-auto print:text-xs print:py-0.5">
                        Attendance: {calculateAttendancePercentage(subjectData)}%
                      </div>
                    </div>
                    
                    {/* Group by date within each subject */}
                    {Object.entries(groupDataByDateAndSubject(subjectData)).map(([dateSubjectKey, groupData]) => {
                      const [date, subj] = dateSubjectKey.split('-');
                      return (
                        <div key={dateSubjectKey} className="mb-2 print:mb-1">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-1 print:mb-0.5">
                            <h5 className="text-xs font-medium text-gray-700 mb-1 sm:mb-0 print:text-xs">{date}</h5>
                            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded self-start sm:self-auto print:text-xs print:py-0.5">
                              Attendance: {calculateAttendancePercentage(groupData)}%
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <ReportTable 
                              data={groupData} 
                              showAllPages={downloadingFullReport} 
                              compactPrint={true}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </>
            ) : (
              // For a single subject, show detailed report with percentage
              <>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 print:mb-1">
                  <h3 className="text-md sm:text-lg font-semibold mb-1 sm:mb-0 print:text-sm">{selectedSubject} Attendance</h3>
                  <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full self-start sm:self-auto print:text-xs print:py-0.5">
                    Overall: {calculateAttendancePercentage(reportData)}%
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <ReportTable 
                    data={reportData} 
                    showAllPages={downloadingFullReport} 
                    compactPrint={true}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

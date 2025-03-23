import { useState, useEffect } from "react";
import { Save, ChevronLeft, ChevronRight, Calendar, User, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { saveAttendance } from "@/utils/attendance";

// Define student type
interface Student {
  id: string;
  name: string;
  rollNo: string;
  status: "Present" | "Absent";
  date: string;
}

// Define DB student type for safer type checking
interface DbStudent {
  id: string;
  first_name: string;
  last_name: string;
  roll_no: string;
}

// Get current date in YYYY-MM-DD format
const getCurrentDate = () => new Date().toISOString().split("T")[0];

// Items per page (different for mobile and desktop)
const STUDENTS_PER_PAGE = {
  MOBILE: 10,
  DESKTOP: 35
};

// Props interface
interface AttendanceTableProps {
  selectedSubject: { name: string; class: string } | null;
}

// Add this function to check if attendance was recently recorded for a specific subject
const wasAttendanceRecentlyRecorded = async (
  subjectName: string,
  classId: string
): Promise<boolean> => {
  try {
    const supabase = createClient();
    
    // Get current time and time 1 hour ago
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Query attendance records for this subject in the last hour
    const { data, error } = await supabase
      .from('attendance')
      .select('id, created_at')
      .eq('subject_name', subjectName)
      .eq('class_id', classId)
      .gte('created_at', oneHourAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error("Error checking recent attendance:", error);
      return false; // If there's an error, we'll let the save continue
    }
    
    // If we found a record, attendance was recently recorded
    return data.length > 0;
  } catch (error) {
    console.error("Exception checking recent attendance:", error);
    return false; // If there's an error, we'll let the save continue
  }
};

export default function AttendanceTable({ selectedSubject }: AttendanceTableProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{type: 'success' | 'error'; message: string} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  
  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check initially
    checkMobile();
    
    // Set up listener for window resize
    window.addEventListener('resize', checkMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Map class names to class IDs - ensure these are correct
  const classIdMap: Record<string, string> = {
    "SE MME": "61d3f3cc-748e-49d2-8212-6a3fc97136c8",
    "TE MME": "22935fbd-2565-4dd8-8a14-f766e2c42cc3",
    "BE MME": "65a136ff-b5a9-4c01-941e-d63499c101a7"
  };

  // Calculate pagination values with responsive items per page
  const itemsPerPage = isMobile ? STUDENTS_PER_PAGE.MOBILE : STUDENTS_PER_PAGE.DESKTOP;
  const totalPages = Math.ceil(students.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStudents = students.slice(startIndex, endIndex);

  // Fetch students directly from Supabase with improved error handling
  useEffect(() => {
    async function fetchStudents() {
      // Reset states when selection changes
      setStudents([]);
      setError(null);
      setCurrentPage(1);
      
      if (!selectedSubject) return;
      
      try {
        setLoading(true);
        
        // Get class ID from map
        const classId = classIdMap[selectedSubject.class];
        if (!classId) {
          throw new Error(`Invalid class selected: ${selectedSubject.class}`);
        }
        
        const supabase = createClient();
        const { data, error } = await supabase
          .from('students')
          .select('id, first_name, last_name, roll_no')
          .eq('class_id', classId);
        
        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }
        
        if (!data) {
          throw new Error('No data returned from database');
        }
        
        // Safely map with type checking
        const formattedStudents = data.map((student) => ({
          id: student.id || '',
          name: `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown',
          rollNo: student.roll_no || '',
          status: "Absent" as const,
          date: getCurrentDate()
        }));
        
        setStudents(formattedStudents);
        
        if (formattedStudents.length === 0) {
          setError(`No students found for ${selectedSubject.name} (${selectedSubject.class})`);
        }
      } catch (err) {
        // Handle all possible error types
        const errorMessage = err instanceof Error 
          ? err.message 
          : 'An unknown error occurred';
        
        console.error("Error loading students:", errorMessage);
        setError(errorMessage);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStudents();
  }, [selectedSubject]);

  const updateStatus = (id: string, newStatus: "Present" | "Absent") => {
    setStudents((prev) => 
      prev.map((student) =>
        student.id === id ? { ...student, status: newStatus, date: getCurrentDate() } : student
      )
    );
  };

  const handleForceUpdate = async () => {
    if (window.confirm(
      "Are you sure you want to override the 1-hour cooldown and record attendance again? " +
      "This should only be done if there was an error in the previous recording."
    )) {
      setForceUpdate(true);
      handleSaveAttendance(true);
    }
  };

  const handleSaveAttendance = async (force: boolean = false) => {
    try {
      // Validate students data before attempting to save
      if (students.length === 0) {
        throw new Error('No attendance data to save');
      }
      
      if (!selectedSubject) {
        throw new Error('No subject selected');
      }
      
      setLoading(true);
      
      // Get the class ID for the selected class
      const classId = classIdMap[selectedSubject.class];
      if (!classId) {
        throw new Error(`Invalid class selected: ${selectedSubject.class}`);
      }
      
      // Get current user ID
      let recordedBy;
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        recordedBy = data?.user?.id;
        
        console.log("Current user ID:", recordedBy);
      } catch (e) {
        console.warn("Error getting current user:", e);
      }
      
      // Check if we need to verify the time restriction
      if (!force) {
        try {
          const wasRecent = await wasAttendanceRecentlyRecorded(
            selectedSubject.name, 
            classId
          );
          
          if (wasRecent) {
            // Show a special error with an option to override
            setAlert({
              type: 'error',
              message: `Attendance for ${selectedSubject.name} was already recorded within the last hour. Use Force Update if you need to record again.`
            });
            // Show the Force Update button by setting the state
            setForceUpdate(true);
            setTimeout(() => setAlert(null), 15000); // Longer timeout for this message
            return;
          }
        } catch (err) {
          console.warn("Error checking recent attendance:", err);
          // Continue with save even if check fails
        }
      }
      
      // Save attendance to Supabase
      const result = await saveAttendance(
        students,
        selectedSubject.name,
        classId,
        recordedBy,
        force
      );
      
      if (!result.success) {
        // Check if the error is about the cooldown period despite our check
        if (result.message.includes('already recorded within the last hour')) {
          // Show a special error with an option to override
          setAlert({
            type: 'error',
            message: result.message + "\n\nClick 'Force Update' if you need to record again."
          });
          // Show the Force Update button by setting the state
          setForceUpdate(true);
          setTimeout(() => setAlert(null), 15000); // Longer timeout for this message
          return;
        }
        
        throw new Error(result.message);
      }
      
      // Show success alert
      setAlert({
        type: 'success',
        message: result.message || 'Attendance saved successfully!'
      });
      setTimeout(() => setAlert(null), 5000);
      
      // Reset force update state after successful submission
      if (forceUpdate) {
        setForceUpdate(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save attendance';
      console.error(errorMessage);
      
      // Show error alert
      setAlert({
        type: 'error',
        message: errorMessage
      });
      setTimeout(() => setAlert(null), 8000);
    } finally {
      setLoading(false);
    }
  };

  const markAllAs = (status: "Present" | "Absent") => {
    setStudents(prev => 
      prev.map(student => ({
        ...student,
        status,
        date: getCurrentDate()
      }))
    );
  };

  // Pagination handlers
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      // Scroll to top of table on mobile when changing pages
      if (isMobile) {
        const tableElement = document.getElementById('attendance-table');
        tableElement?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      // Scroll to top of table on mobile when changing pages
      if (isMobile) {
        const tableElement = document.getElementById('attendance-table');
        tableElement?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-md relative">
      {/* Enhanced Alert System */}
      {alert && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg flex items-center gap-2 shadow-lg
          ${alert.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {alert.type === 'success' ? 
            <CheckCircle2 className="h-5 w-5" /> : 
            <AlertCircle className="h-5 w-5" />}
          <span>{alert.message}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3 mb-4">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-800">
            {selectedSubject ? selectedSubject.name : "Select a subject"}
          </h2>
          {selectedSubject && (
            <span className={`inline-block mt-1 px-3 py-1 text-xs md:text-sm font-medium rounded-full ${
              selectedSubject.class === "SE MME" ? "bg-blue-100 text-blue-800" :
              selectedSubject.class === "TE MME" ? "bg-green-100 text-green-800" :
              "bg-violet-100 text-violet-800"
            }`}>
              {selectedSubject.class}
            </span>
          )}
          <p className="text-xs md:text-sm text-gray-600 mt-1">Mark students as present or absent.</p>
        </div>

        {/* Pagination UI - Top */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToPrevPage} 
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 font-medium">
              {currentPage} / {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToNextPage} 
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div id="attendance-table" className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
        {/* Desktop Table View with enhanced styling */}
        <div className="hidden md:block">
          <div className="border border-gray-200 rounded-lg shadow-md overflow-hidden">
            <Table className="w-full border-collapse">
              <TableHeader>
                <TableRow className="bg-gray-50 border-b">
                  <TableHead>Student</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                      <div className="mt-2 text-gray-500">Loading students...</div>
                    </TableCell>
                  </TableRow>
                ) : currentStudents.length > 0 ? (
                  currentStudents.map((student) => (
                    <TableRow key={student.id} className="border-b">
                      <TableCell className="text-gray-900 font-medium">{student.name}</TableCell>
                      <TableCell>{student.rollNo}</TableCell>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          student.status === "Present" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {student.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600">{student.date}</TableCell>
                      <TableCell className="flex gap-2">
                        <button
                          onClick={() => updateStatus(student.id, "Present")}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                            student.status === "Present" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-green-500 hover:text-white"
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => updateStatus(student.id, "Absent")}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                            student.status === "Absent" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-red-500 hover:text-white"
                          }`}
                        >
                          Absent
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      {error ? 'Unable to load students.' : 'No students found in this class.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Mobile Card View with enhanced styling */}
        <div className="md:hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 border border-gray-200 rounded-lg shadow-md">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <div className="mt-2 text-gray-500">Loading students...</div>
            </div>
          ) : currentStudents.length > 0 ? (
            <div className="space-y-4 border border-gray-100 rounded-lg p-4 shadow-md">
              {currentStudents.map((student) => (
                <div 
                  key={student.id} 
                  className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{student.name}</h3>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <User size={14} /> Roll No: {student.rollNo}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      student.status === "Present" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {student.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-xs text-gray-500 mb-3">
                    <Calendar size={14} className="mr-1" /> {student.date}
                  </div>
                  
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => updateStatus(student.id, "Present")}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition ${
                        student.status === "Present" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      Present
                    </button>
                    <button
                      onClick={() => updateStatus(student.id, "Absent")}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition ${
                        student.status === "Absent" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      Absent
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8 border border-gray-200 rounded-lg shadow-md">
              {error ? 'Unable to load students.' : 'No students found in this class.'}
            </div>
          )}
        </div>
      </div>

      {/* Pagination UI - Bottom (for mobile convenience) */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToPrevPage} 
            disabled={currentPage === 1}
            className="flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> 
            <span className="md:inline">Previous</span>
          </Button>
          <span className="text-sm text-gray-600 font-medium mx-2">
            {currentPage} / {totalPages}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToNextPage} 
            disabled={currentPage === totalPages}
            className="flex items-center"
          >
            <span className="md:inline">Next</span> 
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      <div className="mt-6">
        {/* Normal Save Button - only shown when Force Update is not needed */}
        {!forceUpdate && (
          <Button 
            onClick={() => handleSaveAttendance(false)} 
            disabled={students.length === 0 || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 md:py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm hover:shadow-md transition-shadow"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={18} /> Save Attendance
              </>
            )}
          </Button>
        )}
        
        {/* Force Update Button - only shown when needed */}
        {forceUpdate && (
          <Button 
            onClick={() => handleSaveAttendance(true)}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 md:py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm hover:shadow-md transition-shadow"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <AlertCircle size={18} className="mr-1" /> Force Update (Override Time Restriction)
              </>
            )}
          </Button>
        )}
      </div>
      
      {students.length > itemsPerPage && (
        <div className="mt-3 text-xs md:text-sm text-center text-gray-500">
          Showing {startIndex + 1}-{Math.min(endIndex, students.length)} of {students.length} students
        </div>
      )}

      <div className="flex gap-2 mt-4 border-t border-gray-100 pt-4">
        <Button 
          onClick={() => markAllAs("Present")}
          size="sm"
          variant="outline"
          className="flex-1 text-green-600 border-green-200 hover:bg-green-50 shadow-sm"
        >
          Mark All Present
        </Button>
        <Button 
          onClick={() => markAllAs("Absent")}
          size="sm"
          variant="outline"
          className="flex-1 text-red-600 border-red-200 hover:bg-red-50 shadow-sm"
        >
          Mark All Absent
        </Button>
      </div>
    </div>
  );
}

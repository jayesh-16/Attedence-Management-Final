"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { GraduationCap, Search, Filter, Trash2, Plus, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { deleteUserAction } from "@/app/actions";

// Define the shape of our student data
interface Student {
  id: string;
  first_name: string;
  last_name: string;
  roll_no: string;
  class_id: string;
  attendance_percentage?: number;
  attendance_present?: number;
  attendance_total?: number;
}

// Map internal class UUIDs to human-readable names
const classIdMap: Record<string, string> = {
  "61d3f3cc-748e-49d2-8212-6a3fc97136c8": "SE MME",
  "22935fbd-2565-4dd8-8a14-f766e2c42cc3": "TE MME",
  "65a136ff-b5a9-4c01-941e-d63499c101a7": "BE MME"
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("All");

  useEffect(() => {
    const fetchStudents = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("roll_no", { ascending: true });

      let allAttendanceData: any[] = [];
      let hasMore = true;
      let rangeStart = 0;
      let rangeEnd = 999;
      
      while (hasMore) {
        const { data: pageData, error: attError } = await supabase
          .from("attendance")
          .select("student_id, status")
          .range(rangeStart, rangeEnd);
          
        if (attError || !pageData || pageData.length === 0) {
          hasMore = false;
        } else {
          allAttendanceData = [...allAttendanceData, ...pageData];
          if (pageData.length < 1000) hasMore = false;
          else {
            rangeStart += 1000;
            rangeEnd += 1000;
          }
        }
      }

      if (error) {
        console.error("Error fetching students:", error);
      } else {
        const attendanceMap = new Map<string, { present: number, total: number }>();
        if (allAttendanceData.length > 0) {
          allAttendanceData.forEach(record => {
            if (!attendanceMap.has(record.student_id)) {
              attendanceMap.set(record.student_id, { present: 0, total: 0 });
            }
            const stats = attendanceMap.get(record.student_id)!;
            stats.total += 1;
            if (record.status === 'Present') stats.present += 1;
          });
        }

        const studentsWithAttendance = (data || []).map(student => {
          const stats = attendanceMap.get(student.id) || { present: 0, total: 0 };
          const percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
          return {
            ...student,
            attendance_percentage: percentage,
            attendance_present: stats.present,
            attendance_total: stats.total
          };
        });

        setStudents(studentsWithAttendance);
      }
      setLoading(false);
    };

    fetchStudents();
  }, []);

  const requestDelete = (id: string) => {
    setStudentToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    
    setDeletingId(studentToDelete);

    try {
      // 1. Biometric Verification
      const apiUrl = process.env.NEXT_PUBLIC_HARDWARE_API_URL || "http://127.0.0.1:5000";
      const res = await fetch(`${apiUrl}/api/identify`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Hardware-API-Key": "tcet_erp_hardware_secure_key_2026"
        }
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        alert("Biometric verification failed: " + (data.error || "Finger not recognized."));
        setDeletingId(null);
        return;
      }

      if (data.role !== 'admin') {
        alert("Unauthorized: Only admin fingerprints can delete records.");
        setDeletingId(null);
        return;
      }

      // 2. Perform Deletion
      const result = await deleteUserAction(studentToDelete, "student");
      
      if (result.success) {
        setStudents(students.filter(s => s.id !== studentToDelete));
        setShowDeleteModal(false);
      } else {
        alert("Failed to delete student: " + result.error);
      }
    } catch (err) {
      console.error("Hardware API Error:", err);
      alert("Could not connect to the biometric scanner. Ensure the hardware is connected.");
    }

    setDeletingId(null);
    setStudentToDelete(null);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.roll_no.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesClass = filterClass === "All" || student.class_id === filterClass;
    
    return matchesSearch && matchesClass;
  });

  return (
    <div className="w-full max-w-full p-4 sm:p-6 relative min-h-[calc(100vh-4rem)]">
      {/* Page Header Card */}
      <div className="grid grid-cols-1 gap-4 mt-6">
        <Card className="overflow-hidden relative border border-white/40 shadow-lg bg-white/60 backdrop-blur-xl">
          {/* Gradient border on the left */}
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-blue-500 to-indigo-600"></div>
          
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-blue-100/80 backdrop-blur-md shadow-sm">
                <GraduationCap className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Student Directory</h2>
                <p className="text-gray-600 font-medium">Manage and view enrolled students</p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white/50 backdrop-blur-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Link 
              href="/enroll" 
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium whitespace-nowrap"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Link>
          </div>
        </Card>
      </div>
      
      {/* Data Table Card */}
      <div className="mt-6">
        <Card className="overflow-hidden border border-white/40 shadow-lg bg-white/60 backdrop-blur-xl">
          <div className="p-6 border-b border-gray-100/50 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Enrolled Students</h3>
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-sm text-gray-500 bg-white/50 px-3 py-1 rounded-full shadow-sm">
                <Filter className="h-4 w-4 mr-2" />
                <select 
                  className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 outline-none"
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                >
                  <option value="All">All Classes</option>
                  {Object.entries(classIdMap).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-600 uppercase bg-gray-50/50 backdrop-blur-md">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">First Name</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Last Name</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Roll Number</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Class</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider text-center">Attendance %</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex justify-center items-center space-x-2">
                        <div className="w-4 h-4 rounded-full animate-pulse bg-blue-500"></div>
                        <div className="w-4 h-4 rounded-full animate-pulse bg-blue-500" style={{ animationDelay: "0.2s" }}></div>
                        <div className="w-4 h-4 rounded-full animate-pulse bg-blue-500" style={{ animationDelay: "0.4s" }}></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No students found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-white/40 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{student.first_name}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{student.last_name}</td>
                      <td className="px-6 py-4 text-gray-600 font-mono font-semibold">{student.roll_no}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-indigo-50/80 text-indigo-700 rounded-full text-xs font-medium border border-indigo-100 shadow-sm">
                          {classIdMap[student.class_id] || "Unknown"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <span className={`font-bold ${
                            (student.attendance_percentage || 0) >= 75 ? 'text-green-600' :
                            (student.attendance_percentage || 0) >= 60 ? 'text-amber-500' : 'text-red-500'
                          }`}>
                            {student.attendance_percentage || 0}%
                          </span>
                          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                            {student.attendance_present || 0} / {student.attendance_total || 0} classes
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => requestDelete(student.id)}
                          disabled={deletingId === student.id}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                          title="Delete Student"
                        >
                          {deletingId === student.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-100/50 bg-gray-50/30 text-sm text-gray-500 flex justify-between items-center">
            <span>Showing <span className="font-semibold text-gray-900">{filteredStudents.length}</span> students</span>
          </div>
        </Card>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white/90 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Confirm Deletion</h3>
              </div>
              <p className="text-gray-600 mb-6 font-medium">
                Are you sure you want to delete this student? This action cannot be undone and will permanently remove their records.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setStudentToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors disabled:opacity-50"
                  disabled={!!deletingId}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-xl font-semibold transition-colors flex items-center disabled:opacity-50 shadow-sm"
                  disabled={!!deletingId}
                >
                  {deletingId ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying & Deleting...</>
                  ) : "Verify & Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

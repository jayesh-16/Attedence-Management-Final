"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, Search, Filter, Trash2, Plus, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { deleteUserAction } from "@/app/actions";

// Define the shape of our teacher data
interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string; // The identifier for teachers is stored in email
  role: string;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchTeachers = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "teacher")
        .order("first_name", { ascending: true });

      if (error) {
        console.error("Error fetching teachers:", error);
      } else {
        setTeachers(data || []);
      }
      setLoading(false);
    };

    fetchTeachers();
  }, []);

  const requestDelete = (id: string) => {
    setTeacherToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!teacherToDelete) return;
    
    setDeletingId(teacherToDelete);

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
      const result = await deleteUserAction(teacherToDelete, "teacher");
      
      if (result.success) {
        setTeachers(teachers.filter(t => t.id !== teacherToDelete));
        setShowDeleteModal(false);
      } else {
        alert("Failed to delete teacher: " + result.error);
      }
    } catch (err) {
      console.error("Hardware API Error:", err);
      alert("Could not connect to the biometric scanner. Ensure the hardware is connected.");
    }
    
    setDeletingId(null);
    setTeacherToDelete(null);
  };

  const filteredTeachers = teachers.filter(teacher => 
    teacher.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-full p-4 sm:p-6 relative min-h-[calc(100vh-4rem)]">
      {/* Page Header Card */}
      <div className="grid grid-cols-1 gap-4 mt-6">
        <Card className="overflow-hidden relative border border-white/40 shadow-lg bg-white/60 backdrop-blur-xl">
          {/* Gradient border on the left */}
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-purple-500 to-pink-500"></div>
          
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-purple-100/80 backdrop-blur-md shadow-sm">
                <Users className="h-7 w-7 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Teacher Directory</h2>
                <p className="text-gray-600 font-medium">Manage and view registered faculty</p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white/50 backdrop-blur-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-all"
                placeholder="Search teachers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Link 
              href="/enroll" 
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-sm font-medium whitespace-nowrap"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Teacher
            </Link>
          </div>
        </Card>
      </div>
      
      {/* Data Table Card */}
      <div className="mt-6">
        <Card className="overflow-hidden border border-white/40 shadow-lg bg-white/60 backdrop-blur-xl">
          <div className="p-6 border-b border-gray-100/50 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Registered Faculty</h3>
            <div className="flex items-center text-sm text-gray-500 bg-white/50 px-3 py-1 rounded-full shadow-sm">
              <Filter className="h-4 w-4 mr-2" />
              <span>Filter Options</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-600 uppercase bg-gray-50/50 backdrop-blur-md">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">First Name</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Last Name</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Identifier / Email</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Role</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/50">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex justify-center items-center space-x-2">
                        <div className="w-4 h-4 rounded-full animate-pulse bg-purple-500"></div>
                        <div className="w-4 h-4 rounded-full animate-pulse bg-purple-500" style={{ animationDelay: "0.2s" }}></div>
                        <div className="w-4 h-4 rounded-full animate-pulse bg-purple-500" style={{ animationDelay: "0.4s" }}></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No teachers found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-white/40 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{teacher.first_name}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{teacher.last_name}</td>
                      <td className="px-6 py-4 text-gray-600 font-mono">{teacher.email}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-fuchsia-50/80 text-fuchsia-700 rounded-full text-xs font-medium border border-fuchsia-100 shadow-sm capitalize">
                          {teacher.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => requestDelete(teacher.id)}
                          disabled={deletingId === teacher.id}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                          title="Delete Teacher"
                        >
                          {deletingId === teacher.id ? (
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
            <span>Showing <span className="font-semibold text-gray-900">{filteredTeachers.length}</span> faculty members</span>
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
                Are you sure you want to delete this teacher? This action cannot be undone and will permanently remove their records.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setTeacherToDelete(null);
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

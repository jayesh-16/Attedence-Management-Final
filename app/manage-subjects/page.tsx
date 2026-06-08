import React, { Fragment } from "react";
import { addSubjectAction, assignSubjectAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/utils/supabase/server";
import { BookOpen, UserPlus, PlusCircle, Bookmark } from "lucide-react";

export default async function ManageSubjectsPage(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();

  // Fetch classes manually or just hardcode the ones we know (SE, TE, BE)
  const classes = [
    { id: "61d3f3cc-748e-49d2-8212-6a3fc97136c8", name: "SE MME" },
    { id: "22935fbd-2565-4dd8-8a14-f766e2c42cc3", name: "TE MME" },
    { id: "65a136ff-b5a9-4c01-941e-d63499c101a7", name: "BE MME" },
  ];

  // Fetch all teachers
  const { data: teachers } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .eq("role", "teacher")
    .order("first_name", { ascending: true });

  // Fetch all subjects for assignment
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, subject_name, class_id")
    .order("subject_name", { ascending: true });

  // Fetch assignments to map teachers to subjects
  const { data: assignments } = await supabase
    .from("teacher_subjects")
    .select("subject_id, teacher_id");

  // Helper to get teacher initials
  const getTeacherInitialsForSubject = (subjectId: string) => {
    if (!assignments || !teachers) return "N/A";
    const subjectAssignments = assignments.filter(a => a.subject_id === subjectId);
    if (subjectAssignments.length === 0) return "N/A";
    
    const initials = subjectAssignments.map(a => {
      const teacher = teachers.find(t => t.id === a.teacher_id);
      if (!teacher) return null;
      return `${teacher.first_name?.[0] || ""}${teacher.last_name?.[0] || ""}`.toUpperCase();
    }).filter(Boolean);
    
    return initials.length > 0 ? initials.join(", ") : "N/A";
  };

  // Group subjects by class
  const subjectsByClassId = classes.map(c => ({
    classInfo: c,
    subjects: subjects?.filter(s => s.class_id === c.id) || []
  }));

  // Helper to get class name by ID
  const getClassName = (classId: string) => {
    return classes.find(c => c.id === classId)?.name || "Unknown Class";
  };

  return (
    <div className="w-full max-w-full p-4 sm:p-6 relative min-h-[calc(100vh-4rem)]">
      {/* Page Header Card */}
      <div className="grid grid-cols-1 gap-4 mt-6">
        <div className="overflow-hidden relative rounded-xl border border-white/40 shadow-lg bg-white/60 backdrop-blur-xl">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-blue-500 to-indigo-500"></div>
          
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-blue-100/80 backdrop-blur-md shadow-sm">
                <BookOpen className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Manage Subjects</h2>
                <p className="text-gray-600 font-medium">Add new subjects and assign them to faculty</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Forms Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* ADD SUBJECT CARD */}
        <div className="rounded-xl overflow-hidden border border-white/40 shadow-lg bg-white/60 backdrop-blur-xl flex flex-col">
          <div className="p-6 border-b border-gray-100/50 bg-white/40 flex items-center space-x-3">
            <PlusCircle className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-semibold text-gray-800">Add New Subject</h3>
          </div>
          
          <div className="p-6 flex-grow">
            <form action={addSubjectAction} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700" htmlFor="subject_name">
                  Subject Name
                </label>
                <input 
                  type="text" 
                  name="subject_name" 
                  id="subject_name" 
                  placeholder="e.g. Data Structures" 
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700" htmlFor="class_id">
                  Target Class
                </label>
                <select 
                  name="class_id" 
                  id="class_id" 
                  required
                  defaultValue=""
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm appearance-none"
                >
                  <option value="" disabled>Select a class...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <SubmitButton 
                  pendingText="Adding Subject..." 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-xl transition-all shadow-sm"
                >
                  Create Subject
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>

        {/* ASSIGN SUBJECT CARD */}
        <div className="rounded-xl overflow-hidden border border-white/40 shadow-lg bg-white/60 backdrop-blur-xl flex flex-col">
          <div className="p-6 border-b border-gray-100/50 bg-white/40 flex items-center space-x-3">
            <UserPlus className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-800">Assign Subject to Teacher</h3>
          </div>
          
          <div className="p-6 flex-grow">
            <form action={assignSubjectAction} className="space-y-5">
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700" htmlFor="teacher_id">
                  Select Teacher
                </label>
                <select 
                  name="teacher_id" 
                  id="teacher_id" 
                  required
                  defaultValue=""
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm appearance-none"
                >
                  <option value="" disabled>Select a teacher...</option>
                  {teachers?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700" htmlFor="subject_id">
                  Select Subject
                </label>
                <select 
                  name="subject_id" 
                  id="subject_id" 
                  required
                  defaultValue=""
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm appearance-none"
                >
                  <option value="" disabled>Select a subject...</option>
                  {subjects?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subject_name} ({getClassName(s.class_id)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <SubmitButton 
                  pendingText="Assigning..." 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-xl transition-all shadow-sm"
                >
                  Assign Subject
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Global Form Message Container */}
      {searchParams && ("success" in searchParams || "error" in searchParams || "message" in searchParams) && (
        <div className="mt-6 flex justify-center">
           <div className="w-full max-w-2xl bg-white/80 backdrop-blur-xl rounded-xl p-4 shadow-lg border border-white">
              <FormMessage message={searchParams} />
           </div>
        </div>
      )}

      {/* List of Existing Subjects */}
      <div className="mt-6">
        <div className="rounded-xl overflow-hidden border border-white/40 shadow-lg bg-white/60 backdrop-blur-xl">
          <div className="p-6 border-b border-gray-100/50 bg-white/40 flex items-center space-x-3">
            <Bookmark className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-800">All Registered Subjects</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-600 uppercase bg-gray-50/50 backdrop-blur-md">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Subject Name</th>
                  <th scope="col" className="px-6 py-4 font-semibold tracking-wider text-right">Faculty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/50">
                {subjects?.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                      No subjects found. Add one above.
                    </td>
                  </tr>
                ) : (
                  subjectsByClassId.map((group) => (
                    group.subjects.length > 0 && (
                      <Fragment key={group.classInfo.id}>
                        {/* Class Header Row */}
                        <tr className="bg-gray-50/80">
                          <td colSpan={2} className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            {group.classInfo.name}
                          </td>
                        </tr>
                        {/* Subjects for this class */}
                        {group.subjects.map((subject) => (
                          <tr key={subject.id} className="hover:bg-white/40 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900 pl-10 border-l-2 border-transparent hover:border-indigo-300 transition-colors">
                              {subject.subject_name}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                                getTeacherInitialsForSubject(subject.id) === "N/A" 
                                  ? "bg-gray-100 text-gray-500" 
                                  : "bg-purple-100 text-purple-700 border border-purple-200 shadow-sm"
                              }`}>
                                {getTeacherInitialsForSubject(subject.id)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    )
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}

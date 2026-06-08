"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Calendar, CalendarClock, Upload, Clock, Loader2, Save, Trash2, Plus, CalendarDays, ListFilter, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { 
  updateSemesterDatesAction, 
  uploadCalendarAction, 
  addTimetableEntryAction, 
  deleteTimetableEntryAction,
  deleteCalendarEventAction
} from "./actions";

const classIdMap: Record<string, string> = {
  "61d3f3cc-748e-49d2-8212-6a3fc97136c8": "SE MME",
  "22935fbd-2565-4dd8-8a14-f766e2c42cc3": "TE MME",
  "65a136ff-b5a9-4c01-941e-d63499c101a7": "BE MME"
};

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const timeSlots = [
  "08:00:00", "09:00:00", "10:00:00", "11:00:00", 
  "12:00:00", "13:00:00", "14:00:00", "15:00:00", "16:00:00"
];

// Helper to format time strings (e.g., "08:00:00" -> "08:00")
const formatTime = (t: string) => t.substring(0, 5);

export default function ConfigurationPage() {
  const [loading, setLoading] = useState(true);
  
  // Global Active Class
  const [activeClass, setActiveClass] = useState("61d3f3cc-748e-49d2-8212-6a3fc97136c8"); // Default SE MME

  // Semester Dates State
  const [semesterConfigs, setSemesterConfigs] = useState<any[]>([]);
  const [semesterStart, setSemesterStart] = useState("");
  const [semesterEnd, setSemesterEnd] = useState("");
  const [savingDates, setSavingDates] = useState(false);
  
  // Calendar Upload & Events State
  const [uploadingFile, setUploadingFile] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timetable State
  const [timetable, setTimetable] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  // Modal State for adding a class
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ day: "", time: "" });
  const [formData, setFormData] = useState({ subject_id: "", teacher_id: "", class_type: "Theory", duration: 1 });
  const [addingClass, setAddingClass] = useState(false);
  const [syncingDevice, setSyncingDevice] = useState(false);

  const handleSyncDevice = async () => {
    setSyncingDevice(true);
    try {
      const HARDWARE_API = process.env.NEXT_PUBLIC_HARDWARE_API_URL || "http://127.0.0.1:5000";
      
      const supabase = createClient();
      const { data: timetables, error: tErr } = await supabase.from('timetable').select('*');
      const { data: extraLectures, error: eErr } = await supabase.from('extra_lectures').select('*');
      const { data: subjects, error: sErr } = await supabase.from('subjects').select('*');
      
      if (tErr || eErr || sErr) throw new Error("Failed to fetch data from Supabase");
      
      // Transform regular timetables to include subject_name instead of subject_id
      const transformedTimetables = (timetables || []).map(t => {
        const subject = subjects.find(s => s.id === t.subject_id);
        return {
          id: t.id,
          teacher_id: t.teacher_id,
          class_id: classIdMap[t.class_id] || t.class_id,
          subject_name: subject?.subject_name || "Unknown",
          class_type: t.class_type,
          day_of_week: t.day_of_week,
          start_time: t.start_time.substring(0, 5),
          end_time: t.end_time.substring(0, 5),
          is_extra: 0,
          date: null
        };
      });

      // Transform extra_lectures to match timetable format for the device
      const transformedExtra = (extraLectures || []).map(ex => {
        const subject = subjects.find(s => s.id === ex.subject_id);
        const isExchange = ex.lecture_type === 'exchange';
        return {
          id: ex.id,
          teacher_id: isExchange ? ex.exchange_teacher_id : ex.teacher_id,
          class_id: classIdMap[ex.class_id] || ex.class_id,
          subject_name: subject?.subject_name || "Special Class",
          class_type: ex.class_type,
          day_of_week: 0,
          start_time: ex.start_time.substring(0, 5),
          end_time: ex.end_time.substring(0, 5),
          is_extra: 1,
          date: ex.lecture_date
        };
      });

      const combinedTimetable = [
        ...transformedTimetables,
        ...transformedExtra
      ];
      
      // Transform assigned subjects to match the device's teacher_subjects format
      const teacherSubjectsMap = new Map();
      (timetables || []).forEach(t => {
        const key = `${t.teacher_id}-${t.subject_id}-${t.class_id}`;
        if (!teacherSubjectsMap.has(key)) {
          const subject = (subjects || []).find(s => s.id === t.subject_id);
          if (subject) {
            teacherSubjectsMap.set(key, {
              teacher_id: t.teacher_id,
              subject_name: subject.subject_name,
              class_id: classIdMap[t.class_id] || t.class_id
            });
          }
        }
      });
      const teacherSubjects = Array.from(teacherSubjectsMap.values());

      const res = await fetch(`${HARDWARE_API}/api/sync_timetable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Hardware-API-Key': 'tcet_erp_hardware_secure_key_2026' },
        body: JSON.stringify({ timetables: combinedTimetable, teacher_subjects: teacherSubjects })
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Hardware API responded with ${res.status}: ${errorText}`);
      }
      
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.error || "Unknown hardware error");
      
      toast.success(`Device synced successfully!\nSynched ${resData.timetables_synced} classes and ${resData.subjects_synced} teacher subjects.`);
    } catch (e: any) {
      toast.error(`Sync Failed: ${e.message}\n\nPlease ensure the Raspberry Pi is connected and the Hardware API server is running on port 5000.`);
    }
    setSyncingDevice(false);
  };

  const fetchAllData = async () => {
    setLoading(true);
    const supabase = createClient();
    
    // Fetch all required data in parallel
    const [
      { data: semData }, 
      { data: tData }, 
      { data: sData }, 
      { data: ttData },
      { data: eventsData }
    ] = await Promise.all([
      supabase.from("semester_config").select("*"),
      supabase.from("users").select("id, first_name, last_name").eq("role", "teacher"),
      supabase.from("subjects").select("id, subject_name, class_id"),
      supabase.from("timetable").select("*"),
      supabase.from("calendar_events").select("*").order("start_date", { ascending: true })
    ]);

    setSemesterConfigs(semData || []);
    setTeachers(tData || []);
    setSubjects(sData || []);
    setTimetable(ttData || []);
    setCalendarEvents(eventsData || []);
    
    // Set initial semester dates for the default active class
    const currentSem = (semData || []).find(s => s.class_id === activeClass);
    setSemesterStart(currentSem?.start_date || "");
    setSemesterEnd(currentSem?.end_date || "");
    
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Update semester date inputs when active class changes
  useEffect(() => {
    const currentSem = semesterConfigs.find(s => s.class_id === activeClass);
    setSemesterStart(currentSem?.start_date || "");
    setSemesterEnd(currentSem?.end_date || "");
  }, [activeClass, semesterConfigs]);

  const handleSaveDates = async () => {
    setSavingDates(true);
    const fd = new FormData();
    fd.append("class_id", activeClass);
    fd.append("start_date", semesterStart);
    fd.append("end_date", semesterEnd);
    const res = await updateSemesterDatesAction(fd);
    if (res.success) {
      toast.success("Semester dates saved successfully!");
      fetchAllData(); // Refresh to update semesterConfigs state
    } else {
      toast.error("Failed: " + res.error);
    }
    setSavingDates(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingFile(true);
    
    const file = e.target.files[0];
    const fd = new FormData();
    fd.append("file", file);
    fd.append("class_id", activeClass);
    
    const res = await uploadCalendarAction(fd);
    if (res.success) {
      toast.success(res.message);
      fetchAllData(); // Refresh events list
    } else {
      toast.error("Upload failed: " + res.error);
    }
    
    setUploadingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm("Delete this calendar event?")) return;
    setDeletingEventId(id);
    const res = await deleteCalendarEventAction(id);
    if (res.success) fetchAllData();
    else toast.error("Error deleting event: " + res.error);
    setDeletingEventId(null);
  };

  const openGridModal = (day: string, time: string) => {
    setModalData({ day, time });
    setShowModal(true);
  };

  const handleAddClass = async () => {
    if (!formData.subject_id || !formData.teacher_id) {
      toast.error("Please select a subject and teacher.");
      return;
    }
    
    setAddingClass(true);
    
    // Calculate end time based on duration
    const startHour = parseInt(modalData.time.split(":")[0]);
    const endHour = startHour + formData.duration;
    const endTime = `${endHour.toString().padStart(2, '0')}:00:00`;
    
    const fd = new FormData();
    fd.append("class_id", activeClass);
    fd.append("subject_id", formData.subject_id);
    fd.append("teacher_id", formData.teacher_id);
    fd.append("day_of_week", modalData.day);
    fd.append("start_time", modalData.time);
    fd.append("end_time", endTime);
    fd.append("class_type", formData.class_type);
    
    const res = await addTimetableEntryAction(fd);
    if (res.success) {
      setShowModal(false);
      setFormData({ subject_id: "", teacher_id: "", class_type: "Theory", duration: 1 });
      fetchAllData();
    } else {
      toast.error("Error adding class: " + res.error);
    }
    setAddingClass(false);
  };

  const handleDeleteEntry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this scheduled class?")) return;
    const res = await deleteTimetableEntryAction(id);
    if (res.success) fetchAllData();
    else toast.error("Error deleting class: " + res.error);
  };

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

  // Derived state for the timetable and events
  const activeTimetable = timetable.filter(t => t.class_id === activeClass);
  const activeSubjects = subjects.filter(s => s.class_id === activeClass);
  const activeEvents = calendarEvents.filter(e => e.class_id === activeClass || !e.class_id);

  // Pre-calculate row spans and covered cells for the grid
  const coveredCells: Record<string, boolean> = {};
  const rowSpans: Record<string, number> = {};

  activeTimetable.forEach(entry => {
    const startHour = parseInt(entry.start_time.split(':')[0]);
    const endHour = parseInt(entry.end_time.split(':')[0]);
    const duration = endHour - startHour;
    
    const key = `${entry.day_of_week}-${entry.start_time}`;
    rowSpans[key] = duration > 0 ? duration : 1;
    
    // Mark subsequent hours as covered
    for(let i = 1; i < duration; i++) {
      const coveredHour = `${(startHour + i).toString().padStart(2, '0')}:00:00`;
      coveredCells[`${entry.day_of_week}-${coveredHour}`] = true;
    }
  });

  return (
    <div className="w-full max-w-full p-4 sm:p-6 relative min-h-[calc(100vh-4rem)] space-y-6 pb-20">
      
      {/* Header and Global Class Toggle */}
      <div className="grid grid-cols-1 gap-4 mt-6">
        <Card className="overflow-hidden relative border border-white/40 shadow-lg bg-white/60 backdrop-blur-xl">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-emerald-500 to-teal-600"></div>
          <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-emerald-100/80 backdrop-blur-md shadow-sm">
                <CalendarClock className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">System Configuration</h2>
                <p className="text-gray-600 font-medium">Manage semester dates, academic calendar, and timetables</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
              <button 
                onClick={handleSyncDevice}
                disabled={syncingDevice}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {syncingDevice ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Sync to Device
              </button>
              
              {/* GLOBAL CLASS TOGGLE */}
              <div className="flex items-center space-x-2 bg-gray-100/80 p-1.5 rounded-xl shadow-inner border border-gray-200/60">
              {Object.entries(classIdMap).map(([id, name]) => (
                <button
                  key={id}
                  onClick={() => setActiveClass(id)}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeClass === id 
                      ? 'bg-white shadow-sm text-emerald-700 ring-1 ring-emerald-200' 
                      : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Semester Dates Card */}
        <Card className="overflow-hidden border border-white/40 shadow-lg bg-white/60 backdrop-blur-xl p-6 h-fit">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-800">Semester Duration</h3>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
              {classIdMap[activeClass]}
            </span>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input 
                type="date" 
                className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white/50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={semesterStart}
                onChange={(e) => setSemesterStart(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input 
                type="date" 
                className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white/50 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={semesterEnd}
                onChange={(e) => setSemesterEnd(e.target.value)}
              />
            </div>
            <button 
              onClick={handleSaveDates}
              disabled={savingDates}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center justify-center transition-colors shadow-sm disabled:opacity-50 mt-2"
            >
              {savingDates ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save Dates for {classIdMap[activeClass]}</>}
            </button>
          </div>
        </Card>

        {/* Calendar OCR Upload & Events Card */}
        <Card className="overflow-hidden border border-white/40 shadow-lg bg-white/60 backdrop-blur-xl flex flex-col h-[400px]">
          <div className="p-6 border-b border-gray-100/50 bg-white/40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Upload className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold text-gray-800">Academic Calendar</h3>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center shadow-sm disabled:opacity-50"
              >
                {uploadingFile ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                Upload PDF/Image
              </button>
              <input 
                type="file" 
                accept=".pdf,.png,.jpg,.jpeg" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
            </div>
            <p className="text-xs text-gray-500">
              Upload an image of your academic calendar to automatically extract holidays and exams using Vision AI.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/30">
            {activeEvents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <CalendarDays className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">No events extracted yet for this class.</p>
              </div>
            ) : (
              activeEvents.map(event => (
                <div key={event.id} className="bg-white border border-gray-100 rounded-xl p-3 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow group">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${
                        event.event_type === 'holiday' ? 'bg-green-500' :
                        event.event_type === 'exam' ? 'bg-red-500' : 'bg-blue-500'
                      }`}></span>
                      <h4 className="font-semibold text-gray-800 text-sm">{event.event_name}</h4>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 pl-4">
                      {event.start_date} {event.end_date !== event.start_date ? `to ${event.end_date}` : ''}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDeleteEvent(event.id)}
                    disabled={deletingEventId === event.id}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  >
                    {deletingEventId === event.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Timetable Grid System */}
      <Card className="overflow-hidden border border-white/40 shadow-lg bg-white/60 backdrop-blur-xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-800">Visual Timetable Grid</h3>
          </div>
          <div className="px-4 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-sm font-bold flex items-center">
            <ListFilter className="h-4 w-4 mr-2" />
            Viewing Schedule for {classIdMap[activeClass]}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full border-collapse min-w-[800px] bg-white">
            <thead>
              <tr>
                <th className="p-3 border-b border-r border-gray-200 bg-gray-50 w-24 text-gray-500 text-xs font-bold uppercase tracking-wider">Time</th>
                {daysOfWeek.map(day => (
                  <th key={day} className="p-3 border-b border-gray-200 bg-gray-50 text-gray-700 font-bold text-sm text-center">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(time => (
                <tr key={time}>
                  <td className="p-3 border-r border-b border-gray-200 bg-gray-50/50 text-xs font-mono text-gray-500 text-center align-top pt-4">
                    {formatTime(time)}
                  </td>
                  {daysOfWeek.map(day => {
                    const key = `${day}-${time}`;
                    
                    // Skip rendering this <td> if it's covered by a rowSpan from an earlier class
                    if (coveredCells[key]) return null;

                    // Find if there's a class scheduled starting at this exact time
                    const entry = activeTimetable.find(t => t.day_of_week === day && t.start_time === time);
                    const rSpan = rowSpans[key] || 1;
                    
                    return (
                      <td 
                        key={key} 
                        rowSpan={rSpan}
                        className={`border border-gray-200 p-2 align-top transition-colors relative group ${entry ? 'bg-white' : 'hover:bg-indigo-50/30 cursor-pointer h-24'}`}
                        onClick={() => !entry && openGridModal(day, time)}
                      >
                        {entry ? (
                          <div className={`h-full w-full min-h-[5rem] rounded-xl p-3 flex flex-col justify-between border-2 shadow-sm relative overflow-hidden ${
                            entry.class_type === 'Theory' ? 'bg-blue-50 border-blue-200' : 
                            entry.class_type === 'Practical' ? 'bg-emerald-50 border-emerald-200' : 
                            'bg-purple-50 border-purple-200'
                          }`}>
                            {/* Color Accent Bar */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                              entry.class_type === 'Theory' ? 'bg-blue-400' : 
                              entry.class_type === 'Practical' ? 'bg-emerald-400' : 'bg-purple-400'
                            }`}></div>

                            <div className="pl-1">
                              <div className="font-bold text-sm text-gray-900 mb-1 leading-tight break-words">
                                {subjects.find(s => s.id === entry.subject_id)?.subject_name || "Unknown"}
                              </div>
                              <div className="text-xs text-gray-600 bg-white/80 px-2 py-0.5 rounded-md inline-block border border-gray-100 shadow-sm font-medium">
                                {teachers.find(t => t.id === entry.teacher_id)?.first_name} {teachers.find(t => t.id === entry.teacher_id)?.last_name}
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-end mt-3 pl-1">
                              <div className="flex items-center space-x-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                                  entry.class_type === 'Theory' ? 'bg-blue-100 text-blue-700' : 
                                  entry.class_type === 'Practical' ? 'bg-emerald-100 text-emerald-700' : 
                                  'bg-purple-100 text-purple-700'
                                }`}>
                                  {entry.class_type}
                                </span>
                                {rSpan > 1 && (
                                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                    {rSpan} HOURS
                                  </span>
                                )}
                              </div>
                              
                              <button 
                                onClick={(e) => handleDeleteEntry(entry.id, e)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shadow-sm bg-white/50 border border-transparent hover:border-red-100"
                                title="Delete Class"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-indigo-300">
                            <Plus className="h-6 w-6" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Timetable Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white/95 backdrop-blur-xl border border-white/50 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Schedule Class</h3>
                  <p className="text-sm text-gray-500 font-medium mt-1">
                    {modalData.day} at {formatTime(modalData.time)} • <span className="text-indigo-600 font-bold">{classIdMap[activeClass]}</span>
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                    value={formData.subject_id}
                    onChange={e => setFormData({...formData, subject_id: e.target.value})}
                  >
                    <option value="">Select Subject...</option>
                    {activeSubjects.length === 0 && <option disabled>No subjects found for {classIdMap[activeClass]}</option>}
                    {activeSubjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Teacher</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                    value={formData.teacher_id}
                    onChange={e => setFormData({...formData, teacher_id: e.target.value})}
                  >
                    <option value="">Select Teacher...</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Class Type</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                      value={formData.class_type}
                      onChange={e => setFormData({...formData, class_type: e.target.value})}
                    >
                      <option value="Theory">Theory</option>
                      <option value="Practical">Practical</option>
                      <option value="Tutorial">Tutorial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Duration (Hours)</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                      value={formData.duration}
                      onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})}
                    >
                      <option value={1}>1 Hour</option>
                      <option value={2}>2 Hours</option>
                      <option value={3}>3 Hours</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100 mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50"
                    disabled={addingClass}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddClass}
                    className="px-6 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition-colors flex items-center shadow-md disabled:opacity-50"
                    disabled={addingClass}
                  >
                    {addingClass ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : "Save Class"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { BookOpen, Clock, Users, Loader2, CalendarDays, GraduationCap, Plus, RefreshCw, X, ArrowLeftRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const classIdMap: Record<string, string> = {
  "61d3f3cc-748e-49d2-8212-6a3fc97136c8": "SE MME",
  "22935fbd-2565-4dd8-8a14-f766e2c42cc3": "TE MME",
  "65a136ff-b5a9-4c01-941e-d63499c101a7": "BE MME",
};

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const timeSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

interface TimetableEntry { id: string; class_id: string; subject_id: string; teacher_id: string; day_of_week: string; start_time: string; end_time: string; class_type: string; }
interface Subject { id: string; subject_name: string; class_id: string; }
interface AssignedSubject { subject: Subject; schedule: TimetableEntry[]; studentCount: number; }
interface SpecialLecture { id: string; subject_id: string; class_id: string; teacher_id: string; lecture_date: string; start_time: string; end_time: string; class_type: string; lecture_type: "extra" | "exchange"; exchange_original_date?: string; exchange_teacher_id?: string; exchange_timetable_id?: string; notes?: string; }
interface Teacher { id: string; first_name: string; last_name: string; }

const gradients = [
  { from: "from-violet-500", to: "to-purple-700", bg: "bg-violet-50", badge: "bg-violet-100 text-violet-700", icon: "text-violet-600", border: "border-violet-200" },
  { from: "from-blue-500", to: "to-indigo-700", bg: "bg-blue-50", badge: "bg-blue-100 text-blue-700", icon: "text-blue-600", border: "border-blue-200" },
  { from: "from-emerald-500", to: "to-teal-700", bg: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700", icon: "text-emerald-600", border: "border-emerald-200" },
  { from: "from-amber-500", to: "to-orange-600", bg: "bg-amber-50", badge: "bg-amber-100 text-amber-700", icon: "text-amber-600", border: "border-amber-200" },
  { from: "from-pink-500", to: "to-rose-600", bg: "bg-pink-50", badge: "bg-pink-100 text-pink-700", icon: "text-pink-600", border: "border-pink-200" },
];

const formatTime = (t: string) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
};

export default function ManageLecturesPage() {
  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [allTimetable, setAllTimetable] = useState<TimetableEntry[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<AssignedSubject[]>([]);
  const [specialLectures, setSpecialLectures] = useState<SpecialLecture[]>([]);
  const [selectedDay, setSelectedDay] = useState("All");

  // Modal state
  const [showModal, setShowModal] = useState<"extra" | "exchange" | null>(null);
  const [activeSubject, setActiveSubject] = useState<AssignedSubject | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ date: "", start_time: "09:00", end_time: "10:00", class_type: "Theory", notes: "" });
  // Exchange-specific
  const [mySlot, setMySlot] = useState(""); // timetable entry id of MY slot to give away
  const [otherTeacherId, setOtherTeacherId] = useState("");
  const [otherSlot, setOtherSlot] = useState(""); // timetable entry id of OTHER teacher's slot

  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(";").shift() || "");
      return "";
    };
    const email = getCookie("auth_email");
    if (email) fetchTeacherData(email);
  }, []);

  const fetchTeacherData = async (email: string) => {
    setLoading(true);
    const supabase = createClient();
    const { data: teacherData } = await supabase.from("users").select("id, role").eq("email", email).single();
    if (!teacherData) { setLoading(false); return; }
    setTeacherId(teacherData.id);

    const [{ data: timetableData }, { data: allTTData }, { data: subjectsData }, { data: studentsData }, { data: specialData }, { data: teachersData }] = await Promise.all([
      teacherData.role === "admin" ? supabase.from("timetable").select("*") : supabase.from("timetable").select("*").eq("teacher_id", teacherData.id),
      supabase.from("timetable").select("*"),
      supabase.from("subjects").select("*"),
      supabase.from("students").select("id, class_id"),
      teacherData.role === "admin" ? supabase.from("extra_lectures").select("*").order("lecture_date", { ascending: true }) : supabase.from("extra_lectures").select("*").eq("teacher_id", teacherData.id).order("lecture_date", { ascending: true }),
      supabase.from("users").select("id, first_name, last_name").neq("id", teacherData.id),
    ]);

    setAllTimetable(allTTData || []);
    setAllSubjects(subjectsData || []);
    setAllTeachers(teachersData || []);

    const studentCountByClass: Record<string, number> = {};
    (studentsData || []).forEach(s => { studentCountByClass[s.class_id] = (studentCountByClass[s.class_id] || 0) + 1; });

    const subjectClassMap = new Map<string, AssignedSubject>();
    (timetableData || []).forEach(entry => {
      const key = `${entry.subject_id}-${entry.class_id}`;
      const subject = (subjectsData || []).find(s => s.id === entry.subject_id);
      if (!subject) return;
      if (!subjectClassMap.has(key)) subjectClassMap.set(key, { subject, schedule: [], studentCount: studentCountByClass[entry.class_id] || 0 });
      subjectClassMap.get(key)!.schedule.push(entry);
    });

    setAssignedSubjects(Array.from(subjectClassMap.values()));
    setSpecialLectures((specialData || []) as SpecialLecture[]);
    setLoading(false);
  };

  const openModal = (type: "extra" | "exchange", subject: AssignedSubject) => {
    setActiveSubject(subject);
    setShowModal(type);
    setFormData({ date: "", start_time: "09:00", end_time: "10:00", class_type: "Theory", notes: "" });
    setMySlot("");
    setOtherTeacherId("");
    setOtherSlot("");
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    if (showModal === "exchange") {
      if (!mySlot || !otherSlot) { alert("Please select both your slot and the other teacher's slot."); setSaving(false); return; }
      const myEntry = assignedSubjects.flatMap(a => a.schedule).find(s => s.id === mySlot);
      const theirEntry = allTimetable.find(t => t.id === otherSlot);
      if (!myEntry || !theirEntry) { setSaving(false); return; }
      const payload = { teacher_id: teacherId, subject_id: myEntry.subject_id, class_id: myEntry.class_id, lecture_type: "exchange", exchange_teacher_id: theirEntry.teacher_id, exchange_timetable_id: theirEntry.id, my_timetable_id: myEntry.id, notes: formData.notes || null, lecture_date: formData.date || new Date().toISOString().split('T')[0], start_time: myEntry.start_time, end_time: myEntry.end_time, class_type: myEntry.class_type };
      const { error } = await supabase.from("extra_lectures").insert(payload);
      if (error) { alert("Error: " + error.message); setSaving(false); return; }
      alert("Exchange lecture request saved!");
    } else {
      if (!teacherId || !activeSubject || !formData.date) { alert("Please fill all required fields."); setSaving(false); return; }
      const payload: any = { teacher_id: teacherId, subject_id: activeSubject.subject.id, class_id: activeSubject.subject.class_id, lecture_date: formData.date, start_time: formData.start_time + ":00", end_time: formData.end_time + ":00", class_type: formData.class_type, lecture_type: "extra", notes: formData.notes || null };
      const { error } = await supabase.from("extra_lectures").insert(payload);
      if (error) { alert("Error: " + error.message); setSaving(false); return; }
      alert("Extra lecture scheduled!");
    }
    setShowModal(null);
    const email = document.cookie.split('; ').find(r => r.startsWith('auth_email='))?.split('=')[1];
    if (email) fetchTeacherData(decodeURIComponent(email));
    setSaving(false);
  };

  const handleDeleteSpecial = async (id: string) => {
    if (!confirm("Delete this scheduled lecture?")) return;
    const supabase = createClient();
    await supabase.from("extra_lectures").delete().eq("id", id);
    setSpecialLectures(prev => prev.filter(l => l.id !== id));
  };

  const totalLectures = assignedSubjects.reduce((a, s) => a + s.schedule.length, 0);
  const uniqueClasses = new Set(assignedSubjects.map(s => s.subject.class_id)).size;
  const upcomingSpecial = specialLectures.filter(l => new Date(l.lecture_date) >= new Date(new Date().toDateString()));

  if (loading) return <div className="w-full h-[calc(100vh-4rem)] flex items-center justify-center"><Loader2 className="h-10 w-10 text-violet-500 animate-spin" /></div>;

  return (
    <div className="w-full max-w-full p-4 sm:p-6 min-h-[calc(100vh-4rem)] space-y-6 pb-20">

      {/* Header */}
      <div className="mt-6">
        <Card className="overflow-hidden relative border border-white/40 shadow-lg bg-white/60 backdrop-blur-xl">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-violet-500 to-purple-700" />
          <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-violet-100/80 shadow-sm"><BookOpen className="h-7 w-7 text-violet-600" /></div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">My Lectures</h2>
                <p className="text-gray-500 font-medium">Assigned subjects & special lecture management</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-gray-100/80 p-1.5 rounded-xl shadow-inner border border-gray-200/60 flex-wrap gap-y-1">
              <button onClick={() => setSelectedDay("All")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedDay === "All" ? "bg-white shadow-sm text-violet-700 ring-1 ring-violet-200" : "text-gray-500 hover:text-gray-800 hover:bg-white/50"}`}>All Days</button>
              {daysOfWeek.map(day => (
                <button key={day} onClick={() => setSelectedDay(day)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedDay === day ? "bg-white shadow-sm text-violet-700 ring-1 ring-violet-200" : "text-gray-500 hover:text-gray-800 hover:bg-white/50"}`}>{day.substring(0, 3)}</button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Assigned Subjects", value: assignedSubjects.length, icon: BookOpen, colors: "from-violet-400 to-purple-600 bg-violet-50 bg-violet-100 border-violet-200 text-violet-600" },
          { label: "Weekly Lectures", value: totalLectures, icon: Clock, colors: "from-blue-400 to-indigo-600 bg-blue-50 bg-blue-100 border-blue-200 text-blue-600" },
          { label: "Special Scheduled", value: upcomingSpecial.length, icon: CalendarDays, colors: "from-emerald-400 to-teal-600 bg-emerald-50 bg-emerald-100 border-emerald-200 text-emerald-600" },
        ].map(({ label, value, icon: Icon }, i) => (
          <Card key={i} className={`p-5 shadow-md border-0 overflow-hidden relative ${i === 0 ? "bg-gradient-to-br from-violet-50 to-purple-100" : i === 1 ? "bg-gradient-to-br from-blue-50 to-indigo-100" : "bg-gradient-to-br from-emerald-50 to-teal-100"}`}>
            <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${i === 0 ? "from-violet-400 to-purple-600" : i === 1 ? "from-blue-400 to-indigo-600" : "from-emerald-400 to-teal-600"}`} />
            <div className="flex items-center justify-between pl-2">
              <div><p className="text-sm font-medium text-gray-500">{label}</p><h3 className="text-3xl font-bold mt-1 text-gray-800">{value}</h3></div>
              <div className={`p-3 rounded-full ${i === 0 ? "bg-violet-100 border-violet-200" : i === 1 ? "bg-blue-100 border-blue-200" : "bg-emerald-100 border-emerald-200"} border`}><Icon className={`h-6 w-6 ${i === 0 ? "text-violet-600" : i === 1 ? "text-blue-600" : "text-emerald-600"}`} /></div>
            </div>
          </Card>
        ))}
      </div>

      {/* Special Lectures */}
      {upcomingSpecial.length > 0 && (
        <Card className="overflow-hidden border border-white/40 shadow-md bg-white/70 backdrop-blur-xl">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-400 to-orange-600" />
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-800 flex items-center"><CalendarDays className="w-5 h-5 mr-2 text-amber-500" />Upcoming Special Lectures</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingSpecial.map(lec => {
              const subj = assignedSubjects.find(a => a.subject.id === lec.subject_id);
              return (
                <div key={lec.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${lec.lecture_type === "extra" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{lec.lecture_type}</span>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">
                        {subj?.subject.subject_name || (allSubjects.find(s => s.id === lec.subject_id)?.subject_name) || "Unknown Subject"} · {classIdMap[lec.class_id] || ""}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(lec.lecture_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {formatTime(lec.start_time)} – {formatTime(lec.end_time)}
                        {lec.teacher_id !== teacherId && ` · Teacher: ${(allTeachers.find(t => t.id === lec.teacher_id)?.first_name || "Unknown")}`}
                      </p>
                      {lec.exchange_original_date && <p className="text-xs text-amber-600 mt-0.5">↔ Exchanging: {new Date(lec.exchange_original_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>}
                      {lec.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{lec.notes}</p>}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteSpecial(lec.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Subject Cards */}
      {assignedSubjects.length === 0 ? (
        <Card className="p-12 text-center border border-gray-100 bg-white/60 backdrop-blur-xl shadow-md">
          <div className="flex flex-col items-center">
            <div className="p-5 rounded-full bg-gray-50 mb-4"><BookOpen className="h-10 w-10 text-gray-300" /></div>
            <h3 className="text-lg font-bold text-gray-600">No Subjects Assigned</h3>
            <p className="text-gray-400 mt-1 font-medium">Ask an administrator to assign subjects to your timetable.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {assignedSubjects.map(({ subject, schedule, studentCount }, idx) => {
            const theme = gradients[idx % gradients.length];
            const filteredSchedule = selectedDay === "All" ? schedule : schedule.filter(s => s.day_of_week === selectedDay);
            return (
              <Card key={`${subject.id}-${subject.class_id}`} className="overflow-hidden border border-white/40 shadow-md bg-white/70 backdrop-blur-xl hover:shadow-lg transition-shadow">
                {/* Card Header */}
                <div className={`p-5 ${theme.bg} border-b border-gray-100 relative`}>
                  <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${theme.from} ${theme.to}`} />
                  <div className="pl-3 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{subject.subject_name}</h3>
                      <div className="flex items-center space-x-2 mt-2 flex-wrap gap-y-1">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${theme.badge} ${theme.border}`}>{classIdMap[subject.class_id] || "Unknown"}</span>
                        <span className="flex items-center text-xs font-medium text-gray-500"><Users className="w-3 h-3 mr-1" />{studentCount} Students</span>
                        <span className="flex items-center text-xs font-medium text-gray-500"><CalendarDays className="w-3 h-3 mr-1" />{schedule.length}/week</span>
                      </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 ml-2">
                      <button onClick={() => openModal("extra", { subject, schedule, studentCount })} className="flex items-center px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors" title="Add Extra Lecture">
                        <Plus className="w-3.5 h-3.5 mr-1" />Extra
                      </button>
                      <button onClick={() => openModal("exchange", { subject, schedule, studentCount })} className="flex items-center px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors" title="Exchange Lecture">
                        <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />Exchange
                      </button>
                    </div>
                  </div>
                </div>

                {/* Schedule */}
                <div className="p-4 space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{selectedDay === "All" ? "Full Schedule" : `${selectedDay} Schedule`}</p>
                  {filteredSchedule.length === 0 ? (
                    <div className="py-6 text-center text-gray-400"><CalendarDays className="h-6 w-6 mx-auto mb-1 opacity-40" /><p className="text-sm font-medium">No lectures on {selectedDay}</p></div>
                  ) : (
                    filteredSchedule.sort((a, b) => daysOfWeek.indexOf(a.day_of_week) - daysOfWeek.indexOf(b.day_of_week)).map(entry => (
                      <div key={entry.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-b ${theme.from} ${theme.to}`} />
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{entry.day_of_week}</p>
                            <p className="text-xs text-gray-500 flex items-center mt-0.5"><Clock className="w-3 h-3 mr-1" />{formatTime(entry.start_time)} – {formatTime(entry.end_time)}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${entry.class_type === "Theory" ? "bg-blue-100 text-blue-700" : entry.class_type === "Practical" ? "bg-emerald-100 text-emerald-700" : "bg-purple-100 text-purple-700"}`}>{entry.class_type}</span>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(null)}>
          <div className="bg-white/95 backdrop-blur-xl border border-white/50 rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{showModal === "extra" ? "Add Extra Lecture" : "Exchange Lecture"}</h3>
                  <p className="text-sm text-gray-500 mt-1 font-medium">{showModal === "exchange" ? "Swap your slot with another teacher's slot" : (activeSubject ? `${activeSubject.subject.subject_name} · ${classIdMap[activeSubject.subject.class_id]}` : "")}</p>
                </div>
                <button onClick={() => setShowModal(null)} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
              </div>

              {showModal === "exchange" ? (
                <div className="space-y-4">
                  {/* Step 1: My slot */}
                  <div className="p-4 rounded-xl border-2 border-violet-100 bg-violet-50">
                    <p className="text-xs font-bold text-violet-700 uppercase tracking-wider mb-3">Step 1 — Select YOUR lecture slot to give away</p>
                    <select value={mySlot} onChange={e => setMySlot(e.target.value)} className="w-full px-3 py-2 border border-violet-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-500 outline-none text-sm">
                      <option value="">— Pick one of your lectures —</option>
                      {assignedSubjects.flatMap(a => a.schedule).sort((x,y) => daysOfWeek.indexOf(x.day_of_week)-daysOfWeek.indexOf(y.day_of_week)).map(entry => {
                        const subj = assignedSubjects.find(a => a.schedule.includes(entry));
                        return <option key={entry.id} value={entry.id}>{entry.day_of_week} · {formatTime(entry.start_time)}–{formatTime(entry.end_time)} · {subj?.subject.subject_name} ({classIdMap[entry.class_id]})</option>;
                      })}
                    </select>
                  </div>
                  {/* Step 2: Other teacher */}
                  <div className="p-4 rounded-xl border-2 border-blue-100 bg-blue-50">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">Step 2 — Select another teacher</p>
                    <select value={otherTeacherId} onChange={e => { setOtherTeacherId(e.target.value); setOtherSlot(""); }} className="w-full px-3 py-2 border border-blue-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                      <option value="">— Pick a teacher —</option>
                      {allTeachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                    </select>
                    {otherTeacherId && (
                      <select value={otherSlot} onChange={e => setOtherSlot(e.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm mt-3">
                        <option value="">— Pick their lecture slot —</option>
                        {allTimetable.filter(t => t.teacher_id === otherTeacherId).sort((x,y)=>daysOfWeek.indexOf(x.day_of_week)-daysOfWeek.indexOf(y.day_of_week)).map(entry => {
                          const subj = allSubjects.find(s => s.id === entry.subject_id);
                          return <option key={entry.id} value={entry.id}>{entry.day_of_week} · {formatTime(entry.start_time)}–{formatTime(entry.end_time)} · {subj?.subject_name || "Unknown"} ({classIdMap[entry.class_id]})</option>;
                        })}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Notes (optional)</label>
                    <input type="text" placeholder="Reason for exchange..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Lecture Date <span className="text-red-500">*</span></label>
                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-violet-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Start Time</label>
                      <select value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-violet-500 outline-none">
                        {timeSlots.map(t => <option key={t} value={t}>{formatTime(t+":00")}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">End Time</label>
                      <select value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-violet-500 outline-none">
                        {timeSlots.map(t => <option key={t} value={t}>{formatTime(t+":00")}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Class Type</label>
                    <select value={formData.class_type} onChange={e => setFormData({...formData, class_type: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-violet-500 outline-none">
                      <option>Theory</option><option>Practical</option><option>Tutorial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Notes (optional)</label>
                    <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-violet-500 outline-none" />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-5 border-t border-gray-100 mt-5">
                <button onClick={() => setShowModal(null)} disabled={saving} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors disabled:opacity-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className={`px-6 py-2 text-white rounded-xl font-bold transition-colors flex items-center shadow-md disabled:opacity-50 ${showModal === "extra" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}`}>
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : showModal === "extra" ? "Schedule Extra Lecture" : "Confirm Exchange"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

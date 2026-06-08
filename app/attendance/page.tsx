"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import {
  ClipboardCheck, Loader2, Users, CalendarDays, CheckCircle2,
  XCircle, ChevronDown, Search, Filter, RefreshCw, BookOpen, Clock, Usb, Wifi, X
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const classIdMap: Record<string, string> = {
  "61d3f3cc-748e-49d2-8212-6a3fc97136c8": "SE MME",
  "22935fbd-2565-4dd8-8a14-f766e2c42cc3": "TE MME",
  "65a136ff-b5a9-4c01-941e-d63499c101a7": "BE MME",
};

interface AttendanceRow {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: "Present" | "Absent";
  subject_name: string;
  recorded_by: string;
  created_at: string;
  students?: { first_name: string; last_name: string; roll_no: string };
}

interface Summary { present: number; absent: number; total: number; }

const tabs = ["Today", "History"] as const;
type Tab = typeof tabs[number];

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<Tab>("Today");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingUsb, setSyncingUsb] = useState(false);
  const [showWifiModal, setShowWifiModal] = useState(false);

  // Filters
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState("");

  // Data
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [summary, setSummary] = useState<Summary>({ present: 0, absent: 0, total: 0 });

  // History specific
  const [historyFrom, setHistoryFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split("T")[0];
  });
  const [historyTo, setHistoryTo] = useState(new Date().toISOString().split("T")[0]);

  const fetchAttendance = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("attendance")
      .select("*, students(first_name, last_name, roll_no)")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (activeTab === "Today") {
      query = query.eq("date", selectedDate);
    } else {
      query = query.gte("date", historyFrom).lte("date", historyTo);
    }

    if (selectedClass) query = query.eq("class_id", selectedClass);
    if (selectedSubject) query = query.eq("subject_name", selectedSubject);

    const { data, error } = await query.limit(500);
    if (error) { console.error(error); setLoading(false); setRefreshing(false); return; }

    const rows = (data || []) as AttendanceRow[];
    setRecords(rows);

    // Compute summary
    const present = rows.filter(r => r.status === "Present").length;
    setSummary({ present, absent: rows.length - present, total: rows.length });

    // Extract unique subjects from fetched data
    const uniqueSubjects = [...new Set(rows.map(r => r.subject_name).filter(Boolean))].sort();
    setSubjects(uniqueSubjects);

    setLoading(false); setRefreshing(false);
  }, [activeTab, selectedClass, selectedDate, selectedSubject, historyFrom, historyTo]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const filtered = records.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = `${r.students?.first_name || ""} ${r.students?.last_name || ""}`.toLowerCase();
    return name.includes(q) || (r.students?.roll_no || "").toLowerCase().includes(q);
  });

  const handleUsbSync = async () => {
    setSyncingUsb(true);
    try {
      const hardwareUrl = process.env.NEXT_PUBLIC_HARDWARE_API_URL || "http://127.0.0.1:5000";
      
      // 1. Pull data from device
      const pullRes = await fetch(`${hardwareUrl}/api/get_unsynced_attendance`, {
        cache: "no-store",
        headers: { "X-Hardware-API-Key": "tcet_erp_hardware_secure_key_2026" }
      });
      if (!pullRes.ok) throw new Error("Could not connect to USB Device. Ensure it is plugged in.");
      
      const { success, records } = await pullRes.json();
      if (!success || !records) throw new Error("Failed to read records from device.");
      if (records.length === 0) {
        alert("Device is connected, but there are no new attendance records to sync!");
        setSyncingUsb(false);
        return;
      }

      // 2. Push data to cloud via our existing internal API
      const pushRes = await fetch("/api/attendance/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records })
      });
      if (!pushRes.ok) throw new Error("Failed to sync records to the cloud database.");

      // 3. Mark as synced on the device to clear storage
      const recordIds = records.map((r: any) => r.id);
      await fetch(`${hardwareUrl}/api/mark_synced`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Hardware-API-Key": "tcet_erp_hardware_secure_key_2026"
        },
        body: JSON.stringify({ ids: recordIds })
      });

      alert(`Successfully synced ${records.length} records via USB!`);
      fetchAttendance(true);
    } catch (err: any) {
      alert(`USB Sync Error: ${err.message}`);
    } finally {
      setSyncingUsb(false);
    }
  };

  // Group by date for history view
  const groupedByDate = filtered.reduce<Record<string, AttendanceRow[]>>((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});

  const pct = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;

  return (
    <div className="w-full max-w-full p-4 sm:p-6 min-h-[calc(100vh-4rem)] space-y-6 pb-20">

      {/* Header */}
      <div className="mt-6">
        <Card className="overflow-hidden relative border border-white/40 shadow-lg bg-white/60 backdrop-blur-xl">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-emerald-500 to-teal-700" />
          <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-emerald-100/80 shadow-sm">
                <ClipboardCheck className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Attendance</h2>
                <p className="text-gray-500 font-medium">Device-logged attendance records & history</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleUsbSync}
                disabled={syncingUsb || loading}
                className="hidden md:flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors shadow-md disabled:opacity-60"
              >
                {syncingUsb ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Usb className="w-4 h-4 mr-2" />}
                Sync from USB
              </button>
              <button
                onClick={() => setShowWifiModal(true)}
                className="flex md:hidden items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors shadow-md"
              >
                <Wifi className="w-4 h-4 mr-2" />
                Wi-Fi Sync
              </button>
              <button
                onClick={() => fetchAttendance(true)}
                disabled={refreshing}
                className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors shadow-md disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? "bg-white shadow text-emerald-700 ring-1 ring-emerald-100" : "text-gray-500 hover:text-gray-700"}`}
          >
            {tab === "Today" ? <><Clock className="inline w-3.5 h-3.5 mr-1.5" />{tab}</> : <><CalendarDays className="inline w-3.5 h-3.5 mr-1.5" />{tab}</>}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4 border-0 shadow-md bg-white">
        <div className="flex flex-wrap gap-3 items-end">
          {activeTab === "Today" ? (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Date</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-emerald-400 outline-none" />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">From</label>
                <input type="date" value={historyFrom} onChange={e => setHistoryFrom(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-emerald-400 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">To</label>
                <input type="date" value={historyTo} onChange={e => setHistoryTo(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-emerald-400 outline-none" />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Class</label>
            <div className="relative">
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-emerald-400 outline-none">
                <option value="">All Classes</option>
                {Object.entries(classIdMap).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Subject</label>
            <div className="relative">
              <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-emerald-400 outline-none">
                <option value="">All Subjects</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-bold text-gray-500 mb-1">Search Student</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Name or roll no..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-emerald-400 outline-none" />
            </div>
          </div>
        </div>
      </Card>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Records", value: summary.total, icon: Users, color: "from-violet-500 to-purple-600", bg: "bg-violet-50", text: "text-violet-600" },
            { label: "Present", value: summary.present, icon: CheckCircle2, color: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", text: "text-emerald-600" },
            { label: "Absent", value: summary.absent, icon: XCircle, color: "from-red-400 to-rose-600", bg: "bg-red-50", text: "text-red-500" },
            { label: "Attendance %", value: `${pct}%`, icon: ClipboardCheck, color: pct >= 75 ? "from-emerald-500 to-teal-600" : pct >= 50 ? "from-amber-500 to-orange-600" : "from-red-400 to-rose-600", bg: pct >= 75 ? "bg-emerald-50" : pct >= 50 ? "bg-amber-50" : "bg-red-50", text: pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500" },
          ].map(({ label, value, icon: Icon, color, bg, text }) => (
            <Card key={label} className="p-4 border-0 shadow-md bg-white overflow-hidden relative">
              <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${color}`} />
              <div className="pl-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                  <p className={`text-2xl font-bold mt-1 ${text}`}>{value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${bg}`}>
                  <Icon className={`w-5 h-5 ${text}`} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Records */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 border-0 shadow-md bg-white text-center">
          <div className="p-5 rounded-full bg-gray-50 inline-flex mb-4">
            <ClipboardCheck className="w-10 h-10 text-gray-300" />
          </div>
          <p className="text-lg font-bold text-gray-500">No attendance records found</p>
          <p className="text-sm text-gray-400 mt-1">Records are logged automatically by the device</p>
        </Card>
      ) : activeTab === "Today" ? (
        /* Today — flat table */
        <Card className="border-0 shadow-md bg-white overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-emerald-500" />
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </h3>
            <span className="text-xs font-bold text-gray-400">{filtered.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider">Roll No</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider">Student</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider">Class</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider">Subject</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider">Logged At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-600 font-bold">{r.students?.roll_no || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{r.students?.first_name} {r.students?.last_name}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{classIdMap[r.class_id] || r.class_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center text-gray-600"><BookOpen className="w-3 h-3 mr-1.5 text-gray-400" />{r.subject_name || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${r.status === "Present" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {r.status === "Present" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(r.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* History — grouped by date */
        <div className="space-y-4">
          {Object.entries(groupedByDate)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, rows]) => {
              const p = rows.filter(r => r.status === "Present").length;
              const pctDay = rows.length > 0 ? Math.round((p / rows.length) * 100) : 0;
              return (
                <Card key={date} className="border-0 shadow-md bg-white overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-emerald-50">
                        <CalendarDays className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                        <p className="text-xs text-gray-400">{rows.length} records</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">{p} Present</span>
                      <span className="text-xs font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-full">{rows.length - p} Absent</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pctDay >= 75 ? "bg-emerald-100 text-emerald-700" : pctDay >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>{pctDay}%</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-4 py-2.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Roll No</th>
                          <th className="text-left px-4 py-2.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Student</th>
                          <th className="text-left px-4 py-2.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Class</th>
                          <th className="text-left px-4 py-2.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Subject</th>
                          <th className="text-left px-4 py-2.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {rows.sort((a, b) => (a.students?.roll_no || "").localeCompare(b.students?.roll_no || "")).map(r => (
                          <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-gray-600 font-bold text-xs">{r.students?.roll_no || "—"}</td>
                            <td className="px-4 py-2.5 font-semibold text-gray-800">{r.students?.first_name} {r.students?.last_name}</td>
                            <td className="px-4 py-2.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{classIdMap[r.class_id] || r.class_id}</span>
                            </td>
                            <td className="px-4 py-2.5 text-gray-600">{r.subject_name || "—"}</td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${r.status === "Present" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                {r.status === "Present" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })}
        </div>
      )}

      {/* Wi-Fi Sync Guide Modal */}
      {showWifiModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Wifi className="w-5 h-5 text-blue-600" />
                Mobile Wi-Fi Sync
              </h2>
              <button onClick={() => setShowWifiModal(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4 text-left">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h3 className="font-semibold text-blue-800 text-sm mb-1">Step 1: Raspberry Pi</h3>
                <p className="text-sm text-blue-600">Tap <strong>"Wi-Fi Sync"</strong> on the terminal's touchscreen menu to turn on its hotspot.</p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="font-semibold text-gray-800 text-sm mb-1">Step 2: Your Phone</h3>
                <p className="text-sm text-gray-600">Open your phone's Settings and connect to Wi-Fi network: <br/><strong className="text-gray-900 font-mono tracking-wide">Attendance-Sync</strong></p>
                <p className="text-xs text-gray-500 mt-2 italic">Password is shown on the Pi screen.</p>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <h3 className="font-semibold text-emerald-800 text-sm mb-1">Step 3: Transfer</h3>
                <p className="text-sm text-emerald-600">Once connected, click the button below to pull the data directly from the device.</p>
              </div>
            </div>

            <div className="mt-6">
              <a 
                href={`http://192.168.4.1/sync_portal?return_url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href.split('?')[0] : '')}`}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Start Data Transfer
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card } from "@/components/ui/card";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  CalendarDays
} from "lucide-react";

const classIdMap: Record<string, string> = {
  "61d3f3cc-748e-49d2-8212-6a3fc97136c8": "SE MME",
  "22935fbd-2565-4dd8-8a14-f766e2c42cc3": "TE MME",
  "65a136ff-b5a9-4c01-941e-d63499c101a7": "BE MME"
};

export default function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [activeClass, setActiveClass] = useState("61d3f3cc-748e-49d2-8212-6a3fc97136c8");

  
  // Date State
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modal State
  const [selectedDayEvents, setSelectedDayEvents] = useState<{date: Date, events: any[]} | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase.from("calendar_events").select("*").order("start_date", { ascending: true });
      if (data) {
        setAllEvents(data);
      }
      setLoading(false);
    };
    fetchEvents();
  }, []);

  // Calendar generation helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed
  
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Helper to check if a date is within an event's date range
  const getEventsForDate = (date: Date) => {
    const checkTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    
    // Filter by active class or global events
    const activeEvents = allEvents.filter(e => e.class_id === activeClass || !e.class_id);
    
    return activeEvents.filter(e => {
      // Parse YYYY-MM-DD string to local midnight
      const [sy, sm, sd] = e.start_date.split('-');
      const start = new Date(parseInt(sy), parseInt(sm)-1, parseInt(sd)).getTime();
      
      const [ey, em, ed] = e.end_date.split('-');
      const end = new Date(parseInt(ey), parseInt(em)-1, parseInt(ed)).getTime();
      
      return checkTime >= start && checkTime <= end;
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  };

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

  // Generate grid cells
  const gridCells = [];
  
  // Empty cells before 1st day
  for (let i = 0; i < firstDayIndex; i++) {
    gridCells.push(
      <div key={`empty-${i}`} className="min-h-[140px] bg-gray-50/50 p-2"></div>
    );
  }
  
  // Actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(currentYear, currentMonth, day);
    const dayEvents = getEventsForDate(dateObj);
    const isCurrentDay = isToday(day);
    
    gridCells.push(
      <div 
        key={`day-${day}`} 
        onClick={() => dayEvents.length > 0 && setSelectedDayEvents({ date: dateObj, events: dayEvents })}
        className={`min-h-[140px] p-2 relative transition-all group ${
          dayEvents.length > 0 ? 'cursor-pointer hover:bg-gray-50' : ''
        } ${isCurrentDay ? 'bg-emerald-50/20' : 'bg-white'}`}
      >
        <div className="flex justify-between items-start mb-2">
          <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${
            isCurrentDay ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-700'
          }`}>
            {day}
          </span>
          {dayEvents.length > 0 && (
            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
              {dayEvents.length}
            </span>
          )}
        </div>
        
        <div className="space-y-1 mt-1">
          {dayEvents.slice(0, 3).map((e, idx) => (
            <div key={idx} className={`text-[11px] px-1.5 py-0.5 rounded-sm truncate border-l-2 font-medium ${
              e.event_type === 'holiday' ? 'bg-green-50 text-green-700 border-green-500' :
              e.event_type === 'exam' ? 'bg-red-50 text-red-700 border-red-500' :
              'bg-blue-50 text-blue-700 border-blue-500'
            }`}>
              {e.event_name}
            </div>
          ))}
          {dayEvents.length > 3 && (
            <div className="text-[10px] text-gray-400 font-semibold pl-1 mt-1">
              + {dayEvents.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  }

  // Calculate remaining empty cells to complete the last row
  const totalCells = firstDayIndex + daysInMonth;
  const remainingCells = (7 - (totalCells % 7)) % 7;
  for (let i = 0; i < remainingCells; i++) {
    gridCells.push(
      <div key={`empty-end-${i}`} className="min-h-[140px] bg-gray-50/50 p-2"></div>
    );
  }

  return (
    <div className="w-full max-w-full p-4 sm:p-6 relative min-h-[calc(100vh-4rem)] space-y-6 pb-20">
      
      {/* Header */}
      <div className="grid grid-cols-1 gap-4 mt-6">
        <Card className="overflow-hidden relative border border-white/40 shadow-lg bg-white/60 backdrop-blur-xl">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-emerald-500 to-teal-600"></div>
          <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-emerald-100/80 backdrop-blur-md shadow-sm">
                <CalendarDays className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Academic Calendar</h2>
                <p className="text-gray-600 font-medium">View all upcoming holidays, exams, and events</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
              {/* CLASS TOGGLE */}
              <div className="flex items-center space-x-2 bg-gray-100/80 p-1.5 rounded-xl shadow-inner border border-gray-200/60">
                {Object.entries(classIdMap).map(([id, name]) => (
                  <button
                    key={id}
                    onClick={() => setActiveClass(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeClass === id 
                        ? 'bg-white shadow-sm text-emerald-700 ring-1 ring-emerald-200' 
                        : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2 bg-white/80 p-1.5 rounded-xl border border-gray-200 shadow-sm hidden sm:flex">
                <span className="flex items-center text-xs font-medium text-gray-600 px-2"><div className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></div>Holiday</span>
                <span className="flex items-center text-xs font-medium text-gray-600 px-2"><div className="w-2 h-2 rounded-full bg-red-500 mr-1.5"></div>Exam</span>
                <span className="flex items-center text-xs font-medium text-gray-600 px-2"><div className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></div>Event</span>
              </div>
            </div>
          </div>
          {/* Mobile legend */}
          <div className="flex sm:hidden items-center justify-center space-x-2 bg-white/80 p-2 border-t border-gray-100">
            <span className="flex items-center text-xs font-medium text-gray-600 px-2"><div className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></div>Holiday</span>
            <span className="flex items-center text-xs font-medium text-gray-600 px-2"><div className="w-2 h-2 rounded-full bg-red-500 mr-1.5"></div>Exam</span>
            <span className="flex items-center text-xs font-medium text-gray-600 px-2"><div className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></div>Event</span>
          </div>
        </Card>
      </div>

      {/* Calendar UI */}
      <Card className="overflow-hidden border border-white/40 shadow-lg bg-white/50 backdrop-blur-xl p-4 sm:p-6">
        {/* Calendar Controls */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800">
            {monthNames[currentMonth]} {currentYear}
          </h3>
          <div className="flex items-center space-x-2">
            <button 
              onClick={goToToday}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors mr-2"
            >
              Today
            </button>
            <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm">
              <button onClick={prevMonth} className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-gray-50 rounded-l-lg transition-colors border-r border-gray-100">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={nextMonth} className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-gray-50 rounded-r-lg transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="w-full mt-4">
          {/* Days Header */}
          <div className="grid grid-cols-7 border-t border-l border-r border-gray-200 rounded-t-xl overflow-hidden bg-gray-50">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-bold text-gray-500 uppercase tracking-wider py-3 border-r border-gray-200 last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Cells with structural grid gaps */}
          <div className="grid grid-cols-7 bg-gray-200 gap-[1px] border border-gray-200 rounded-b-xl overflow-hidden">
            {gridCells}
          </div>
        </div>
      </Card>

      {/* Event Details Modal */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200" onClick={() => setSelectedDayEvents(null)}>
          <div className="bg-white/95 backdrop-blur-xl border border-white/50 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {monthNames[selectedDayEvents.date.getMonth()]} {selectedDayEvents.date.getDate()}, {selectedDayEvents.date.getFullYear()}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium mt-1">
                    {selectedDayEvents.events.length} Event{selectedDayEvents.events.length > 1 ? 's' : ''} Scheduled
                  </p>
                </div>
                <button onClick={() => setSelectedDayEvents(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-lg transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {selectedDayEvents.events.map((e, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border-l-4 shadow-sm ${
                    e.event_type === 'holiday' ? 'bg-green-50 border-green-500' :
                    e.event_type === 'exam' ? 'bg-red-50 border-red-500' :
                    'bg-blue-50 border-blue-500'
                  }`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        e.event_type === 'holiday' ? 'bg-green-100 text-green-700' : 
                        e.event_type === 'exam' ? 'bg-red-100 text-red-700' : 
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {e.event_type}
                      </span>
                    </div>
                    <h4 className={`font-bold text-lg ${
                      e.event_type === 'holiday' ? 'text-green-900' :
                      e.event_type === 'exam' ? 'text-red-900' :
                      'text-blue-900'
                    }`}>
                      {e.event_name}
                    </h4>
                    <p className={`text-sm mt-1 font-medium ${
                      e.event_type === 'holiday' ? 'text-green-700/70' :
                      e.event_type === 'exam' ? 'text-red-700/70' :
                      'text-blue-700/70'
                    }`}>
                      {e.start_date} {e.end_date !== e.start_date ? `to ${e.end_date}` : ''}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setSelectedDayEvents(null)}
                  className="w-full py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import ReportGenerator from "@/components/ReportGenerator";
import { useRefresh } from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { FileText, Calendar, Download } from "lucide-react";

export default function ReportsPage() {
  const { realtimeStatus } = useRefresh();
  
  // Listen for real-time updates
  useEffect(() => {
    const handleGlobalRefresh = (e: Event) => {
      console.log('Reports page received global refresh event');
      // The actual refresh logic is now handled in the ReportGenerator component
    };
    
    // Add event listener for global refresh
    window.addEventListener('app:refresh', handleGlobalRefresh);
    
    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('app:refresh', handleGlobalRefresh);
    };
  }, []);

  return (
    <div className="w-full max-w-full p-4 sm:p-6">
      {/* Navbar */}
      <Navbar title="Reports" />
      
      {/* Page Header Card */}
      <div className="grid grid-cols-1 gap-4 mt-6">
        <Card className="overflow-hidden relative border border-gray-200 shadow-md">
          {/* Gradient border on the left */}
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-blue-600 to-indigo-600"></div>
          
          <div className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded-full bg-blue-100">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Attendance Reports</h2>
                <p className="text-gray-600">Generate and download detailed attendance reports</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Quick Actions Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card className="overflow-hidden relative border border-gray-200 shadow-md">
          {/* Gradient border on the left */}
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-purple-500 to-pink-500"></div>
          
          <div className="p-6">
            <div className="flex flex-col h-full">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 rounded-full bg-purple-100">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-800">Today's Report</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">Generate a report of today's attendance for all classes</p>
              <button 
                className="mt-auto py-2 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg flex items-center justify-center space-x-2 hover:from-purple-600 hover:to-pink-600 transition-all"
                onClick={() => document.getElementById('today-report-btn')?.click()}
              >
                <Download className="h-4 w-4" />
                <span>Generate</span>
              </button>
            </div>
          </div>
        </Card>
        
        <Card className="overflow-hidden relative border border-gray-200 shadow-md">
          {/* Gradient border on the left */}
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-blue-500 to-cyan-500"></div>
          
          <div className="p-6">
            <div className="flex flex-col h-full">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 rounded-full bg-blue-100">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-800">Weekly Report</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">Generate a summary report for the current week</p>
              <button 
                className="mt-auto py-2 px-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg flex items-center justify-center space-x-2 hover:from-blue-600 hover:to-cyan-600 transition-all"
                onClick={() => document.getElementById('weekly-report-btn')?.click()}
              >
                <Download className="h-4 w-4" />
                <span>Generate</span>
              </button>
            </div>
          </div>
        </Card>
        
        <Card className="overflow-hidden relative border border-gray-200 shadow-md">
          {/* Gradient border on the left */}
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-amber-500 to-orange-500"></div>
          
          <div className="p-6">
            <div className="flex flex-col h-full">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 rounded-full bg-amber-100">
                  <Calendar className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="font-semibold text-gray-800">Monthly Report</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">Generate a comprehensive monthly attendance report</p>
              <button 
                className="mt-auto py-2 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg flex items-center justify-center space-x-2 hover:from-amber-600 hover:to-orange-600 transition-all"
                onClick={() => document.getElementById('monthly-report-btn')?.click()}
              >
                <Download className="h-4 w-4" />
                <span>Generate</span>
              </button>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Report Generator Card */}
      <div className="grid grid-cols-1 gap-4 mt-6">
        <Card className="overflow-hidden relative border border-gray-200 shadow-md">
          {/* Gradient border on the left */}
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-green-500 to-emerald-500"></div>
          
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Advanced Report Generator</h3>
              <p className="text-gray-600">Customize and generate detailed attendance reports</p>
            </div>
            
            {/* Report Generator Component */}
            <div className="mt-4">
              <ReportGenerator />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

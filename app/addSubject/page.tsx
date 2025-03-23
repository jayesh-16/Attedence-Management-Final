"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AttendanceTable from "./studenList";
import { fetchAllMMESubjects, type SubjectBasic } from '@/utils/subjects';
import { ChevronLeft, ChevronRight, BookOpen, Users, GraduationCap } from "lucide-react";
import Navbar from "@/components/Navbar";

interface Subject {
  name: string;
  class: string;
}

const ITEMS_PER_PAGE = {
  MOBILE: 2,
  DESKTOP: 3,
};

export default function AddSubject() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("SE MME");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const getSubjects = async () => {
      try {
        const fetchedSubjects = await fetchAllMMESubjects();
        
        // Transform the fetched subjects into the required format
        const subjectsWithClass = [
          ...fetchedSubjects.SE.map((subject: SubjectBasic) => ({ 
            name: subject.subject_name, 
            class: "SE MME" 
          })),
          ...fetchedSubjects.TE.map((subject: SubjectBasic) => ({ 
            name: subject.subject_name, 
            class: "TE MME" 
          })),
          ...fetchedSubjects.BE.map((subject: SubjectBasic) => ({ 
            name: subject.subject_name, 
            class: "BE MME" 
          })),
        ];

        setSubjects(subjectsWithClass);
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    };

    getSubjects();
  }, []);

  // Calculate pagination based on screen size
  const itemsPerPage = isMobile ? ITEMS_PER_PAGE.MOBILE : ITEMS_PER_PAGE.DESKTOP;
  const filteredSubjects = subjects.filter((subject) => subject.class === selectedClass);
  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSubjects = filteredSubjects.slice(startIndex, endIndex);

  const handleSubjectClick = (subject: Subject) => {
    setSelectedSubject(subject);
  };

  // Function to get badge styling based on class
  const getClassBadge = (className: string) => {
    const classStyles: Record<string, string> = {
      "SE MME": "bg-blue-100 text-blue-800",
      "TE MME": "bg-green-100 text-green-800",
      "BE MME": "bg-violet-100 text-violet-800",
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${classStyles[className]}`}>
        {className}
      </span>
    );
  };

  // Function to get icon based on class
  const getClassIcon = (className: string) => {
    switch(className) {
      case "SE MME":
        return <GraduationCap className="h-5 w-5 text-blue-600" />;
      case "TE MME":
        return <Users className="h-5 w-5 text-green-600" />;
      case "BE MME":
        return <BookOpen className="h-5 w-5 text-violet-600" />;
      default:
        return <BookOpen className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="w-full max-w-full p-4 sm:p-6">
      {/* Navbar */}
      <Navbar title="Attendance" />
      
      {/* Page Header Card */}
      <div className="grid grid-cols-1 gap-4 mt-6">
        <Card className="overflow-hidden relative border border-gray-200 shadow-md">
          {/* Gradient border on the left */}
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-blue-600 to-indigo-600"></div>
          
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center space-x-4">
                <div className="p-2 rounded-full bg-blue-100">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Subject Attendance</h2>
                  <p className="text-gray-600">
                    Select a subject and mark attendance for students
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {["SE MME", "TE MME", "BE MME"].map((className) => (
                  <Button
                    key={className}
                    onClick={() => {
                      setSelectedClass(className);
                      setSelectedSubject(null);
                      setCurrentPage(1);
                    }}
                    variant="ghost"
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border ${
                      selectedClass === className 
                        ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-50" 
                        : "text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {getClassIcon(className)}
                    {className}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Subjects Section */}
      <div className="mt-6">
        <Card className="overflow-hidden relative border border-gray-200 shadow-md">
          {/* Gradient border on the left */}
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-purple-500 to-pink-500"></div>
          
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-purple-100">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-800">Available Subjects</CardTitle>
                  <p className="text-sm text-gray-600">Select a subject to mark attendance</p>
                </div>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-end items-center gap-2">
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600 font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-4 md:p-6 pt-0">
            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-4">
              {currentSubjects.length > 0 ? (
                currentSubjects.map((subject, index) => (
                  <div key={index}>
                    <Card
                      onClick={() => handleSubjectClick(subject)}
                      className={`overflow-hidden relative hover:shadow-md transition-all cursor-pointer ${
                        selectedSubject?.name === subject.name
                          ? "ring-2 ring-blue-500 shadow-md"
                          : "hover:ring-1 hover:ring-gray-200"
                      }`}
                    >
                      {/* Gradient border on the left */}
                      <div className={`absolute left-0 top-0 h-full w-1.5 ${
                        subject.class === "SE MME" 
                          ? "bg-gradient-to-b from-blue-500 to-blue-600" 
                          : subject.class === "TE MME" 
                            ? "bg-gradient-to-b from-green-500 to-emerald-600" 
                            : "bg-gradient-to-b from-violet-500 to-purple-600"
                      }`}></div>
                      
                      <CardHeader className="p-4 md:p-6">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${
                            subject.class === "SE MME" 
                              ? "bg-blue-100" 
                              : subject.class === "TE MME" 
                                ? "bg-green-100" 
                                : "bg-violet-100"
                          }`}>
                            {getClassIcon(subject.class)}
                          </div>
                          <CardTitle className="text-base md:text-lg text-gray-900">{subject.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 md:p-6 pt-0">
                        <div className="flex items-center space-x-2">
                          {getClassBadge(subject.class)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center col-span-full py-8">No subjects available for {selectedClass}.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table Section */}
      {selectedSubject && (
        <div className="mt-6">
          <Card className="overflow-hidden relative border border-gray-200 shadow-md">
            {/* Gradient border on the left */}
            <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-green-500 to-emerald-600"></div>
            
            <CardContent className="p-0">
              <AttendanceTable selectedSubject={selectedSubject} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
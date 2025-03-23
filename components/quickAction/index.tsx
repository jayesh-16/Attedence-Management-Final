"use client";

import React, { useState } from "react";
import { FiUserPlus, FiBook, FiClipboard, FiFileText } from "react-icons/fi";
import { MdDashboard } from "react-icons/md";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import StudentsInputForm from "../studentForm"; // Import Students Form
import ClassInputForm from "../classForm"; // Import Subject Form

type ActionButton = {
  id: string;
  icon: React.ElementType;
  label: string;
  tooltip: string;
  color: string;
  onClick?: () => void;
};

type QuickActionsCardProps = {
  className?: string;
  title?: string;
  description?: string;
  icon?: string;
  link?: string;
};

const DashboardIcon = MdDashboard as React.ElementType;


const QuickActionsCard: React.FC<QuickActionsCardProps> = ({ className, title, description, icon, link }) => {
  const [popupType, setPopupType] = useState<"students" | "subject" | null>(null);
  const router = useRouter();

  // If we're using the new props style, render a simplified card
  if (title && description) {
    const getIcon = () => {
      switch (icon) {
        case 'attendance':
          return FiClipboard as React.ElementType;
        case 'analytics':
          return MdDashboard as React.ElementType;
        case 'reports':
          return FiFileText as React.ElementType;
        case 'classes':
          return FiBook as React.ElementType;
        default:
          return FiClipboard as React.ElementType;
      }
    };
    
    const Icon = getIcon();
    
    return (
      <div 
        className="p-4 bg-white rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all duration-300"
        onClick={() => link && router.push(link)}
      >
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 rounded-full bg-blue-100">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="font-medium">{title}</h3>
        </div>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    );
  }

  // Original implementation
  const actionButtons: ActionButton[] = [
    { id: "addStudents", icon: FiUserPlus as React.ElementType, label: "Add Students", tooltip: "Add New Students", color: "bg-emerald-500 hover:bg-emerald-600", onClick: () => setPopupType("students") },
    { id: "addSubject", icon: FiBook as React.ElementType, label: "Add Subject", tooltip: "Create New Subject", color: "bg-blue-500 hover:bg-blue-600", onClick: () => setPopupType("subject") },
    { id: "attendance", icon: FiClipboard as React.ElementType, label: "Take Attendance", tooltip: "Mark Attendance", color: "bg-teal-500 hover:bg-teal-600", onClick: () => router.push("/addSubject") },
    { id: "reports", icon: FiFileText as React.ElementType, label: "Generate Report", tooltip: "Generate Reports", color: "bg-purple-500 hover:bg-purple-600", onClick: () => router.push("/reports") }
  ];

  return (
    <div className={clsx("p-6 bg-white rounded-xl shadow-lg dark:bg-boxdark dark:border-strokedark min-h-80 flex flex-col", className)}>
      <div className="flex items-center gap-2 mb-6">
      <DashboardIcon className="text-3xl" />

        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Quick Actions</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
        {actionButtons.map(({ id, icon: Icon, label, tooltip, color, onClick }) => (
          <button
            key={id}
            onClick={onClick}
            className={`relative flex flex-col items-center justify-center gap-3 p-4 rounded-lg ${color} text-white transition-all duration-300 
              hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            title={tooltip}
          >
            <Icon className="text-3xl" />
            <span className="font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Popup for adding students */}
      {popupType === "students" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add New Students</h2>
            <StudentsInputForm onClose={() => setPopupType(null)} />
          </div>
        </div>
      )}

      {/* Popup for adding subjects */}
      {popupType === "subject" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add New Subject</h2>
            <ClassInputForm onClose={() => setPopupType(null)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickActionsCard;

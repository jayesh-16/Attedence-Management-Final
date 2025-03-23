"use client";

import React, { useEffect } from "react";
import { AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AdminPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export function AdminPopup({
  isOpen,
  onClose,
  title = "Admin Access Required",
  message = "Only administrators can perform this action. Please contact an administrator for assistance."
}: AdminPopupProps) {
  // Prevent body scrolling when popup is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key press
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - optimized with will-change for better performance */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center"
            style={{ willChange: "opacity" }}
            onClick={onClose}
          />
          
          {/* Popup - optimized with hardware acceleration */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 300,
                duration: 0.2
              }}
              className="w-full max-w-md pointer-events-auto"
              style={{ 
                willChange: "transform, opacity",
                transform: "translateZ(0)" // Force hardware acceleration
              }}
            >
              <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
                {/* Header with gradient */}
                <div className="relative bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4 text-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-full">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold">{title}</h3>
                  </div>
                  <button 
                    onClick={onClose}
                    className="absolute right-4 top-4 text-white/80 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                {/* Content */}
                <div className="p-6">
                  <p className="text-gray-700">{message}</p>
                  
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-medium hover:shadow-md transition-shadow"
                    >
                      Understood
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

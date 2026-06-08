"use client";

import React, { useState } from "react";
import { UserPlus, Fingerprint, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { enrollUserAction } from "@/app/actions";

export default function EnrollPage() {
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [classId, setClassId] = useState("61d3f3cc-748e-49d2-8212-6a3fc97136c8"); // Default SE MME
  
  const [status, setStatus] = useState<"idle" | "fetching_slot" | "inserting_db" | "awaiting_scan" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [slot, setSlot] = useState<number | null>(null);

  const HARDWARE_API = process.env.NEXT_PUBLIC_HARDWARE_API_URL || "http://raspberrypi.local:5000";

  const handleEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("fetching_slot");
    setErrorMessage("");

    try {
      // 1. Get next available hardware slot
      const slotRes = await fetch(`${HARDWARE_API}/api/next_slot`, {
        headers: { "X-Hardware-API-Key": "tcet_erp_hardware_secure_key_2026" }
      });
      const slotData = await slotRes.json();
      if (!slotData.success) throw new Error("Failed to get hardware slot.");
      setSlot(slotData.slot);

      setStatus("inserting_db");

      // 2. Insert into Supabase
      const dbRes = await enrollUserAction({ 
        firstName, 
        lastName, 
        identifier: role === "teacher" ? `TCH-${Date.now()}` : identifier, 
        role,
        classId
      });
      if (!dbRes.success) throw new Error(dbRes.error || "Database insertion failed");
      
      const newUserId = dbRes.id;

      setStatus("awaiting_scan");

      // 3. Prompt hardware to start enrollment
      const enrollRes = await fetch(`${HARDWARE_API}/api/enroll`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Hardware-API-Key": "tcet_erp_hardware_secure_key_2026"
        },
        body: JSON.stringify({ slot: slotData.slot })
      });
      const enrollData = await enrollRes.json();

      if (!enrollData.success) {
        throw new Error(enrollData.error || "Hardware scanning failed");
      }

      // 4. If hardware succeeds, save user mapping locally on Pi
      const saveRes = await fetch(`${HARDWARE_API}/api/save_user`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Hardware-API-Key": "tcet_erp_hardware_secure_key_2026"
        },
        body: JSON.stringify({
          id: newUserId,
          first_name: firstName,
          last_name: lastName,
          identifier: role === "teacher" ? `TCH-${Date.now()}` : identifier,
          role: role,
          fingerprint_id: enrollData.slot, // from the hardware scan response
        }),
      });

      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error("Failed to save to terminal database");

      setStatus("success");
      
      // Update display
      fetch(`${HARDWARE_API}/api/display`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Hardware-API-Key": "tcet_erp_hardware_secure_key_2026"
        },
        body: JSON.stringify({
            title: "ENROLLED",
            message: `${firstName} ${lastName}\nID: ${role === "teacher" ? 'Teacher' : identifier}`,
            duration: 5
        })
      }).catch(console.error);

      // Reset form
      setTimeout(() => {
        setStatus("idle");
        setFirstName("");
        setLastName("");
        setIdentifier("");
      }, 5000);

    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMessage(err.message || "An unknown error occurred.");
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com" rel="preconnect" />
      <link crossOrigin="" href="https://fonts.gstatic.com" rel="preconnect" />
      <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <style dangerouslySetInnerHTML={{__html: `
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}} />

      <div className="relative min-h-[calc(100vh-4rem)] w-full flex flex-col items-center justify-center p-md lg:p-xl font-body-md selection:bg-primary-fixed-dim selection:text-on-primary-fixed overflow-hidden bg-[#e9f2fb]">
        
        {/* Pure CSS Glassmorphic Mesh Gradient Background */}
        <div className="absolute inset-0 bg-[#f0f4f8] pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400 blur-[100px] opacity-40 mix-blend-multiply"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400 blur-[100px] opacity-40 mix-blend-multiply"></div>
          <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-purple-300 blur-[100px] opacity-40 mix-blend-multiply"></div>
          <div className="absolute bottom-[20%] left-[10%] w-[40%] h-[40%] rounded-full bg-cyan-300 blur-[100px] opacity-40 mix-blend-multiply"></div>
        </div>
        <div className="absolute inset-0 bg-white/20 pointer-events-none backdrop-blur-[4px] z-0"></div>

        {/* Central Card */}
        <main className="relative z-10 w-full max-w-4xl bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden flex flex-col lg:flex-row">
          
          {/* Left Column: Form */}
          <div className="flex-1 p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-outline-variant/30 bg-white/50">
            <div className="flex items-center gap-sm mb-lg">
              <div className="bg-stitch-primary p-sm rounded-lg flex items-center justify-center shadow-md">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">New Enrollment</h1>
            </div>

            <p className="font-body-md text-body-md text-on-surface-variant mb-xl">
              Register a new student or teacher into the system to grant biometric access.
            </p>

            <form onSubmit={handleEnrollment} className="space-y-lg">
              
              {/* Role Toggle */}
              <div className="flex p-1 bg-surface-container-highest/30 rounded-xl border border-outline-variant/50 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`flex-1 py-sm px-4 text-label-md font-label-md rounded-lg transition-all ${
                    role === "student" ? "bg-white text-stitch-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`flex-1 py-sm px-4 text-label-md font-label-md rounded-lg transition-all ${
                    role === "teacher" ? "bg-white text-stitch-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Teacher
                </button>
              </div>

              <div className="grid grid-cols-2 gap-md">
                <div className="space-y-sm">
                  <label className="font-label-md text-label-md text-on-surface">First Name</label>
                  <input 
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={status !== "idle" && status !== "error"}
                    className="w-full px-md py-md bg-white border border-outline-variant rounded-xl focus:border-stitch-primary focus:ring-2 focus:ring-stitch-primary/20 transition-all outline-none font-body-md text-body-md disabled:opacity-50 shadow-sm"
                    placeholder="John"
                  />
                </div>
                <div className="space-y-sm">
                  <label className="font-label-md text-label-md text-on-surface">Last Name</label>
                  <input 
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={status !== "idle" && status !== "error"}
                    className="w-full px-md py-md bg-white border border-outline-variant rounded-xl focus:border-stitch-primary focus:ring-2 focus:ring-stitch-primary/20 transition-all outline-none font-body-md text-body-md disabled:opacity-50 shadow-sm"
                    placeholder="Doe"
                  />
                </div>
              </div>

              {role === "student" && (
                <>
                  <div className="space-y-sm animate-in fade-in slide-in-from-top-2">
                    <label className="font-label-md text-label-md text-on-surface">Class / Department</label>
                    <select 
                      value={classId}
                      onChange={(e) => setClassId(e.target.value)}
                      disabled={status !== "idle" && status !== "error"}
                      className="w-full px-md py-md bg-white border border-outline-variant rounded-xl focus:border-stitch-primary focus:ring-2 focus:ring-stitch-primary/20 transition-all outline-none font-body-md text-body-md disabled:opacity-50 shadow-sm appearance-none"
                    >
                      <option value="61d3f3cc-748e-49d2-8212-6a3fc97136c8">SE MME</option>
                      <option value="22935fbd-2565-4dd8-8a14-f766e2c42cc3">TE MME</option>
                      <option value="65a136ff-b5a9-4c01-941e-d63499c101a7">BE MME</option>
                    </select>
                  </div>

                  <div className="space-y-sm animate-in fade-in slide-in-from-top-2">
                    <label className="font-label-md text-label-md text-on-surface">Roll Number</label>
                    <input 
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      disabled={status !== "idle" && status !== "error"}
                      className="w-full px-md py-md bg-white border border-outline-variant rounded-xl focus:border-stitch-primary focus:ring-2 focus:ring-stitch-primary/20 transition-all outline-none font-body-md text-body-md disabled:opacity-50 shadow-sm"
                      placeholder="e.g. 2021001"
                    />
                  </div>
                </>
              )}

              <div className="pt-sm">
                <button
                  type="submit"
                  disabled={status !== "idle" && status !== "error"}
                  className="w-full bg-primary-container text-on-primary font-label-md text-label-md py-lg rounded-xl shadow-md hover:shadow-lg hover:bg-stitch-primary hover:text-white active:scale-[0.98] transition-all flex items-center justify-center gap-sm disabled:opacity-50 disabled:shadow-none"
                >
                  <span>Initiate Hardware Scan</span>
                  <span className="material-symbols-outlined text-[20px]" data-icon="arrow_forward">arrow_forward</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Visualizer */}
          <div className="flex-1 bg-white/20 flex flex-col items-center justify-center relative p-8 min-h-[400px]">
            {/* Scanner Visuals */}
            <div className="relative z-10 flex flex-col items-center">
              <div className={`w-32 h-32 rounded-full border-2 flex items-center justify-center mb-8 relative transition-all duration-500 bg-white shadow-xl ${
                status === "awaiting_scan" ? "border-stitch-primary shadow-[0_0_30px_rgba(0,74,198,0.25)]" : 
                status === "success" ? "border-emerald-500 bg-emerald-50" :
                status === "error" ? "border-error bg-error-container" :
                "border-outline-variant/30"
              }`}>
                {status === "idle" && <Fingerprint className="w-12 h-12 text-on-surface-variant/50" />}
                {(status === "fetching_slot" || status === "inserting_db") && <Loader2 className="w-12 h-12 text-stitch-primary animate-spin" />}
                {status === "awaiting_scan" && (
                  <>
                    <Fingerprint className="w-16 h-16 text-stitch-primary animate-pulse" />
                    {/* Scanner line */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-stitch-primary shadow-[0_0_15px_#004ac6] animate-[scan_2s_ease-in-out_infinite]"></div>
                  </>
                )}
                {status === "success" && <CheckCircle2 className="w-16 h-16 text-emerald-600" />}
                {status === "error" && <XCircle className="w-16 h-16 text-error" />}
              </div>

              {/* Status Readouts */}
              <div className="text-center space-y-sm bg-white/80 backdrop-blur-md px-8 py-4 rounded-2xl shadow-sm border border-white">
                <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">Terminal Status</p>
                <div className="h-8 flex items-center justify-center">
                  {status === "idle" && <p className="text-on-surface font-body-md font-medium">Ready for Input</p>}
                  {status === "fetching_slot" && <p className="text-stitch-primary font-body-md font-medium animate-pulse">Allocating Hardware Slot...</p>}
                  {status === "inserting_db" && <p className="text-stitch-primary font-body-md font-medium animate-pulse">Syncing Cloud Records...</p>}
                  {status === "awaiting_scan" && <p className="text-stitch-primary font-body-md font-bold tracking-wide animate-pulse">Place finger on sensor</p>}
                  {status === "success" && <p className="text-emerald-600 font-body-md font-medium">Biometric Profile Secured</p>}
                  {status === "error" && <p className="text-error font-body-md font-medium max-w-xs">{errorMessage}</p>}
                </div>
                {slot !== null && status !== "idle" && (
                  <p className="text-label-sm font-label-sm text-on-surface-variant mt-md bg-surface-container-highest px-3 py-1 rounded-full inline-block">Assigned Slot: {String(slot).padStart(4, '0')}</p>
                )}
              </div>
            </div>
          </div>

        </main>
      </div>

      <style jsx>{`
        @keyframes scan {
          0%, 100% { top: 10%; opacity: 0; }
          10%, 90% { opacity: 1; }
          50% { top: 90%; }
        }
      `}</style>
    </>
  );
}

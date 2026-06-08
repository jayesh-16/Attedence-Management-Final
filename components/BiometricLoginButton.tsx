"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { loginBiometricAction } from "@/app/actions";

export default function BiometricLoginButton() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleBiometricLogin = async () => {
    setIsScanning(true);
    setError(null);
    
    try {
      // 1. Tell the Python API to scan the finger
      const apiUrl = process.env.NEXT_PUBLIC_HARDWARE_API_URL || "http://127.0.0.1:5000";
      const res = await fetch(`${apiUrl}/api/identify`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Hardware-API-Key": "tcet_erp_hardware_secure_key_2026"
        }
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        setError(data.error || "Biometric scan failed");
        setIsScanning(false);
        return;
      }
      
      // 2. We successfully got a Fingerprint ID from the hardware!
      // In a real system, you would verify if data.finger_id belongs to the admin.
      // For now, if the sensor recognizes ANY registered finger, we log them in.
      
      // We create a hidden form and submit it to our server action
      const formData = new FormData();
      formData.append("finger_id", data.finger_id.toString());
      if (data.name) formData.append("name", data.name);
      if (data.role) formData.append("role", data.role);
      if (data.email) formData.append("email", data.email);
      
      // Tell Kiosk display we logged in successfully
      try {
        const apiUrl = process.env.NEXT_PUBLIC_HARDWARE_API_URL || "http://127.0.0.1:5000";
        await fetch(`${apiUrl}/api/display`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "X-Hardware-API-Key": "tcet_erp_hardware_secure_key_2026"
          },
          body: JSON.stringify({
             title: "✓ LOGGED IN",
             body: `Logged in successfully as ${data.name || 'Admin'}`
          })
        });
      } catch (err) {}
      
      await loginBiometricAction(formData);
      
    } catch (err) {
      setError("Hardware disconnected or API not running.");
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <button 
          type="button" 
          onClick={handleBiometricLogin}
          disabled={isScanning}
          className={`flex items-center justify-center gap-2 py-3 border rounded-xl font-semibold text-sm transition-all duration-300 ${
            isScanning 
              ? 'bg-[#2563eb]/10 border-[#2563eb]/30 text-[#2563eb] cursor-not-allowed shadow-[0_0_15px_rgba(37,99,235,0.2)]' 
              : 'border-[#c3c6d7] text-[#191c1e] hover:bg-[#f2f4f6] hover:border-[#737686]'
          }`}
        >
          {isScanning ? (
            <span className="material-symbols-outlined text-[20px] animate-pulse" style={{fontVariationSettings: "'FILL' 1"}}>fingerprint</span>
          ) : (
            <span className="material-symbols-outlined text-[20px]">fingerprint</span>
          )}
          <span>{isScanning ? 'Scanning...' : 'Touch ID'}</span>
        </button>
        
        <button type="button" className="flex items-center justify-center gap-2 py-3 border border-[#c3c6d7] rounded-xl font-semibold text-sm text-[#191c1e] hover:bg-[#f2f4f6] transition-colors">
          <span className="material-symbols-outlined text-[20px]">face</span>
          <span>Face ID</span>
        </button>
      </div>
      
      {error && (
        <p className="text-sm font-medium text-[#ba1a1a] text-center animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
}

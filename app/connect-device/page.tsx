"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wifi, X, RefreshCw } from "lucide-react";

export default function ConnectDevicePage() {
  const router = useRouter();
  const [status, setStatus] = useState("Searching for device");
  const [isConnected, setIsConnected] = useState(false);

  // Background hardware polling
  useEffect(() => {
    if (isConnected) return;

    const checkHardware = async () => {
      try {
        // Ping the Python Hardware API Bridge
        const apiUrl = process.env.NEXT_PUBLIC_HARDWARE_API_URL || "http://127.0.0.1:5000";
        const res = await fetch(`${apiUrl}/api/status`, { 
          cache: "no-store",
          headers: { "X-Hardware-API-Key": "tcet_erp_hardware_secure_key_2026" }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            setIsConnected(true);
            setStatus("Device Ready. Redirecting...");
            
            // Set cookie so middleware knows device is connected
            document.cookie = "device_connected=true; path=/; max-age=86400";
            
            // Send connection message to Kiosk
            try {
              const apiUrl = process.env.NEXT_PUBLIC_HARDWARE_API_URL || "http://127.0.0.1:5000";
              await fetch(`${apiUrl}/api/display`, {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "X-Hardware-API-Key": "tcet_erp_hardware_secure_key_2026"
                },
                body: JSON.stringify({
                   title: "✓ CONNECTED",
                   body: "Successfully connected to Web ERP System."
                })
              });
            } catch (err) {}
            
            // Redirect to the login page immediately!
            setTimeout(() => {
              router.push("/sign-in");
            }, 1000);
          }
        }
      } catch (error) {
        // API not running or hardware disconnected
        setStatus("Searching for device");
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(checkHardware, 2000);
    
    // Check immediately on mount
    checkHardware();

    return () => clearInterval(interval);
  }, [isConnected, router]);

  // Check for successful Wi-Fi sync return
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('wifi_synced=true')) {
      setIsConnected(true);
      setStatus("Wi-Fi Sync Complete! Redirecting...");
      document.cookie = "device_connected=true; path=/; max-age=86400";
      setTimeout(() => {
        router.push("/sign-in");
      }, 1500);
    }
  }, [router]);

  const [showWifiModal, setShowWifiModal] = useState(false);

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
        
        /* Custom USB Animation */
        .usb-cable {
          animation: ${isConnected ? 'usb-connected 0.5s forwards' : 'usb-search 2s ease-in-out infinite'};
        }
        @keyframes usb-search {
          0%, 100% { transform: translateY(15px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes usb-connected {
          0% { transform: translateY(-5px); }
          100% { transform: translateY(-24px); }
        }

        .pulse-ring {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.05; }
          100% { transform: scale(1); opacity: 0.15; }
        }

        .ellipsis-dot {
          animation: blink 1.4s infinite both;
        }
        .ellipsis-dot:nth-child(2) { animation-delay: 0.2s; }
        .ellipsis-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink {
          0% { opacity: 0.2; }
          20% { opacity: 1; }
          100% { opacity: 0.2; }
        }
      `}} />

      <div className="bg-white text-on-surface min-h-screen flex flex-col font-['Hanken_Grotesk'] selection:bg-primary-fixed-dim selection:text-on-primary-fixed relative overflow-hidden">
        
        {/* Pure CSS Glassmorphic Mesh Gradient Background */}
        <div className="absolute inset-0 bg-[#f8fafc] pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#e0e7ff] blur-[120px] opacity-80 mix-blend-multiply"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#dbeafe] blur-[120px] opacity-80 mix-blend-multiply"></div>
          <div className="absolute top-[20%] right-[10%] w-[30%] h-[40%] rounded-full bg-[#bfdbfe] blur-[100px] opacity-60 mix-blend-multiply"></div>
          <div className="absolute bottom-[20%] left-[10%] w-[30%] h-[40%] rounded-full bg-[#e2e8f0] blur-[100px] opacity-60 mix-blend-multiply"></div>
        </div>
        <div className="absolute inset-0 bg-white/40 pointer-events-none backdrop-blur-[2px] z-0"></div>
        
        {/* Header Anchor */}
        <header className="w-full h-16 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md border-b border-white z-50 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-stitch-primary" style={{fontVariationSettings: "'FILL' 1"}}>fingerprint</span>
            <span className="text-xl font-bold text-stitch-primary tracking-tight">SecureSync Terminal</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full transition-colors duration-200 hover:bg-surface-container-highest text-outline">
              <span className="material-symbols-outlined text-outline">settings</span>
            </button>
          </div>
        </header>

        {/* Main Canvas */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 relative">
          
          <div className="max-w-lg w-full text-center bg-white/80 backdrop-blur-xl rounded-3xl p-10 shadow-xl border border-white relative overflow-hidden">
            
            {/* Top decorative gradient */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-stitch-primary to-transparent opacity-50"></div>

            <div className="space-y-10">
              
              {/* Central Animated USB Area */}
              <div className="relative mx-auto w-64 h-64 flex flex-col items-center justify-center bg-white rounded-3xl shadow-inner border border-outline-variant/30 overflow-hidden">
                
                {/* Pulse Rings */}
                <div className={`absolute w-48 h-48 border-2 border-stitch-primary/30 rounded-full ${isConnected ? 'animate-ping border-emerald-500/50' : 'pulse-ring'}`}></div>
                <div className={`absolute w-56 h-56 border border-stitch-primary/20 rounded-full ${isConnected ? 'animate-ping border-emerald-500/30' : 'pulse-ring'}`} style={{ animationDelay: "0.5s" }}></div>
                
                {/* USB Port & Cable Animation */}
                <div className="relative w-40 h-48 flex flex-col items-center">
                  
                  {/* USB Port */}
                  <div className={`w-24 h-12 border-4 ${isConnected ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-outline-variant'} rounded-lg mt-4 flex items-center justify-center bg-surface relative z-10 transition-colors duration-500`}>
                    <div className={`w-16 h-2 ${isConnected ? 'bg-emerald-500' : 'bg-outline-variant/30'} rounded-sm`}></div>
                  </div>

                  {/* USB Cable */}
                  <div className="usb-cable absolute bottom-[-40px] flex flex-col items-center z-0">
                    {/* Metal Connector */}
                    <div className="w-16 h-12 bg-gradient-to-b from-gray-300 to-gray-400 border-2 border-gray-500 rounded-t-sm flex justify-center gap-2 pt-2">
                      <div className="w-2 h-2 bg-surface rounded-full"></div>
                      <div className="w-2 h-2 bg-surface rounded-full"></div>
                    </div>
                    {/* Plastic Housing */}
                    <div className="w-20 h-24 bg-stitch-primary rounded-md shadow-lg flex items-center justify-center flex-col gap-2">
                       <span className="material-symbols-outlined text-white/50 text-2xl">usb</span>
                    </div>
                    {/* Cord */}
                    <div className="w-4 h-24 bg-stitch-secondary"></div>
                  </div>
                  
                </div>
              </div>

              {/* Content */}
              <div className="space-y-3">
                <h1 className="text-3xl font-bold text-on-surface tracking-tight">Hardware Connection</h1>
                <p className="text-lg text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                  Please plug your biometric terminal into the USB port to establish a secure link.
                </p>
              </div>

              {/* Status Indicator */}
              <div className={`flex items-center justify-center gap-3 py-3 px-6 bg-white rounded-full border shadow-sm max-w-[280px] mx-auto transition-colors duration-500 ${isConnected ? 'border-emerald-500/50 bg-emerald-50' : 'border-outline-variant/50'}`}>
                {!isConnected ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-stitch-primary animate-pulse shadow-[0_0_8px_rgba(0,74,198,0.4)]"></span>
                ) : (
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                )}
                <span className={`text-sm font-medium tracking-wider ${isConnected ? 'text-emerald-700' : 'text-on-surface-variant'}`}>
                  {status}
                  {!isConnected && (
                    <>
                      <span className="ellipsis-dot">.</span>
                      <span className="ellipsis-dot">.</span>
                      <span className="ellipsis-dot">.</span>
                    </>
                  )}
                </span>
              </div>

              {/* Wi-Fi Sync Button for Mobile */}
              {!isConnected && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-3">Using a mobile phone?</p>
                  <button 
                    onClick={() => setShowWifiModal(true)}
                    className="w-full py-3 bg-blue-50 text-blue-600 font-semibold rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Wifi className="w-5 h-5" />
                    Sync via Wi-Fi Network
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Wi-Fi Sync Guide Modal */}
        {showWifiModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Wifi className="w-6 h-6 text-blue-600" />
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
    </>
  );
}

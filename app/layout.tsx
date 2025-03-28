'use client';

import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from "react";
import { metadata } from "./metadata"; // Import the metadata
import { usePathname } from "next/navigation"; // Import usePathname

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname(); // Get the current pathname

  // Detect mobile devices and adjust sidebar accordingly
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsExpanded(false);
      }
    };
    
    // Check on initial load
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
        
        {/* Favicon links */}
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon.png" />
        <link rel="shortcut icon" type="image/png" href="/favicon.png" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={metadata.metadataBase.toString()} />
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:image" content={metadata.metadataBase.toString() + '/favicon.png'} />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={metadata.metadataBase.toString()} />
        <meta property="twitter:title" content={metadata.title} />
        <meta property="twitter:description" content={metadata.description} />
        <meta property="twitter:image" content={metadata.metadataBase.toString() + '/favicon.png'} />
        
        {/* Add any other metadata tags you need */}
      </head>
      <body className="bg-white overflow-x-hidden">
        <div className="flex flex-col md:flex-row min-h-screen">
          {/* Only show Sidebar if not on the sign-in page */}
          {pathname !== "/sign-in" && (
            <Sidebar isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
          )}
          <main className={`flex-1 min-h-screen transition-all duration-300 ease-in-out
            ${isExpanded ? 'md:ml-64' : 'md:ml-20'}
            ${pathname !== "/sign-in" ? 'p-2 pb-20 sm:p-4 md:p-6 md:pb-6' : 'p-0'}`}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
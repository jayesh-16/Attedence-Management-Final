import { useState } from 'react';
import { Menu, X, Sun } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface NavbarProps {
  title?: string;
  className?: string;
}

export default function Navbar({ title = 'Dashboard', className }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className={cn(
      "py-4 px-6 flex items-center justify-between rounded-lg border-b-2 border-blue-500 shadow-md relative",
      "bg-gradient-to-r from-white to-gray-50",
      className
    )}>
      {/* Logo and title */}
      <div className="flex items-center space-x-4">
        <button 
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <X className="h-6 w-6 text-gray-600" />
          ) : (
            <Menu className="h-6 w-6 text-gray-600" />
          )}
        </button>
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold mr-2">
            A
          </div>
          <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
        </div>
      </div>

      {/* Navigation links - hidden on mobile unless menu is open */}
      <div className={cn(
        "absolute top-full left-0 right-0 bg-white z-20 shadow-lg md:shadow-none border-t border-gray-200 md:border-0",
        "md:static md:flex md:items-center md:bg-transparent",
        isMenuOpen ? "block" : "hidden md:flex"
      )}>
        <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-6 p-4 md:p-0">
          <Link href="/" className="text-gray-600 hover:text-blue-600 font-medium">
            Dashboard
          </Link>
          <Link href="/anylatics" className="text-gray-600 hover:text-blue-600 font-medium">
            Analytics
          </Link>
          <Link href="/addSubject" className="text-gray-600 hover:text-blue-600 font-medium">
            Attendance
          </Link>
          <Link href="/reports" className="text-gray-600 hover:text-blue-600 font-medium">
            Reports
          </Link>
        </div>
      </div>

      {/* Rotating Sun Icon with Gradient */}
      <div className="flex items-center">
        <div className="relative h-10 w-10 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse"></div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-300 to-orange-400 animate-spin-slow"></div>
          <Sun className="h-8 w-8 text-white animate-spin-slow relative z-10" />
        </div>
      </div>
    </nav>
  );
}

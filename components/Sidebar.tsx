'use client';

import React from "react";
import { useState, useEffect, createContext, useContext } from "react";
import { 
  Home, 
  Clock, 
  BarChart2, 
  FileText, 
  ChevronLeft, 
  LogOut,
  User,
  RefreshCw,
  Sun
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

// Create a context for global refresh functionality with proper types
type RefreshContextType = {
  triggerRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  realtimeStatus: 'connected' | 'disconnected' | 'error';
  setLastUpdated: (date: Date) => void;
  setRealtimeStatus: (status: 'connected' | 'disconnected' | 'error') => void;
};

export const RefreshContext = createContext<RefreshContextType>({
  triggerRefresh: () => {},
  isRefreshing: false,
  lastUpdated: null,
  realtimeStatus: 'disconnected',
  setLastUpdated: () => {},
  setRealtimeStatus: () => {}
});

export const useRefresh = () => useContext(RefreshContext);

// Define menu items with properly typed icons
interface MenuItem {
  id: number;
  title: string;
  icon: React.ElementType;
  path: string;
  gradient: string;
}

const menuItems: MenuItem[] = [
  { 
    id: 1, 
    title: "Dashboard", 
    icon: Home, 
    path: "/",
    gradient: "from-blue-500 to-indigo-600"
  },
  { 
    id: 2, 
    title: "Attendance", 
    icon: Clock, 
    path: "/addSubject",
    gradient: "from-green-500 to-emerald-600"
  },
  { 
    id: 3, 
    title: "Analytics", 
    icon: BarChart2, 
    path: "/anylatics",
    gradient: "from-purple-500 to-pink-500"
  },
  { 
    id: 4, 
    title: "Reports", 
    icon: FileText, 
    path: "/reports",
    gradient: "from-amber-500 to-orange-600"
  }
];

interface SidebarProps {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isExpanded, setIsExpanded }) => {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const router = useRouter();

  useEffect(() => {
    const getUserInfo = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User');
        setUserEmail(user.email || '');
      }
    };

    getUserInfo();
    
    // Set up real-time subscription
    const subscription = setupRealtimeSubscription();
    
    // Clean up real-time subscription when component unmounts
    return () => {
      const supabase = createClient();
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, []);

  // Set up real-time subscription to attendance changes
  const setupRealtimeSubscription = () => {
    const supabase = createClient();
    
    console.log('Setting up global real-time subscription in sidebar...');
    
    const subscription = supabase
      .channel('global-attendance-updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'attendance'
        }, 
        (payload) => {
          console.log('Global real-time attendance update received:', payload);
          
          // Update last updated time
          const now = new Date();
          setLastUpdated(now);
          
          // Show notification
          showUpdateNotification();
          
          // Trigger a flash animation on the refresh icon
          highlightRefreshIcon();
          
          // Broadcast refresh event
          broadcastRefresh();
        }
      )
      .subscribe((status) => {
        console.log('Global real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setRealtimeStatus('error');
          // Try to reconnect after a delay
          setTimeout(() => {
            console.log('Attempting to reconnect global real-time subscription...');
            subscription.unsubscribe();
            setupRealtimeSubscription();
          }, 5000);
        } else {
          setRealtimeStatus('disconnected');
        }
      });
      
    return subscription;
  };

  // Broadcast refresh event to all components
  const broadcastRefresh = () => {
    const refreshEvent = new CustomEvent('app:refresh', { 
      detail: { timestamp: new Date() } 
    });
    window.dispatchEvent(refreshEvent);
  };

  // Add function to trigger global refresh
  const triggerRefresh = async () => {
    // Set refreshing state
    setIsRefreshing(true);
    
    // Broadcast refresh event
    broadcastRefresh();
    
    // Show notification
    showUpdateNotification('Manual refresh triggered');
    
    // Update timestamp
    setLastUpdated(new Date());
    
    // Set timeout to reset the refreshing state
    setTimeout(() => {
      setIsRefreshing(false);
    }, 2000);
  };

  // Function to create and show update notification
  const showUpdateNotification = (message = 'Attendance data updated in real-time') => {
    // Remove any previous global notifications
    const oldNotification = document.getElementById('global-notification');
    if (oldNotification && oldNotification.parentNode) {
      oldNotification.parentNode.removeChild(oldNotification);
    }
    
    // Create or update the sidebar notification
    let sidebarNotification = document.getElementById('sidebar-notification');
    
    if (!sidebarNotification) {
      // Create the notification element
      sidebarNotification = document.createElement('div');
      sidebarNotification.id = 'sidebar-notification';
      sidebarNotification.className = `
        fixed z-50 shadow-lg transition-all duration-300 transform 
        bg-green-600 text-white px-4 py-3
        lg:left-0 lg:bottom-0 lg:w-64 lg:translate-y-full 
        left-0 bottom-16 w-full translate-y-full
        flex items-center
      `;
      
      // Create icon element
      const iconEl = document.createElement('span');
      iconEl.className = 'mr-2 text-xl';
      iconEl.innerHTML = '⟳';
      sidebarNotification.appendChild(iconEl);
      
      // Create message element
      const messageEl = document.createElement('span');
      messageEl.className = 'flex-1 text-sm';
      sidebarNotification.appendChild(messageEl);
      
      // Create close button
      const closeBtn = document.createElement('button');
      closeBtn.className = 'ml-2 text-white hover:text-gray-200';
      closeBtn.innerHTML = '×';
      closeBtn.onclick = () => {
        sidebarNotification?.classList.remove('lg:translate-y-0', 'translate-y-0');
        sidebarNotification?.classList.add('lg:translate-y-full', 'translate-y-full');
        
        // Remove after animation completes
        setTimeout(() => {
          if (sidebarNotification && sidebarNotification.parentNode) {
            sidebarNotification.parentNode.removeChild(sidebarNotification);
          }
        }, 300);
      };
      sidebarNotification.appendChild(closeBtn);
      
      // Add to document
      document.body.appendChild(sidebarNotification);
    }
    
    // Update message
    const messageEl = sidebarNotification.querySelector('span:nth-child(2)');
    if (messageEl) {
      messageEl.textContent = message;
    }
    
    // Show notification
    setTimeout(() => {
      sidebarNotification?.classList.remove('lg:translate-y-full', 'translate-y-full');
      sidebarNotification?.classList.add('lg:translate-y-0', 'translate-y-0');
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        if (sidebarNotification) {
          sidebarNotification.classList.remove('lg:translate-y-0', 'translate-y-0');
          sidebarNotification.classList.add('lg:translate-y-full', 'translate-y-full');
          
          // Remove after animation completes
          setTimeout(() => {
            if (sidebarNotification && sidebarNotification.parentNode) {
              sidebarNotification.parentNode.removeChild(sidebarNotification);
            }
          }, 300);
        }
      }, 5000);
    }, 100);
  };

  // Function to highlight the refresh icon
  const highlightRefreshIcon = () => {
    const refreshIcon = document.getElementById('refresh-icon');
    if (refreshIcon) {
      refreshIcon.classList.add('highlight-pulse');
      setTimeout(() => {
        refreshIcon.classList.remove('highlight-pulse');
      }, 2000);
    }
  };

  // Function to handle sign out
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <RefreshContext.Provider value={{ 
      triggerRefresh, 
      isRefreshing, 
      lastUpdated, 
      realtimeStatus,
      setLastUpdated,
      setRealtimeStatus
    }}>
      {/* Desktop Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 h-full bg-white border-r border-gray-200 shadow-md z-40
          transition-all duration-300 ease-in-out
          ${isExpanded ? "w-64" : "w-20"}
          hidden lg:block
        `}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className={`flex items-center ${!isExpanded && "justify-center w-full"}`}>
            {isExpanded ? (
              <div className="flex items-center">
                <div className="relative h-10 w-10 flex items-center justify-center mr-2">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse"></div>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-300 to-orange-400 animate-spin-slow"></div>
                  <Sun className="h-8 w-8 text-white animate-spin-slow relative z-10" />
                </div>
                <h1 className="text-xl font-semibold text-gray-800">Attendance</h1>
              </div>
            ) : (
              <div className="relative h-10 w-10 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-300 to-orange-400 animate-spin-slow"></div>
                <Sun className="h-8 w-8 text-white animate-spin-slow relative z-10" />
              </div>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <ChevronLeft
              size={20}
              className={`transform transition-transform duration-300 ${
                !isExpanded && "rotate-180"
              }`}
            />
          </button>
        </div>

        <div className={`p-4 border-b border-gray-200 ${!isExpanded && "flex justify-center"}`}>
          <div className={`flex items-center ${!isExpanded && "justify-center"}`}>
            <button
              onClick={triggerRefresh}
              disabled={isRefreshing}
              id="refresh-icon"
              className={`
                relative p-2 rounded-full 
                ${realtimeStatus === 'connected' ? 'bg-green-100 text-green-600' : 
                 realtimeStatus === 'error' ? 'bg-red-100 text-red-500' : 
                 'bg-gray-100 text-gray-400'}
                ${isRefreshing ? 'opacity-50' : 'hover:bg-opacity-80'}
                transition-all duration-200
              `}
            >
              <RefreshCw 
                size={isExpanded ? 20 : 24} 
                className={isRefreshing ? 'animate-spin' : ''} 
              />
            </button>
            
            <span 
              className={`
                inline-block h-2 w-2 rounded-full absolute top-1 right-1
                ${realtimeStatus === 'connected' ? 'bg-green-500' : 
                 realtimeStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'}
                ${realtimeStatus === 'connected' ? 'animate-ping-slow' : ''}
              `}
            ></span>
            
            {isExpanded && (
              <div className="ml-3 flex-1 text-xs">
                <div className="font-medium text-gray-700">
                  {realtimeStatus === 'connected' ? 'Real-time active' : 
                   realtimeStatus === 'error' ? 'Connection error' : 
                   'Connecting...'}
                </div>
                {lastUpdated && (
                  <div className="text-gray-500">
                    Updated: {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.title;
            
            return (
              <div key={item.id} className="relative">
                {isActive && (
                  <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${item.gradient}`}></div>
                )}
                <button
                  onClick={() => {
                    setActiveSection(item.title);
                    router.push(item.path);
                  }}
                  className={`
                    flex items-center w-full p-3 rounded-lg transition-all duration-200
                    ${isActive 
                      ? "bg-blue-50 text-blue-600 shadow-sm" 
                      : "hover:bg-gray-50 text-gray-700"}
                    ${isActive && !isExpanded ? "border-l-4 border-blue-500" : ""}
                  `}
                >
                  <div className={`
                    flex items-center justify-center 
                    ${isActive ? `text-${item.gradient.split(' ')[0].replace('from-', '')}` : 'text-gray-500'}
                  `}>
                    <Icon size={24} />
                  </div>
                  {isExpanded && (
                    <span className={`ml-3 font-medium ${isActive ? 'text-blue-600' : 'text-gray-700'}`}>
                      {item.title}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <div className={`flex items-center mb-4 ${!isExpanded && "justify-center"}`}>
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm">
              <User size={20} />
            </div>
            {isExpanded && (
              <div className="ml-3">
                <p className="font-medium text-gray-800">{userName}</p>
                <p className="text-xs text-gray-500 truncate max-w-[150px]">{userEmail}</p>
              </div>
            )}
          </div>
          <button 
            onClick={handleSignOut}
            className={`
              flex items-center w-full p-3 rounded-lg 
              text-red-500 hover:bg-red-50 transition-colors duration-200
              ${!isExpanded && "justify-center"}
            `}
          >
            <LogOut size={20} />
            {isExpanded && <span className="ml-3 font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
        <div className="flex justify-around items-center h-16">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.title;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.title);
                  router.push(item.path);
                }}
                className={`
                  p-3 rounded-full transition-all duration-200
                  ${isActive 
                    ? `bg-gradient-to-r ${item.gradient} text-white shadow-md` 
                    : "text-gray-600 hover:bg-gray-100"}
                `}
                aria-label={item.title}
              >
                <Icon size={24} />
              </button>
            );
          })}
          
          {/* Add refresh button to mobile nav */}
          <button
            onClick={triggerRefresh}
            disabled={isRefreshing}
            className={`
              p-3 rounded-full transition-all duration-200
              ${realtimeStatus === 'connected' 
                ? 'bg-green-100 text-green-600' 
                : realtimeStatus === 'error' 
                  ? 'bg-red-100 text-red-500' 
                  : 'bg-gray-100 text-gray-400'}
              ${isRefreshing ? 'opacity-50' : ''}
            `}
            aria-label="Refresh Data"
          >
            <RefreshCw size={24} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={handleSignOut}
            className="p-3 rounded-full text-red-500 hover:bg-red-50"
            aria-label="Sign Out"
          >
            <LogOut size={24} />
          </button>
        </div>
      </nav>
      
      {/* Add custom ping animation styles */}
      <style jsx global>{`
        @keyframes ping-slow {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.5;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .highlight-pulse {
          animation: highlight-pulse 1s ease-in-out;
        }
        
        @keyframes highlight-pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.3);
          }
        }
      `}</style>
    </RefreshContext.Provider>
  );
};

export default Sidebar;
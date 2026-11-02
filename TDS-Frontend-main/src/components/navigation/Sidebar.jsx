// src/components/navigation/Sidebar.js
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  HomeIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserGroupIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === 'administrator';
  // Base path for dashboard-specific links (if any remain needed)
  const basePath = isAdmin ? '/admin-dashboard' : '/member-dashboard';

  // --- CORRECTED Navigation Array ---
  const navigation = [
    // Example: Dashboard still uses basePath
    { name: 'Dashboard', href: basePath, icon: HomeIcon },
    // CORRECTED: Profile link now points directly to /profile
    { name: 'Profile', href: '/profile', icon: UserCircleIcon },
    ...(isAdmin
      ? [
          // Example: Assuming Team Management might be nested or specific
          // Keep basePath if these are truly sub-routes of the dashboard
          // If they become top-level routes like /team, change href accordingly
          { name: 'Team', href: `${basePath}/team`, icon: UserGroupIcon }, // Check if route exists
          { name: 'Analytics', href: `${basePath}/analytics`, icon: ChartBarIcon }, // Check if route exists
        ]
      : []),
    // Example: Assuming Projects might be nested or specific
    { name: 'Projects', href: `${basePath}/projects`, icon: DocumentTextIcon }, // Check if route exists
    // Example: Assuming Settings might be nested or specific
    { name: 'Settings', href: `${basePath}/settings`, icon: Cog6ToothIcon }, // Check if route exists
  ];
  // --- End Correction ---


  const isActive = (path) => location.pathname === path;

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  // Rest of the component remains the same...

  return (
    <>
      {/* Mobile Menu Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleMobileSidebar}
          className="p-2 rounded-md bg-white shadow-md text-gray-700 hover:text-[#F68B1F] focus:outline-none"
        >
          {isMobileOpen ? (
            <XMarkIcon className="h-6 w-6" />
          ) : (
            <Bars3Icon className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={toggleMobileSidebar}>
          <div
            className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-full flex flex-col">
              {/* Logo */}
              <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b">
                <Link to="/" className="text-base leading-tight font-bold text-[#F68B1F] max-w-[85%]">
                  Boiler-Room — Workflow Design Demo
                </Link>
                <button
                  onClick={toggleMobileSidebar}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* User Info */}
              <div className="px-6 py-4 border-b border-gray-200">
                 <div className="flex items-center">
                   <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#F68B1F]/10 flex items-center justify-center border border-[#F68B1F]/20">
                     <UserCircleIcon className="h-6 w-6 text-[#F68B1F]" />
                   </div>
                   <div className="ml-3">
                     <p className="text-sm font-medium text-gray-900">{user.name}</p>
                     <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                   </div>
                 </div>
              </div>

              {/* Navigation */}
              <div className="flex-1 overflow-y-auto px-4 py-2">
                <nav className="space-y-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href} // Uses the corrected href
                      className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg ${
                        isActive(item.href)
                          ? 'bg-[#F68B1F]/10 text-[#F68B1F]'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-[#F68B1F]'
                      }`}
                      onClick={toggleMobileSidebar} // Close menu on navigation
                    >
                      <item.icon
                        className={`mr-3 h-5 w-5 ${
                          isActive(item.href) ? 'text-[#F68B1F]' : 'text-gray-500 group-hover:text-[#F68B1F]'
                        }`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Logout */}
              <div className="px-4 py-4 border-t border-gray-200">
                <button
                  onClick={() => { logout(); toggleMobileSidebar(); }} // Ensure menu closes on logout
                  className="w-full group flex items-center px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg"
                >
                  <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5 text-red-500 group-hover:text-red-600" aria-hidden="true" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-30 bg-white border-r border-gray-200 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo and Collapse Toggle */}
         <div className={`px-4 py-5 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
           <Link to="/" aria-label="Boiler-Room — Workflow Design Demo" className={`font-bold text-[#F68B1F] transition-opacity duration-200 ${isCollapsed ? 'text-lg' : 'text-base leading-tight max-w-[85%]'}`}>
             {isCollapsed ? 'BR' : 'Boiler-Room — Workflow Design Demo'}
           </Link>
           <button
              onClick={toggleSidebar}
              className={`p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none ${isCollapsed ? 'absolute -right-3 top-16 bg-white border shadow-sm' : ''} `} // Position button when collapsed
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
           >
             {isCollapsed ? (
                <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
             ) : (
                <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
             )}
           </button>
         </div>

        {/* User Info (only when expanded) */}
        {!isCollapsed && (
          <div className="px-4 py-4 border-t border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#F68B1F]/10 flex items-center justify-center border border-[#F68B1F]/20">
                <UserCircleIcon className="h-6 w-6 text-[#F68B1F]" />
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize truncate">{user.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-4">
          <nav className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href} // Uses the corrected href
                title={isCollapsed ? item.name : ''} // Show tooltip when collapsed
                className={`group flex items-center px-2 py-3 text-sm font-medium rounded-lg ${
                  isActive(item.href)
                    ? 'bg-[#F68B1F]/10 text-[#F68B1F]'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-[#F68B1F]'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <item.icon
                  className={`${isCollapsed ? 'h-6 w-6' : 'mr-3 h-5 w-5'} flex-shrink-0 ${ // Added flex-shrink-0
                    isActive(item.href) ? 'text-[#F68B1F]' : 'text-gray-500 group-hover:text-[#F68B1F]'
                  }`}
                  aria-hidden="true"
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            ))}
          </nav>
        </div>

        {/* Logout */}
        <div className={`px-2 py-4 border-t border-gray-200`}>
          <button
            onClick={logout}
            title={isCollapsed ? 'Logout' : ''}
            className={`group flex items-center w-full px-2 py-3 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <ArrowLeftOnRectangleIcon className={`${isCollapsed ? 'h-6 w-6' : 'mr-3 h-5 w-5'} flex-shrink-0 text-red-500 group-hover:text-red-600`} aria-hidden="true" />
            {!isCollapsed && <span className="truncate">Logout</span>}
          </button>
        </div>

      </div>

      {/* Content Margin Adjustment based on sidebar state */}
      <div className={`pt-16 lg:pt-0 transition-all duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* The main page content will go here, pushed by the sidebar */}
      </div>
    </>
  );
}

export default Sidebar;

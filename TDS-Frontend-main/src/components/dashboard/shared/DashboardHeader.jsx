// src/components/dashboard/shared/DashboardHeader.js
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth'; // Adjusted path
import {
    ArrowPathIcon,
    ArrowLeftOnRectangleIcon,
    UserCircleIcon
} from '@heroicons/react/24/outline';

// Pass handleRefresh prop if needed by the specific page using the header
function DashboardHeader({ handleRefresh }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  // --- Determine the correct dashboard path based on user role ---
  let dashboardPath = '/'; // Default fallback
  if (user) {
      dashboardPath = user.role === 'administrator' ? '/admin-dashboard' : '/member-dashboard';
  }
  // --- End Path Determination ---

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side: App Name (links to dashboard) and User Info */}
          <div className="flex items-center min-w-0">
            {/* UPDATED Link destination */}
            <Link to={dashboardPath} className="min-w-0 flex items-center mr-2 sm:mr-4">
              <span className="text-[#F68B1F] text-sm sm:text-base lg:text-xl leading-tight font-bold">Boiler-Room — Workflow Design Demo</span>
            </Link>
            {user && (
              <div className="hidden lg:flex items-center border-l pl-6 border-gray-200"> {/* Keep the neutral brand readable on smaller screens. */}
                 <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                    <UserCircleIcon className="h-5 w-5 text-gray-600" />
                 </div>
                 <div>
                    <div className="text-sm font-medium text-gray-800">{user.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                 </div>
              </div>
            )}
          </div>

          {/* Right side: Actions */}
          <div className="flex-shrink-0 flex items-center space-x-2 sm:space-x-4"> {/* Keep authentication actions available on small screens. */}
            {/* Profile Link */}
            <Link
                to="/profile" // Link to the separate profile page route
                title="Profile" // Add title for accessibility
                className={`p-2 sm:px-3 sm:py-2 text-sm rounded-md transition-colors duration-200 flex items-center ${
                    location.pathname === '/profile'
                    ? 'bg-[#F68B1F]/10 text-[#F68B1F] font-medium'
                    : 'text-gray-600 hover:text-[#F68B1F] hover:bg-[#F68B1F]/10'
                }`}
            >
                <UserCircleIcon className="h-5 w-5 sm:mr-1" />
                <span className="hidden sm:inline">Profile</span> {/* Hide text on small screens */}
            </Link>

            {/* Refresh Button (Optional) */}
            {handleRefresh && (
                <button
                    onClick={handleRefresh}
                    title="Refresh Data" // Add title
                    className="p-2 sm:px-3 sm:py-2 text-sm text-gray-600 rounded-md hover:text-[#F68B1F] hover:bg-[#F68B1F]/10 focus:outline-none focus:ring-2 focus:ring-[#F68B1F] transition-colors duration-200 flex items-center"
                >
                    <ArrowPathIcon className="h-5 w-5 sm:mr-1" />
                     <span className="hidden sm:inline">Refresh</span> {/* Hide text */}
                </button>
            )}

            {/* Logout Button */}
            <button
              onClick={logout}
              title="Logout" // Add title
              className="p-2 sm:px-3 sm:py-2 text-sm text-gray-600 rounded-md hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200 flex items-center"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5 sm:mr-1" />
               <span className="hidden sm:inline">Logout</span> {/* Hide text */}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default DashboardHeader;

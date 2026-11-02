// src/pages/MemberDashboardPage.js
// Updated to use DashboardHeader, removed custom nav and sidebar layout.

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import MemberDashboard from '../components/dashboard/member/MemberDashboard';
import DashboardHeader from '../components/dashboard/shared/DashboardHeader';
import { useNavigate } from 'react-router-dom';
import { FolderIcon, LockClosedIcon, EyeIcon, UserCircleIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';

import { getAssignedProjects } from '../services/projects';

function MemberDashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [assignedProjects, setAssignedProjects] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [errorProjects, setErrorProjects] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const isTransitioning = false;

    const fetchProjects = useCallback(async () => {
        if (!user || !user.userId) {
          setLoadingProjects(false);
          return;
        }
        setLoadingProjects(true);
        setErrorProjects(null);
      
        try {
          const data = await getAssignedProjects(user.userId);
          setAssignedProjects(data);
        } catch (error) {
          setErrorProjects(error.message || 'Failed to load your projects');
        } finally {
          setLoadingProjects(false);
        }
      }, [user]);

    useEffect(() => {
        fetchProjects();
    }, [user, refreshKey, fetchProjects]);

    const handleRefresh = () => {
        if (isTransitioning) return;
        setRefreshKey(prevKey => prevKey + 1);
    };

    const handleProfileClick = () => {
        navigate('/profile');
    };

    if (!user || !['developer'].includes(user.role)) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
                    <p className="mt-2 text-gray-600">You must be logged in as a member to view this page.</p>
                    <a
                        href="/"
                        className="mt-6 inline-block bg-[#F68B1F] text-white px-4 py-2 rounded-lg hover:bg-[#E57D18] transition duration-200"
                    >
                        Return to Home
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <DashboardHeader handleRefresh={handleRefresh} />
            {/* Header */}
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <div className="h-8 w-8 rounded-full bg-[#F68B1F] flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                    {user.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-gray-900">{user.name}</h1>
                                <p className="text-sm text-gray-500">Developer</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button 
                                onClick={handleProfileClick}
                                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <UserCircleIcon className="h-5 w-5" />
                                <span className="text-sm font-medium">Profile</span>
                            </button>
                            <button 
                                onClick={logout}
                                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                                <span className="text-sm font-medium">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center">
                            <div className="p-3 rounded-xl bg-blue-50">
                                <FolderIcon className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">My Projects</p>
                                <p className="text-2xl font-bold text-gray-900">{assignedProjects.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center">
                            <div className="p-3 rounded-xl bg-green-50">
                                <LockClosedIcon className="h-6 w-6 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Project scope</p>
                                <p className="text-base font-semibold text-gray-900">Assigned projects only</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center">
                            <div className="p-3 rounded-xl bg-orange-50">
                                <EyeIcon className="h-6 w-6 text-orange-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Graph access</p>
                                <p className="text-base font-semibold text-gray-900">Read-only designs</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Projects Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900">My Projects</h2>
                    </div>
                    <div className="p-6">
                        <MemberDashboard
                            assignedProjects={assignedProjects}
                            loadingProjects={loadingProjects || isTransitioning}
                            errorProjects={errorProjects}
                        />
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                    </div>
                    <div className="p-6">
                        <div className="text-center text-gray-500 py-8">
                            <p>No recent activity to display</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MemberDashboardPage;

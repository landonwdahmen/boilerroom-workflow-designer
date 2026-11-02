// src/components/dashboard/member/MemberDashboard.js
import { useState } from 'react';
import { DocumentTextIcon, ExclamationCircleIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/outline';
import ProjectCard from '../../ProjectCard';

function MemberDashboard({ assignedProjects, loadingProjects, errorProjects }) {
  const [selectedFilter, setSelectedFilter] = useState('all');
  
  // Filter projects by status
  const filteredProjects = assignedProjects && assignedProjects.filter(project => {
    if (selectedFilter === 'all') return true;
    return project.status === selectedFilter;
  });

  // Get stats about the projects
  const getProjectStats = () => {
    if (!assignedProjects || !Array.isArray(assignedProjects)) {
      return { total: 0, active: 0, paused: 0 };
    }
    
    return {
      total: assignedProjects.length,
      active: assignedProjects.filter(p => p.status === 'active').length,
      paused: assignedProjects.filter(p => p.status === 'paused').length,
    };
  };
  
  const stats = getProjectStats();

  return (
    <div>
      {/* Project Stats Banner */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-[#F68B1F] to-[#6D6E71]">
          <h2 className="text-xl font-semibold text-white">My Projects</h2>
          <p className="mt-1 text-white/80">Manage and track your assigned projects</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-[#F68B1F]/10 rounded-xl p-4 flex items-center">
              <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#F68B1F]/20">
                <DocumentTextIcon className="h-6 w-6 text-[#F68B1F]" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-xl p-4 flex items-center">
              <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm border border-green-200">
                <PlayIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
            </div>
            
            <div className="bg-amber-50 rounded-xl p-4 flex items-center">
              <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm border border-amber-200">
                <PauseIcon className="h-6 w-6 text-amber-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Paused</p>
                <p className="text-2xl font-bold text-amber-600">{stats.paused}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filter Controls */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-800">Filter Projects</h3>
        </div>
        
        <div className="p-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedFilter === 'all' 
                  ? 'bg-[#F68B1F] text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              All Projects
            </button>
            <button
              onClick={() => setSelectedFilter('active')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedFilter === 'active' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setSelectedFilter('paused')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedFilter === 'paused' 
                  ? 'bg-amber-500 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Paused
            </button>
          </div>
        </div>
      </div>
      
      {/* Projects List */}
      {loadingProjects ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F68B1F] mb-4"></div>
            <p className="text-lg font-medium text-gray-900">Loading Projects...</p>
            <p className="text-gray-500 mt-2">Please wait while we retrieve your projects.</p>
          </div>
        </div>
      ) : errorProjects ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-800">Error Loading Projects</h3>
          <p className="text-red-700 mt-2">{errorProjects}</p>
          <button
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition duration-200"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      ) : filteredProjects && filteredProjects.length > 0 ? (
        <div className="space-y-6">
          {/* Project heading based on filter */}
          <h3 className="text-lg font-medium text-gray-800 px-1">
            {selectedFilter === 'all' ? 'All Projects' : 
             selectedFilter === 'active' ? 'Active Projects' : 'Paused Projects'}
            <span className="text-sm font-normal text-gray-500 ml-2">({filteredProjects.length})</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                showAssigned={false}
                onDelete={null}
                onPause={null}
                onPlay={null}
                onRename={null}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="h-24 w-24 bg-[#F68B1F]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <DocumentTextIcon className="h-12 w-12 text-[#F68B1F]" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No Projects Found</h3>
          <p className="text-gray-500 mt-2">
            {selectedFilter === 'all' 
              ? "You don't have any projects assigned to you yet."
              : `You don't have any ${selectedFilter} projects at the moment.`}
          </p>
          {selectedFilter !== 'all' && (
            <button
              onClick={() => setSelectedFilter('all')}
              className="mt-4 bg-[#F68B1F] text-white px-4 py-2 rounded-lg hover:bg-[#E57D18] transition duration-200"
            >
              View All Projects
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default MemberDashboard;

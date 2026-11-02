// src/pages/AdminDashboardPage.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  ChartBarIcon, UserGroupIcon, DocumentTextIcon, PlusIcon
} from '@heroicons/react/24/outline';

import CompanyCodeDisplay from '../components/dashboard/admin/CompanyCodeDisplay';
import MemberList from '../components/dashboard/admin/MemberList';
import CreateProjectForm from '../components/dashboard/admin/CreateProjectForm';
import ProjectCard from '../components/ProjectCard';
import DashboardHeader from '../components/dashboard/shared/DashboardHeader';

import { getUsers, getProjects, deleteProject } from '../services/projects';

function AdminDashboardPage() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('all');
  const [error, setError] = useState('');


  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [users, scopedProjects] = await Promise.all([getUsers(), getProjects()]);
      setMembers(users); setProjects(scopedProjects);
    } catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  }, []);
  const handleDeleteProject = async (projectId) => {
    if (deletingId || !window.confirm('Delete this project? This cannot be undone.')) return;
    setDeletingId(projectId); setError('');
    try {
      await deleteProject(projectId);
      setProjects(previous => previous.filter(project => project.id !== projectId));
    } catch (failure) { setError(failure.message); }
    finally { setDeletingId(null); }
  };
  useEffect(() => { load(); }, [load]);

  if (!user || user.role !== 'administrator') return <div className="p-4">Access Denied.</div>;


  const metrics = {
    activeProjects: projects.filter(p => p.status === 'active').length,
    totalProjects: projects.length,
    totalMembers: members.length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader handleRefresh={load} />
      {loading && <p role="status">Loading organization data…</p>}
      <main className="p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name}</h1>
              <p className="mt-1 text-gray-500">Managing {user?.organizationName || 'an organization'}</p>
            </div>
            <CompanyCodeDisplay />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <StatCard title="Active Projects" value={metrics.activeProjects} Icon={ChartBarIcon} />
          <StatCard title="Team Members" value={metrics.totalMembers} Icon={UserGroupIcon} />
          <StatCard title="Total Projects" value={metrics.totalProjects} Icon={DocumentTextIcon} />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Projects</h2>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="border rounded-md px-2 py-1 text-sm"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          <button
            className="mb-6 bg-white border-2 border-dashed w-full py-4 rounded-lg hover:border-orange-400"
            disabled={loading} onClick={() => setShowCreate(true)}
          >
            <PlusIcon className="h-5 w-5 inline mr-2 text-orange-600" />
            Create New Project
          </button>

          {showCreate && <CreateProjectForm members={members}
            onCancel={() => setShowCreate(false)}
            onProjectCreated={() => { setShowCreate(false); load(); }} />}
          <p className="mb-4 text-sm text-gray-600">Assignment is selected when creating a project. Reassignment, rename and status updates are unavailable.</p>
          {!loading && projects.length === 0 && <p>No projects yet.</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects
              .filter(p =>
                projectFilter === 'all' ? true : p.status === projectFilter
              )
              .map(project => (
                 <ProjectCard
                  key={project.id}
                  project={{ ...project, assignedMember: members.find(member => member.id === project.assignedTo) }}
                  showAssigned
                  deleting={deletingId === project.id}
                  onDelete={handleDeleteProject}
                />
              ))}
          </div>
        </div>

        <section className="mt-8 text-left"><h2 className="text-lg font-semibold">Organization users</h2><MemberList members={members} /></section>
        {error && <div role="alert" className="mt-4 p-4 bg-red-50 text-red-700 rounded">{error}</div>}
      </main>
    </div>
  );
}

const StatCard = ({ title, value, Icon }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
    <div className="bg-[#F68B1F]/10 p-3 rounded-lg">
      <Icon className="h-6 w-6 text-[#F68B1F]" />
    </div>
  </div>
);

export default AdminDashboardPage;

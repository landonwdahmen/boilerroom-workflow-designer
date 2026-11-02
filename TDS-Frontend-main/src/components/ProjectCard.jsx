import { useState } from 'react';
import { 
  DocumentTextIcon, 
  TrashIcon, 
  PauseIcon, 
  PlayIcon, 
  UserCircleIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  CalendarIcon,
  ArrowRightIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function ProjectCard({ project, showAssigned = false, onDelete, onPause, onPlay, onRename, deleting = false }) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(project.name);

  // Check if user has permission to manage the project
  const canManageProject = user?.role === 'administrator';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <span className="w-2 h-2 mr-1 bg-green-400 rounded-full"></span>
            Active
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <span className="w-2 h-2 mr-1 bg-amber-400 rounded-full"></span>
            Paused
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <span className="w-2 h-2 mr-1 bg-gray-400 rounded-full"></span>
            {status || 'Unknown'}
          </span>
        );
    }
  };

  const handleRenameSubmit = () => {
    if (newName.trim() && newName !== project.name) {
      onRename(project.id, newName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelRename = () => {
    setNewName(project.name);
    setIsEditing(false);
  };

  const handleProjectClick = (e) => {
    if (project.status === 'paused' && user.role === 'developer') {
      e.preventDefault();
      alert('This project is currently paused. Please contact your administrator to resume it.');
    }
  };

  return (
    <div className="group bg-white overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 flex flex-col h-full transform hover:-translate-y-1">
      {/* Header */}
      <div className={`p-5 flex items-center justify-between border-b border-gray-100 ${
        project.status === 'active' 
          ? 'bg-gradient-to-r from-[#F68B1F]/10 to-white' 
          : 'bg-gradient-to-r from-gray-100 to-white'
      }`}>
        {isEditing ? (
          <div className="flex items-center space-x-2 w-full">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-[#F68B1F] focus:ring-[#F68B1F]"
              autoFocus
            />
            <button onClick={handleRenameSubmit} className="p-1.5 text-green-600 hover:bg-green-50 rounded-full">
              <CheckIcon className="h-4 w-4" />
            </button>
            <button onClick={handleCancelRename} className="p-1.5 text-red-600 hover:bg-red-50 rounded-full">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-[#F68B1F]/10 rounded-lg">
                <DocumentTextIcon className="h-5 w-5 text-[#F68B1F]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-1 pr-2">{project.name}</h3>
            </div>
            <div>{getStatusBadge(project.status)}</div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-none">
          {project.description || 'No description provided for this project.'}
        </p>

        {showAssigned && (
          <div className="mt-1 mb-3 flex-none">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-shrink-0 h-9 w-9 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-200">
                <UserCircleIcon className="h-5 w-5 text-[#F68B1F]" />
              </div>
              <div className="ml-3">
                {project.assignedMember?.name ? (
                  <>
                    <p className="text-sm font-medium text-gray-900">
                      {project.assignedMember.name}
                      {project.assignedMember.role === 'administrator' && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-[#F68B1F]/10 text-[#F68B1F] rounded">
                          administrator
                        </span>
                      )}
                    </p>
                    {project.assignedMember.email && (
                      <p className="text-xs text-gray-500">{project.assignedMember.email}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm font-medium text-gray-500">No user assigned</p>
                )}
              </div>
            </div>
          </div>
        )}

        {project.dueDate && (
          <div className="mt-1 flex-none">
            <p className="text-xs text-gray-500 flex items-center">
              <CalendarIcon className="w-3.5 h-3.5 mr-1" />
              Due: {new Date(project.dueDate).toLocaleDateString()}
            </p>
          </div>
        )}

        <div className="flex-grow"></div>

        {/* Actions */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between flex-none">
          <Link
            to={`/playground/${project.id}`}
            onClick={handleProjectClick}
            className={`inline-flex items-center text-[#F68B1F] hover:text-[#E57D18] text-sm font-medium transition-colors ${
              project.status === 'paused' && user.role === 'developer' ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <span>Playground</span>
            {project.status === 'paused' && user.role === 'developer' ? (
              <LockClosedIcon className="ml-1 w-4 h-4" />
            ) : (
              <ArrowRightIcon className="ml-1 w-4 h-4" />
            )}
          </Link>

          <div className="flex items-center space-x-1">
            {/* Rename */}
            {onRename && !isEditing && canManageProject && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-gray-500 hover:text-[#F68B1F] hover:bg-[#F68B1F]/10 rounded transition-colors"
                title="Rename Project"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            )}

            {/* Pause / Resume */}
            {onPause && onPlay && canManageProject && (
              project.status === 'paused' ? (
                <button
                  onClick={() => onPlay(project.id)}
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                  title="Resume Project"
                >
                  <PlayIcon className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => onPause(project.id)}
                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                  title="Pause Project"
                >
                  <PauseIcon className="h-4 w-4" />
                </button>
              )
            )}

            {/* Delete (now visible to anyone who canManageProject) */}
            {onDelete && canManageProject && (
              <button
                disabled={deleting} onClick={() => onDelete(project.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete Project"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectCard;

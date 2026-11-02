// src/components/dashboard/member/AssignedProjectItem.js
import { 
  ClockIcon, 
  DocumentTextIcon, 
  CheckIcon, 
  ChevronRightIcon 
} from '@heroicons/react/24/outline';

function AssignedProjectItem({ project, onClick }) {
  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'low':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-green-100 text-green-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'in-progress':
        return <DocumentTextIcon className="h-5 w-5 text-blue-500" />;
      case 'completed':
        return <CheckIcon className="h-5 w-5 text-green-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const truncateText = (text, maxLength) => {
    if (!text) return 'No description';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={() => onClick && onClick(project)}
    >
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {truncateText(project.description, 100)}
            </p>
          </div>
          <ChevronRightIcon className="h-5 w-5 text-gray-400" />
        </div>
        
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center">
            {getStatusIcon(project.status)}
            <span className="ml-1.5 text-sm font-medium text-gray-700">
              {project.status ? project.status.charAt(0).toUpperCase() + project.status.slice(1) : 'Pending'}
            </span>
          </div>
          
          <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${getPriorityClass(project.priority)}`}>
            {project.priority || 'Normal'}
          </span>
          
          {project.dueDate && (
            <span className="text-sm text-gray-500">
              Due: {formatDate(project.dueDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default AssignedProjectItem;
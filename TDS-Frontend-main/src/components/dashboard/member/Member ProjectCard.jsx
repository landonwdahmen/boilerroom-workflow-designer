// src/components/dashboard/member/MemberProjectCard.js
import { 
  DocumentTextIcon, 
  CalendarIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

function MemberProjectCard({ project }) {
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

    return (
        <div className="group bg-white overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 flex flex-col h-full transform hover:-translate-y-1">
            {/* Card Header with Status */}
            <div className={`p-5 flex items-center justify-between border-b border-gray-100 ${
                project.status === 'active' 
                    ? 'bg-gradient-to-r from-[#F68B1F]/10 to-white' 
                    : 'bg-gradient-to-r from-gray-100 to-white'
            }`}>
                <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-[#F68B1F]/10 rounded-lg">
                        <DocumentTextIcon className="h-5 w-5 text-[#F68B1F]" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1 pr-2">{project.name}</h3>
                </div>
                <div>
                    {getStatusBadge(project.status)}
                </div>
            </div>
            
            {/* Card Content */}
            <div className="p-5 flex-1 flex flex-col">
                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-none">
                    {project.description || 'No description provided for this project.'}
                </p>
                
                {/* Due Date if available */}
                {project.dueDate && (
                    <div className="mt-auto pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500 flex items-center">
                            <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                            Due: {new Date(project.dueDate).toLocaleDateString()}
                        </p>
                    </div>
                )}
                
                <div className="flex-grow"></div>
                
                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end">
                    <Link
                        to={`/playground/${project.id}`}
                        className="inline-flex items-center text-[#F68B1F] hover:text-[#E57D18] text-sm font-medium transition-colors"
                    >
                        <span>Open Playground</span>
                        <ArrowRightIcon className="ml-1 w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default MemberProjectCard;
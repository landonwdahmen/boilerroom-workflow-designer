// src/components/dashboard/admin/MemberList.js
import { useState, useEffect } from 'react';
import { UserCircleIcon, EnvelopeIcon, PhoneIcon, CalendarIcon } from '@heroicons/react/24/outline';

function MemberList({ members }) {
  const [isVisible, setIsVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!isVisible) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-pulse h-full w-full bg-gray-100 rounded-lg"></div>
      </div>
    );
  }
  
  if (!members || !Array.isArray(members) || members.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="bg-[#F68B1F]/10 rounded-full h-16 w-16 mx-auto flex items-center justify-center mb-4">
          <UserCircleIcon className="h-8 w-8 text-[#F68B1F]" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Members Yet</h3>
        <p className="text-gray-500">No team members have joined your organization yet.</p>
        <p className="text-gray-500 text-sm mt-2">Issue email-bound invitations to invite developers to your team.</p>
      </div>
    );
  }

  // Filter members based on search term
  const filteredMembers = members.filter(member => {
    const searchString = searchTerm.toLowerCase();
    return (
      (member.name && member.name.toLowerCase().includes(searchString)) ||
      (member.email && member.email.toLowerCase().includes(searchString))
    );
  });

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search team members..."
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-[#F68B1F] focus:border-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Team Members Grid */}
      {filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <div key={member.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
              <div className="bg-gradient-to-r from-[#F68B1F]/10 to-transparent p-4 flex items-center">
                <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center bg-white rounded-full shadow-sm border border-[#F68B1F]/20">
                  <UserCircleIcon className="h-8 w-8 text-[#F68B1F]" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">{member.name || 'Unnamed Member'}</h3>
                  <p className="text-xs text-gray-500">Member ID: {member.id}</p>
                </div>
              </div>
              
              <div className="p-4 space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                  <span>{member.email || 'No email provided'}</span>
                </div>
                
                {member.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{member.phone}</span>
                  </div>
                )}
                
                {member.joinedDate && (
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                    <span>Joined: {new Date(member.joinedDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">No members found matching "{searchTerm}"</p>
          <button 
            onClick={() => setSearchTerm('')}
            className="mt-2 text-[#F68B1F] hover:text-[#E57D18] text-sm"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}

export default MemberList;

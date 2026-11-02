import { useState } from 'react';
import { XMarkIcon, UserIcon, TagIcon, DocumentTextIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

import { createProject } from '../../../services/projects';

function CreateProjectForm({ members, onProjectCreated, onCancel }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        assignedTo: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError('Project name is required');
            return;
        }
        setIsSubmitting(true);
        setError('');

        try {
            await createProject(formData);
            onProjectCreated();
            setFormData({ name: '', description: '', assignedTo: '' });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-[#F68B1F] to-[#E57D18] rounded-t-2xl">
                    <h3 className="text-xl font-bold text-white">Create New Project</h3>
                    <button
                        onClick={onCancel}
                        className="text-white hover:text-gray-100 transition-colors"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <form aria-label="Create project" onSubmit={handleSubmit} className="p-8 space-y-8">
                    {error && (
                        <div role="alert" className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    <div className="space-y-8">
                        {/* Project Name */}
                        <div className="relative">
                            <label htmlFor="projectName" className="block text-sm font-semibold text-gray-700 mb-2">
                                Project Name
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    id="projectName" maxLength={200} required name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F68B1F] focus:border-[#F68B1F] transition-all text-gray-900 placeholder-gray-400"
                                    placeholder="Enter project name"
                                />
                            </div>
                        </div>

                        {/* Project Description */}
                        <div className="relative">
                            <label htmlFor="projectDescription" className="block text-sm font-semibold text-gray-700 mb-2">
                                Description
                            </label>
                            <div className="relative">
                                <div className="absolute top-3 left-3 pointer-events-none">
                                    <TagIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <textarea
                                    id="projectDescription" maxLength={4000} name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="4"
                                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F68B1F] focus:border-[#F68B1F] transition-all text-gray-900 placeholder-gray-400 resize-none"
                                    placeholder="Enter project description (optional)"
                                />
                            </div>
                        </div>

                        {/* Assign To */}
                        <div className="relative">
                            <label htmlFor="projectAssignee" className="block text-sm font-semibold text-gray-700 mb-2">
                                Assign To
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <UserIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <select
                                    id="projectAssignee" name="assignedTo"
                                    value={formData.assignedTo}
                                    onChange={handleChange}
                                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F68B1F] focus:border-[#F68B1F] transition-all text-gray-900 appearance-none bg-white"
                                >
                                    <option value="">Unassigned</option>
                                    {members.filter(member => member.role === 'developer').map(member => (
                                        <option key={member.id} value={member.id}>
                                            {member.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-4 pt-6">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F68B1F] transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-6 py-3 rounded-xl text-sm font-medium text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F68B1F] transition-all ${
                                isSubmitting
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-[#F68B1F] to-[#E57D18] hover:from-[#E57D18] hover:to-[#F68B1F]'
                            }`}
                        >
                            {isSubmitting ? (
                                <div className="flex items-center">
                                    <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" aria-hidden="true" />
                                    Creating...
                                </div>
                            ) : (
                                'Create Project'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateProjectForm;

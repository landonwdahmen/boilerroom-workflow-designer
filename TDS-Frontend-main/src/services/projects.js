import api from './api';
export const getProjects = async () => (await api.get('/auth/projects')).data;
export const getUsers = async () => (await api.get('/auth/users')).data;
export const getAssignedProjects = async (id) => (await api.get(`/RequestHandler/assigned/${encodeURIComponent(id)}`)).data;
export const getProjectById = async (id) => {
  const project = (await getProjects()).find(item => item.id === id);
  if (!project) throw new Error('Project unavailable or not assigned to you.');
  return project;
};
export const createProject = async ({ name, description, assignedTo }) => (await api.post('/auth/projects', {
  name: name.trim(), description, status: 'active', assignedTo: assignedTo || null
})).data;
export const deleteProject = (id) => api.delete(`/auth/projects/${encodeURIComponent(id)}`);
// Assignment exists at creation only; no backend project-member CRUD.
export const getProjectMembers = async () => { throw new Error('Project member management is unavailable.'); };
export const addProjectMember = getProjectMembers;
export const removeProjectMember = getProjectMembers;

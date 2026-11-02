// Historical service surface: organizations/admins are provisioned by the local operator.
const unavailable = async () => { throw new Error('Organization management is available only to the local operator.'); };
export const getOrganizations = unavailable;
export const getOrganization = unavailable;
export const createOrganization = unavailable;
export const updateOrganization = unavailable;
export const deleteOrganization = unavailable;
export const getOrganizationMembers = unavailable;
export const addOrganizationMember = unavailable;
export const removeOrganizationMember = unavailable;
export const updateMemberRole = unavailable;
export const getOrganizationSettings = unavailable;
export const updateOrganizationSettings = unavailable;

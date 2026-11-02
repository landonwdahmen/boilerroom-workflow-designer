import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import BackButton from '../components/common/BackButton';
import ChangePasswordForm from '../components/dashboard/shared/ChangePasswordForm';
import DashboardHeader from '../components/dashboard/shared/DashboardHeader';
import { 
  UserCircleIcon, 
  EnvelopeIcon, 
  KeyIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

import { getProfile, updateProfile } from '../services/auth';

function ProfilePage() {
  const { user, updateUser } = useAuth();
  const userId = user?.userId;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getProfile(userId);
        setProfile(data);
        setEditedProfile(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    } else {
      setError('Missing user ID');
      setLoading(false);
    }
  }, [userId]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      setEditedProfile({ ...profile });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setError('');
    setUpdateSuccess(false);
    if (!editedProfile.name?.trim() || editedProfile.name.length > 100) { setError('Name is required (maximum 100 characters).'); return; }
    setSaving(true);
    try {
      const updated = await updateProfile(userId, editedProfile.name);
      setProfile(updated); setEditedProfile(updated); updateUser(updated);
      setIsEditing(false); setUpdateSuccess(true);
    } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  };

  if (loading) {
    return <div className="p-8 text-gray-500">Loading profile...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      {error && <p role="alert" className="p-4 text-red-700">{error}</p>}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <BackButton to={user.role === 'administrator' ? '/admin-dashboard' : '/member-dashboard'} label="Back to Dashboard" />
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#F68B1F] to-[#6D6E71] flex items-center justify-center">
                <span className="text-3xl font-bold text-white">{profile?.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="ml-6">
                <h1 className="text-2xl font-bold text-gray-900">{profile?.name}</h1>
                <p className="text-gray-500 flex items-center mt-1">
                  <EnvelopeIcon className="h-5 w-5 mr-2" />
                  {profile?.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button onClick={() => setActiveTab('profile')} className={`${activeTab === 'profile' ? 'border-[#F68B1F] text-[#F68B1F]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
              <UserCircleIcon className="h-5 w-5 mr-2" /> Profile Information
            </button>
            <button onClick={() => setActiveTab('security')} className={`${activeTab === 'security' ? 'border-[#F68B1F] text-[#F68B1F]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
              <KeyIcon className="h-5 w-5 mr-2" /> Security
            </button>
          </nav>
        </div>

        {activeTab === 'profile' ? (
          <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
            <div className="px-6 py-5 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
              <button onClick={handleEditToggle} className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                {isEditing ? (<><XMarkIcon className="h-4 w-4 mr-2" />Cancel</>) : (<><PencilSquareIcon className="h-4 w-4 mr-2" />Edit Profile</>)}
              </button>
            </div>
            {updateSuccess && (
              <div className="px-6 py-3 bg-green-50">
                <div className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-400" />
                  <p className="ml-3 text-sm text-green-700">Profile updated successfully!</p>
                </div>
              </div>
            )}
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                  {isEditing ? (
                    <input type="text" name="name" id="name" maxLength={100} value={editedProfile.name || ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{profile?.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <p className="mt-1 text-sm text-gray-900">{profile?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{profile?.role}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Organization</label>
                  <p className="mt-1 text-sm text-gray-900">{profile?.organizationName || 'N/A'}</p>
                </div>
              </div>
              {isEditing && (
                <div className="mt-6 flex justify-end space-x-3">
                  <button type="button" onClick={handleEditToggle} className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button type="button" disabled={saving} onClick={handleSaveProfile} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#F68B1F] hover:bg-[#E57D18]">{saving ? 'Saving…' : 'Save Changes'}</button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
              <p className="mt-1 text-sm text-gray-500">Ensure your account is using a strong password for security.</p>
            </div>
            <div className="px-6 py-6">
              <ChangePasswordForm />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;

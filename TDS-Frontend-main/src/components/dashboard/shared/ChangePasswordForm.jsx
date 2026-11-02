// src/components/dashboard/shared/ChangePasswordForm.js
import { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

import { changePassword, passwordIsValid } from '../../../services/auth';
import { useNavigate } from 'react-router-dom';

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { passwordChanged } = useAuth();
  const navigate = useNavigate();

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Password strength calculation
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthLabel = (strength) => {
    switch (strength) {
      case 0: return { label: 'Very Weak', color: 'bg-red-500' };
      case 1: return { label: 'Weak', color: 'bg-orange-500' };
      case 2: return { label: 'Medium', color: 'bg-yellow-500' };
      case 3: return { label: 'Strong', color: 'bg-[#F68B1F]' };
      case 4: return { label: 'Very Strong', color: 'bg-green-500' };
      default: return { label: 'Very Weak', color: 'bg-red-500' };
    }
  };

  const passwordStrength = calculatePasswordStrength(newPassword);
  const strengthInfo = getPasswordStrengthLabel(passwordStrength);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
  
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }
  
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
  
    if (!passwordIsValid(newPassword)) {
      setError('Use at least 12 characters and at most 72 UTF-8 bytes. Spaces are preserved.'); return;
    }
    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      passwordChanged();
      navigate('/login', { replace: true });
    } catch (failure) {
      setError(failure.status === 401 ? 'Current password is incorrect, or the session ended. Sign in again if necessary.' : failure.message);
    } finally { setIsSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-sm">
          <ExclamationCircleIcon className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center text-sm">
          <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2 flex-shrink-0" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {/* Current Password */}
      <div className="space-y-1">
        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
          Current Password
        </label>
        <div className="relative">
          <input
            id="currentPassword" autoComplete="current-password"
            type={showPasswords.current ? 'text' : 'password'}
            className="block w-full pr-10 border-gray-300 rounded-lg shadow-sm focus:ring-[#F68B1F] focus:border-[#F68B1F] sm:text-sm"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 px-3 flex items-center"
            onClick={() => togglePasswordVisibility('current')}
          >
            {showPasswords.current ? (
              <EyeIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <EyeSlashIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* New Password */}
      <div className="space-y-1">
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
          New Password
        </label>
        <div className="relative">
          <input
            id="newPassword" minLength={12} maxLength={72} autoComplete="new-password"
            type={showPasswords.new ? 'text' : 'password'}
            className="block w-full pr-10 border-gray-300 rounded-lg shadow-sm focus:ring-[#F68B1F] focus:border-[#F68B1F] sm:text-sm"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 px-3 flex items-center"
            onClick={() => togglePasswordVisibility('new')}
          >
            {showPasswords.new ? (
              <EyeIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <EyeSlashIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>

        {/* Password Strength Indicator */}
        {newPassword && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                {passwordStrength >= 3 ? (
                  <ShieldCheckIcon className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <ShieldExclamationIcon className="h-4 w-4 text-yellow-500 mr-1" />
                )}
                <span className="text-sm text-gray-600">
                  Password Strength: <span className="font-medium">{strengthInfo.label}</span>
                </span>
              </div>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full">
              <div
                className={`h-full rounded-full transition-all duration-300 ${strengthInfo.color}`}
                style={{ width: `${(passwordStrength / 4) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-600">Only the length and UTF-8 byte limits are required. The remaining strength indicators are suggestions.</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="flex items-center text-sm">
            <CheckCircleIcon 
              className={`h-4 w-4 mr-1 ${newPassword.length >= 12 ? 'text-green-500' : 'text-gray-300'}`}
            />
            <span className={newPassword.length >= 12 ? 'text-green-700' : 'text-gray-500'}>
              12+ characters, at most 72 UTF-8 bytes; spaces are preserved
            </span>
          </div>
          <div className="flex items-center text-sm">
            <CheckCircleIcon 
              className={`h-4 w-4 mr-1 ${/[A-Z]/.test(newPassword) ? 'text-green-500' : 'text-gray-300'}`}
            />
            <span className={/[A-Z]/.test(newPassword) ? 'text-green-700' : 'text-gray-500'}>
              Uppercase letter
            </span>
          </div>
          <div className="flex items-center text-sm">
            <CheckCircleIcon 
              className={`h-4 w-4 mr-1 ${/[0-9]/.test(newPassword) ? 'text-green-500' : 'text-gray-300'}`}
            />
            <span className={/[0-9]/.test(newPassword) ? 'text-green-700' : 'text-gray-500'}>
              Number
            </span>
          </div>
          <div className="flex items-center text-sm">
            <CheckCircleIcon 
              className={`h-4 w-4 mr-1 ${/[^A-Za-z0-9]/.test(newPassword) ? 'text-green-500' : 'text-gray-300'}`}
            />
            <span className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-green-700' : 'text-gray-500'}>
              Special character
            </span>
          </div>
        </div>
      </div>

      {/* Confirm New Password */}
      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm New Password
        </label>
        <div className="relative">
          <input
            id="confirmPassword" autoComplete="new-password"
            type={showPasswords.confirm ? 'text' : 'password'}
            className={`block w-full pr-10 border-gray-300 rounded-lg shadow-sm focus:ring-[#F68B1F] focus:border-[#F68B1F] sm:text-sm ${
              confirmPassword && newPassword !== confirmPassword ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
            }`}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 px-3 flex items-center"
            onClick={() => togglePasswordVisibility('confirm')}
          >
            {showPasswords.confirm ? (
              <EyeIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <EyeSlashIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
        {confirmPassword && newPassword !== confirmPassword && (
          <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
        )}
      </div>

      <div className="pt-1">
        <button
          type="submit"
          disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
          className={`w-full inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F68B1F] ${
            isSubmitting || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-[#F68B1F] hover:bg-[#E57D18]'
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center">
              <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" aria-hidden="true" />
              Updating Password...
            </div>
          ) : (
            'Update Password'
          )}
        </button>
      </div>
    </form>
  );
}

export default ChangePasswordForm;

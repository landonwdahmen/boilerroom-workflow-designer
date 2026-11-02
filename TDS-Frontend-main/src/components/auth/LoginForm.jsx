import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  CodeBracketIcon,
  UserGroupIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useLocation } from 'react-router-dom';
import { dashboardPath } from '../../contexts/AuthContext';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  const navigate = useNavigate();
  const { login } = useAuth();
  const location = useLocation();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoginError('');
    setIsSubmitting(true);

    if (!email.trim() || !password) {
      setLoginError('Please enter both email and password.');
      setIsSubmitting(false);
      return;
    }
    try {
      const account = await login(email, password);
      setPassword('');
      navigate(dashboardPath(account), { replace: true });
    } catch (error) {
      setLoginError(error.status === 401 ? 'Invalid email or password.' : error.message);
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left Side - Visual Banner */}
        <div className="hidden lg:block lg:col-span-5 bg-gradient-to-br from-[#F68B1F] to-[#e57d18] p-8 text-white relative">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute -bottom-8 -left-8 w-96 h-96 bg-white/10 rounded-full mix-blend-overlay"></div>
          <div className="absolute -top-12 -right-12 w-96 h-96 bg-white/10 rounded-full mix-blend-overlay"></div>

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex-grow">
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">Welcome Back!</h2>
              <p className="text-lg mb-10 text-white/90">Sign in to the local academic portfolio demonstration.</p>
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <CodeBracketIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold">Visual graph design</h4>
                    <p className="text-sm text-white/80">Design and save graph configurations; execution is disabled.</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <ShieldCheckIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold">Cookie-based access</h4>
                    <p className="text-sm text-white/80">HTTPS sessions and CSRF-protected writes</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <UserGroupIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold">Scoped project permissions</h4>
                    <p className="text-sm text-white/80">Administrator editing and assigned-developer read-only access</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-8">
              <div className="flex items-center justify-center p-3 bg-white/10 rounded-lg">
                <div className="text-center">
                  <div className="text-xs text-white/80">Academic team project · local development</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="lg:col-span-7 p-6 sm:p-8">
          <div className="w-full">
            <div className="flex justify-between items-center mb-6">
              <div className="text-xl font-bold text-[#F68B1F]">Boiler-Room — Workflow Design Demo</div>
            </div>

            <div className="max-w-md mx-auto">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to your account</h2>
                <p className="text-gray-600">Enter credentials to access your dashboard</p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {location.state?.registered && <p role="status">Account created. Sign in with your new credentials.</p>}
                {loginError && (
                  <div role="alert" className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
                    <p className="text-sm text-red-700">{loginError}</p>
                  </div>
                )}

                {/* Email Input */}
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    className="peer w-full h-12 px-4 pt-4 border border-gray-300 rounded-lg text-gray-900 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#F68B1F] focus:border-transparent"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                  <label
                    htmlFor="email"
                    className="absolute left-4 top-1 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-3 peer-placeholder-shown:text-gray-400 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#F68B1F]"
                  >
                    Email Address
                  </label>
                </div>

                {/* Password Input */}
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="peer w-full h-12 px-4 pt-4 pr-10 border border-gray-300 rounded-lg text-gray-900 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#F68B1F] focus:border-transparent"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <label
                    htmlFor="password"
                    className="absolute left-4 top-1 text-xs text-gray-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-3 peer-placeholder-shown:text-gray-400 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#F68B1F]"
                  >
                    Password
                  </label>
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer">
                    {showPassword ? (
                      <EyeIcon className="h-5 w-5 text-gray-500" onClick={togglePasswordVisibility} />
                    ) : (
                      <EyeSlashIcon className="h-5 w-5 text-gray-500" onClick={togglePasswordVisibility} />
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600">Sessions expire after 30 minutes. Password recovery is unavailable.</p>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full h-12 mt-6 flex items-center justify-center px-6 text-base font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F68B1F] transition-colors ${
                    isSubmitting
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-[#F68B1F] hover:bg-[#e57d18]'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <ArrowPathIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" aria-hidden="true" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>

                <p className="mt-6 text-center text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link to="/signup" className="font-medium text-[#F68B1F] hover:text-[#e57d18]">
                    Sign up
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;

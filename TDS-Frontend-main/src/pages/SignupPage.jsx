// src/pages/SignupPage.js
import { Link } from 'react-router-dom';
import SignupForm from '../components/auth/SignupForm';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

function SignupPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col py-4 px-4 sm:py-6 md:py-12">
            {/* Back Navigation */}
            <div className="max-w-6xl mx-auto w-full mb-4">
                <Link 
                    to="/" 
                    className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                    <ArrowLeftIcon className="h-5 w-5 mr-2" />
                    <span>Back to Home</span>
                </Link>
            </div>
            
            {/* Main Container */}
            <div className="flex-grow flex items-center justify-center">
                <SignupForm />
            </div>
        </div>
    );
}

export default SignupPage;
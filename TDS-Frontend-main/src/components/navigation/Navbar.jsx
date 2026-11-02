// src/components/navigation/Navbar.js
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const renderAuthLinks = () => {
    if (user) {
      const dashboardPath = user.role === 'administrator' ? '/admin-dashboard' : '/member-dashboard';
      return (
        <Link
          to={dashboardPath}
          className={`px-4 py-2 rounded-lg font-medium transition-colors duration-300 ${
            isScrolled
              ? 'text-[#F68B1F] hover:bg-[#F68B1F]/10'
              : 'text-white hover:bg-white/10'
          }`}
        >
          Dashboard
        </Link>
      );
    } else {
      return (
        <div className="flex items-center space-x-4">
          <Link
            to="/login"
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-300 ${
              isScrolled
                ? 'text-[#F68B1F] hover:bg-[#F68B1F]/10'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className={`px-4 py-2 rounded-lg font-medium ${
              isScrolled
                ? 'bg-[#F68B1F] text-white hover:bg-[#E57D18]'
                : 'bg-white text-[#F68B1F] hover:bg-gray-100'
            } transition-colors duration-300`}
          >
            Sign Up
          </Link>
        </div>
      );
    }
  };

  const renderMobileAuthLinks = () => {
    if (user) {
      const dashboardPath = user.role === 'administrator' ? '/admin-dashboard' : '/member-dashboard';
      return (
        <Link
          to={dashboardPath}
          className="block px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-[#F68B1F] rounded-lg"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          Dashboard
        </Link>
      );
    } else {
      return (
        <>
          <Link
            to="/login"
            className="block px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-[#F68B1F] rounded-lg"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="block px-4 py-2 text-base font-medium bg-[#F68B1F] text-white hover:bg-[#E57D18] rounded-lg text-center"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Sign Up
          </Link>
        </>
      );
    }
  };

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white shadow-lg py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex justify-between items-center">
        <Link to="/" className="flex items-center max-w-[75%] lg:max-w-sm">
          <span className={`text-base lg:text-xl leading-tight font-bold ${
            isScrolled ? 'text-[#F68B1F]' : 'text-white'
          }`}>
            Boiler-Room — Workflow Design Demo
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-8">
          <Link
            to="/"
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-300 ${
              isScrolled
                ? 'text-gray-700 hover:text-[#F68B1F]'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Home
          </Link>
          <a
            href="/#features"
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-300 ${
              isScrolled
                ? 'text-gray-700 hover:text-[#F68B1F]'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Features
          </a>
          <Link
            to="/documentation"
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-300 ${
              isScrolled
                ? 'text-gray-700 hover:text-[#F68B1F]'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Documentation
          </Link>
          {renderAuthLinks()}
        </div>

        {/* Mobile Menu Button */}
        <div className="lg:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`p-2 rounded-lg focus:outline-none ${
              isScrolled ? 'text-gray-700' : 'text-white'
            }`}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {isMobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div id="mobile-navigation" className="lg:hidden bg-white shadow-xl">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className="block px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-[#F68B1F] rounded-lg"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <a
              href="/#features"
              className="block px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-[#F68B1F] rounded-lg"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Features
            </a>
            <Link
              to="/documentation"
              className="block px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-[#F68B1F] rounded-lg"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Documentation
            </Link>
            <div className="pt-2 space-y-1">
              {renderMobileAuthLinks()}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;

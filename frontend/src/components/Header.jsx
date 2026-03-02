import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiLogOut, FiChevronDown, FiGrid } from 'react-icons/fi';
import { useState, useRef, useEffect } from 'react';

const Header = () => {
  const { user, isAuthenticated, isAdmin, isLibrarian, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get first letter of email for avatar
  const getAvatarLetter = () => {
    return user?.email ? user.email.charAt(0).toUpperCase() : 'U';
  };

  // Get role display name
  const getRoleDisplay = () => {
    if (isAdmin()) return 'Admin';
    if (isLibrarian()) return 'Librarian';
    return 'Member';
  };

  // Get role badge color
  const getRoleBadgeClass = () => {
    if (isAdmin()) return 'bg-purple-100 text-purple-800';
    if (isLibrarian()) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <header className="bg-white shadow-sm border-b w-full">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <img
              src="/book_covers/MetroReads.png"
              alt="MetroReads Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
            />
            <div className="flex flex-col leading-tight" style={{maxWidth: 'max-content'}}>
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">
                MetroReads
              </span>
              <span className="text-[8.5px] text-gray-400 font-semibold tracking-[0.2em] uppercase hidden sm:block w-full text-right pr-0.5">
                Digital Library Platform
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-2 sm:space-x-4">
            {isAuthenticated ? (
              <>
                {/* Dashboard Button */}
                <Link
                  to={isAdmin() || isLibrarian() ? '/admin' : '/dashboard'}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-sm"
                >
                  <FiGrid className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>

                {/* User Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-2 focus:outline-none hover:opacity-80 transition-opacity"
                  >
                    {/* User Avatar Circle */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                      {getAvatarLetter()}
                    </div>

                    <FiChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      {/* User Info */}
                      <div className="border-b border-gray-100">
                        <div className="px-6 py-4 border-b border-gray-100 text-center">
                          <p className="text-base font-bold text-gray-900">{user?.name || getRoleDisplay()}</p>
                        </div>
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-center">
                          <span className={`text-sm font-semibold px-4 py-1 rounded-full ${getRoleBadgeClass()}`}>{getRoleDisplay()}</span>
                        </div>
                        <div className="px-6 py-4 text-center">
                          <p className="text-sm text-gray-500">{user?.email}</p>
                        </div>
                      </div>

                      {/* Logout Button */}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-3 px-4 py-4 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors rounded-b-lg"
                      >
                        <FiLogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login-select"
                  className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200 shadow-sm"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
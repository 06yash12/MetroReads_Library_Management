import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import LibrarySelector from '../components/LibrarySelector';
import BookBrowser from '../components/BookBrowser';
import RequestManager from '../components/RequestManager';
import LoanManager from '../components/LoanManager';
import ErrorMessage from '../components/ErrorMessage';
import PickupNotification from '../components/PickupNotification';

const MemberDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [homeLibrary, setHomeLibrary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHomeLibrary();
  }, []);

  const fetchHomeLibrary = async () => {
    try {
      setLoading(true);
      const response = await api.get('/member/home-library');
      if (response.data.success) {
        setHomeLibrary(response.data.data);
        if (response.data.data) {
          setActiveTab('browse');
        }
      }
    } catch (error) {
      console.error('Failed to fetch home library:', error);
      setError('Failed to load home library information');
    } finally {
      setLoading(false);
    }
  };

  const handleLibrarySelected = (library) => {
    setHomeLibrary(library);
    setActiveTab('browse');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Horizontal Nav Bar - sits right under the site header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-2">
            <div className="flex items-center gap-3 flex-shrink-0">
              <h2 className="text-base font-bold text-gray-900 whitespace-nowrap">Member Dashboard</h2>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-10 bg-gray-300 mx-1" />

            {/* Nav tabs */}
            <nav className="flex flex-wrap gap-2 flex-1" aria-label="Tabs">
              {!homeLibrary && (
                <button
                  onClick={() => setActiveTab('home')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'home'
                    ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }`}
                >
                  Set Home Library
                </button>
              )}
              {homeLibrary && (
                <>
                  <button
                    onClick={() => setActiveTab('browse')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'browse'
                      ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900'
                      }`}
                  >
                    Browse Books
                  </button>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'requests'
                      ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900'
                      }`}
                  >
                    My Requests
                  </button>
                  <button
                    onClick={() => setActiveTab('loans')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'loans'
                      ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900'
                      }`}
                  >
                    My Loans
                  </button>
                  <button
                    onClick={() => setActiveTab('library')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'library'
                      ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900'
                      }`}
                  >
                    Change Library
                  </button>
                </>
              )}
            </nav>

            {/* Library info - right side */}
            {homeLibrary && (
              <div className="flex items-center gap-2 ml-auto flex-shrink-0 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 whitespace-nowrap">
                <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <p className="text-sm text-gray-700">
                  <span className="text-gray-500">Your Library:</span>{' '}
                  <span className="font-semibold text-blue-700">{homeLibrary.name}</span>
                  {homeLibrary.city?.name && <span className="text-gray-500">, {homeLibrary.city.name}</span>}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error + Notifications below nav */}
      {error && (
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 pt-3">
          <ErrorMessage message={error} onClose={() => setError('')} />
        </div>
      )}
      {homeLibrary && (
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 pt-2">
          <PickupNotification />
        </div>
      )}

      {/* Tab Content */}
      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6">
        <main>
          {(activeTab === 'home' || activeTab === 'library') && (
            <LibrarySelector
              onLibrarySelected={handleLibrarySelected}
              currentLibrary={homeLibrary}
            />
          )}
          {activeTab === 'browse' && homeLibrary && (
            <BookBrowser libraryId={homeLibrary.id} />
          )}
          {activeTab === 'requests' && homeLibrary && (
            <RequestManager />
          )}
          {activeTab === 'loans' && homeLibrary && (
            <LoanManager />
          )}
        </main>
      </div>
    </div>
  );
};

export default MemberDashboard;
import { useState, useEffect } from 'react';
import { cityService, libraryService, authService, loanService } from '../services/api';
import { FiMapPin, FiUsers, FiBook, FiPlus, FiEdit, FiTrash2, FiHome } from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import CityForm from '../components/CityForm';

const AdminDashboard = () => {
  const [cities, setCities] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [librarians, setLibrarians] = useState([]);
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Search and filter states
  const [cityViewMode, setCityViewMode] = useState('state');
  const [selectedCityFilter, setSelectedCityFilter] = useState('all');
  const [citySort, setCitySort] = useState('name');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilterCity, setMemberFilterCity] = useState('all');
  const [memberFilterLibrary, setMemberFilterLibrary] = useState('all');
  const [memberSort, setMemberSort] = useState('name');
  const [librarianSearch, setLibrarianSearch] = useState('');
  const [librarianFilterCity, setLibrarianFilterCity] = useState('all');
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryFilterCity, setLibraryFilterCity] = useState('all');

  // Modal states
  const [showCityModal, setShowCityModal] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [showLibrarianModal, setShowLibrarianModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [editingLibrary, setEditingLibrary] = useState(null);
  const [editingLibrarian, setEditingLibrarian] = useState(null);

  // Form states
  const [cityForm, setCityForm] = useState({
    name: '',
    state: '',
    country: 'India'
  });

  const [libraryForm, setLibraryForm] = useState({
    name: '',
    address: '',
    cityId: '',
    librarianId: ''
  });

  const [librarianForm, setLibrarianForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    libraryId: ''
  });

  const [assignForm, setAssignForm] = useState({
    librarianId: '',
    libraryId: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [citiesRes, librariesRes] = await Promise.all([
        cityService.getCities(),
        libraryService.getLibraries()
      ]);

      setCities(citiesRes.data || []);
      const librariesData = librariesRes.data || [];
      setLibraries(librariesData);

      try {
        const usersRes = await authService.getUsers();
        const allUsers = usersRes.data || [];
        setLibrarians(allUsers.filter(user => user.role === 'LIBRARIAN'));
        setMembers(allUsers.filter(user => user.role === 'MEMBER'));
      } catch (err) {
        console.log('Could not fetch users:', err);
        setLibrarians([]);
        setMembers([]);
      }

      // Fetch book copies for each library using library stats (more reliable)
      try {
        const statsPromises = librariesData.map(async (lib) => {
          try {
            const response = await libraryService.getLibraryStats(lib.id);
            const stats = response.data?.stats || {};
            return {
              libraryId: lib.id,
              totalBooks: stats.totalBooks || lib._count?.bookCopies || 0,
              availableBooks: stats.availableBooks || 0,
              loanedBooks: stats.activeLoans || 0,
              maintenanceBooks: stats.maintenanceBooks || 0,
              pendingRequests: stats.pendingRequests || 0
            };
          } catch (error) {
            return {
              libraryId: lib.id,
              totalBooks: lib._count?.bookCopies || 0,
              availableBooks: 0,
              loanedBooks: 0,
              maintenanceBooks: 0,
              pendingRequests: 0
            };
          }
        });
        const statsResults = await Promise.all(statsPromises);
        setBooks(statsResults); // store as stats array keyed by libraryId
        console.log('Library stats fetched:', statsResults.length);
      } catch (err) {
        console.log('Could not fetch books:', err);
        setBooks([]);
      }

      try {
        const loansRes = await loanService.getActiveLoans();
        setLoans(loansRes.data || []);
      } catch (err) {
        console.log('Could not fetch loans:', err);
        setLoans([]);
      }
    } catch (err) {
      console.error('Fetch data error:', err);
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // City CRUD operations
  const handleCreateCity = async (formData) => {
    try {
      console.log('Creating/updating city:', formData);
      if (editingCity) {
        await cityService.updateCity(editingCity.id, formData);
      } else {
        await cityService.createCity(formData);
      }
      setShowCityModal(false);
      setEditingCity(null);
      await fetchData();
    } catch (err) {
      console.error('City operation error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save city');
    }
  };

  const handleDeleteCity = async (cityId) => {
    // Check if city has libraries before attempting delete
    const city = cities.find(c => c.id === cityId);
    const cityLibraries = libraries.filter(lib => lib.cityId === cityId);

    if (cityLibraries.length > 0) {
      setError(`Cannot delete "${city?.name}" because it has ${cityLibraries.length} libraries. Please delete all libraries in this city first.`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${city?.name}"? This action cannot be undone.`)) {
      try {
        await cityService.deleteCity(cityId);
        await fetchData();
      } catch (err) {
        console.error('Delete city error:', err);
        const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to delete city';
        setError(errorMessage);
      }
    }
  };

  // Library CRUD operations
  const handleCreateLibrary = async (e) => {
    e.preventDefault();
    try {
      // Only send name, address, and cityId - librarian is assigned separately
      const libraryData = {
        name: libraryForm.name,
        address: libraryForm.address,
        cityId: parseInt(libraryForm.cityId)
      };

      console.log('Creating/updating library:', libraryData);

      if (editingLibrary) {
        await libraryService.updateLibrary(editingLibrary.id, libraryData);
      } else {
        await libraryService.createLibrary(libraryData);
      }
      setLibraryForm({ name: '', address: '', cityId: '', librarianId: '' });
      setShowLibraryModal(false);
      setEditingLibrary(null);
      await fetchData();
    } catch (err) {
      console.error('Library operation error:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to save library');
    }
  };

  const handleDeleteLibrary = async (libraryId) => {
    const library = libraries.find(l => l.id === libraryId);
    const city = cities.find(c => c.id === library?.cityId);

    if (window.confirm(`Are you sure you want to delete "${library?.name}" in ${city?.name}? This action cannot be undone.`)) {
      try {
        await libraryService.deleteLibrary(libraryId);
        await fetchData();
      } catch (err) {
        console.error('Delete library error:', err);
        const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to delete library';
        setError(errorMessage);
      }
    }
  };

  // Librarian CRUD operations
  const handleCreateLibrarian = async (e) => {
    e.preventDefault();
    try {
      console.log('Creating/updating librarian:', librarianForm);
      if (editingLibrarian) {
        await authService.updateUser(editingLibrarian.id, librarianForm);
      } else {
        await authService.createLibrarian(librarianForm);
      }
      setLibrarianForm({ name: '', email: '', password: '', phone: '', address: '', libraryId: '' });
      setShowLibrarianModal(false);
      setEditingLibrarian(null);
      await fetchData();
    } catch (err) {
      console.error('Librarian operation error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save librarian');
    }
  };

  const handleDeleteLibrarian = async (librarianId) => {
    if (window.confirm('Are you sure you want to delete this librarian?')) {
      try {
        await authService.deleteUser(librarianId);
        await fetchData();
      } catch (err) {
        console.error('Delete librarian error:', err);
        setError(err.response?.data?.message || err.message || 'Failed to delete librarian');
      }
    }
  };

  const handleAssignLibrarian = async (e) => {
    e.preventDefault();
    try {
      console.log('Assigning librarian:', assignForm);
      const response = await authService.updateUser(assignForm.librarianId, {
        libraryId: parseInt(assignForm.libraryId),
        role: 'LIBRARIAN'
      });
      console.log('Assignment response:', response);
      setShowAssignModal(false);
      setAssignForm({ librarianId: '', libraryId: '' });
      await fetchData();
    } catch (err) {
      console.error('Assignment error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to assign librarian');
    }
  };

  // Enhanced Overview with City-wise Analytics
  const renderOverview = () => (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
        <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-4">
          <div className="flex items-center">
            <FiMapPin className="w-7 h-7 text-blue-600" />
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-gray-600">Cities</h3>
              <p className="text-2xl font-bold text-blue-600">{cities.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-4">
          <div className="flex items-center">
            <FiHome className="w-7 h-7 text-green-600" />
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-gray-600">Libraries</h3>
              <p className="text-2xl font-bold text-green-600">{libraries.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-4">
          <div className="flex items-center">
            <FiUsers className="w-7 h-7 text-purple-600" />
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-gray-600">Librarians</h3>
              <p className="text-2xl font-bold text-purple-600">{librarians.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-4">
          <div className="flex items-center">
            <FiUsers className="w-7 h-7 text-teal-600" />
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-gray-600">Members</h3>
              <p className="text-2xl font-bold text-teal-600">{members.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-4">
          <div className="flex items-center">
            <FiBook className="w-7 h-7 text-orange-600" />
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-gray-600">Total Books</h3>
              <p className="text-2xl font-bold text-orange-600">
                {libraries.reduce((sum, lib) => sum + (lib._count?.bookCopies || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-4">
          <div className="flex items-center">
            <FiBook className="w-7 h-7 text-red-600" />
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-gray-600">Active Loans</h3>
              <p className="text-2xl font-bold text-red-600">
                {books.reduce((sum, s) => sum + (s.loanedBooks || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-4">
          <div className="flex items-center">
            <FiBook className="w-7 h-7 text-yellow-600" />
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-gray-600">Pending</h3>
              <p className="text-2xl font-bold text-yellow-600">
                {books.reduce((sum, s) => sum + (s.pendingRequests || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-4">
          <div className="flex items-center">
            <FiBook className="w-7 h-7 text-indigo-600" />
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-gray-600">Available</h3>
              <p className="text-2xl font-bold text-indigo-600">
                {books.reduce((sum, s) => sum + (s.availableBooks || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* City-wise Dashboard */}
      <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-6">
        {/* Header + Filters */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <h2 className="text-xl font-semibold text-gray-900">City-wise Overview</h2>
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort by */}
            <select
              value={citySort}
              onChange={e => setCitySort(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="name">Sort: City Name</option>
              <option value="pending">Sort: Pending Requests</option>
              <option value="loans">Sort: Active Loans</option>
              <option value="members">Sort: Members</option>
            </select>
            {/* City filter buttons */}
            <button
              onClick={() => setSelectedCityFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedCityFilter === 'all' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              All Cities
            </button>
            {cities.map(city => (
              <button
                key={city.id}
                onClick={() => setSelectedCityFilter(city.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedCityFilter === city.id ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {city.name}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cities
            .filter(city => selectedCityFilter === 'all' || city.id === selectedCityFilter)
            .map(city => {
              const cityLibraries = libraries.filter(lib => lib.cityId === city.id);
              const cityPending = cityLibraries.reduce((sum, lib) => {
                const s = books.find(b => b.libraryId === lib.id) || {};
                return sum + (s.pendingRequests || 0);
              }, 0);
              const cityLoans = cityLibraries.reduce((sum, lib) => {
                const s = books.find(b => b.libraryId === lib.id) || {};
                return sum + (s.loanedBooks || 0);
              }, 0);
              const cityMembers = members.filter(m => cityLibraries.some(l => l.id === m.homeLibraryId)).length;
              return { city, cityLibraries, cityPending, cityLoans, cityMembers };
            })
            .sort((a, b) => {
              if (citySort === 'pending') return b.cityPending - a.cityPending;
              if (citySort === 'loans') return b.cityLoans - a.cityLoans;
              if (citySort === 'members') return b.cityMembers - a.cityMembers;
              return a.city.name.localeCompare(b.city.name);
            })
            .map(({ city, cityLibraries }) => {

              return (
                <div
                  key={city.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center mb-4">
                    <FiMapPin className="w-5 h-5 text-blue-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {city.name}, {city.state}
                    </h3>
                  </div>

                  {/* Library List with Details */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Libraries:</p>
                    <div className="space-y-3">
                      {cityLibraries.map((library) => {
                        const librarian = librarians.find(l => l.libraryId === library.id);
                        const libMembers = members.filter(m => m.homeLibraryId === library.id);
                        const libStats = books.find(s => s.libraryId === library.id) || {};
                        const libTotal = libStats.totalBooks || library._count?.bookCopies || 0;
                        const libLoaned = libStats.loanedBooks || 0;
                        const libAvailable = libStats.availableBooks || 0;
                        const libPending = libStats.pendingRequests || 0;

                        return (
                          <div key={library.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-base font-semibold text-gray-900">{library.name}</span>
                              <span className="text-sm text-purple-600 font-medium">
                                {librarian ? librarian.name : 'No librarian'}
                              </span>
                            </div>
                            <div className="grid grid-cols-5 gap-2 text-sm">
                              <div className="text-center">
                                <p className="text-gray-600 mb-1 text-xs">Members</p>
                                <p className="text-lg font-bold text-green-600">{libMembers.length}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-gray-600 mb-1 text-xs">Books</p>
                                <p className="text-lg font-bold text-orange-600">{libTotal}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-gray-600 mb-1 text-xs">Loaned</p>
                                <p className="text-lg font-bold text-red-600">{libLoaned}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-gray-600 mb-1 text-xs">Available</p>
                                <p className="text-lg font-bold text-indigo-600">{libAvailable}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-gray-600 mb-1 text-xs">Pending</p>
                                <p className="text-lg font-bold text-yellow-600">{libPending}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <LoadingSpinner text="Loading admin dashboard..." />;
  }

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{
        backgroundImage: 'url(https://cdn.wallpapersafari.com/77/82/C4nLhI.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Semi-transparent overlay */}
      <div className="min-h-screen bg-black bg-opacity-40">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white drop-shadow-lg">Admin Dashboard</h1>
              <p className="text-gray-200 drop-shadow">Manage cities, libraries, and librarians across the metropolitan network</p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-medium rounded-lg transition-all shadow-lg border border-white border-opacity-30"
            >
              <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {error && (
            <div className="mb-6">
              <ErrorMessage message={error} onClose={() => setError(null)} inline={true} />
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="mb-8">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: FiHome },
                { id: 'cities', label: 'Cities', icon: FiMapPin },
                { id: 'libraries', label: 'Libraries', icon: FiBook },
                { id: 'librarians', label: 'Librarians', icon: FiUsers },
                { id: 'members', label: 'Members', icon: FiUsers }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeTab === tab.id
                    ? 'bg-white bg-opacity-20 text-white shadow-lg'
                    : 'text-gray-200 hover:text-white hover:bg-white hover:bg-opacity-10'
                    }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          {activeTab === 'overview' && renderOverview()}

          {activeTab === 'cities' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white drop-shadow">Cities Management</h2>
                <div className="flex items-center gap-3">
                  <select
                    value={cityViewMode}
                    onChange={(e) => setCityViewMode(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="state">Group by State</option>
                    <option value="alphabetical">A-Z Order</option>
                  </select>
                  <button
                    onClick={() => setShowCityModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-lg"
                  >
                    <FiPlus className="w-4 h-4 mr-2" />
                    Add City
                  </button>
                </div>
              </div>

              {cityViewMode === 'state' ? (
                /* Group by State View */
                Object.entries(
                  cities.reduce((acc, city) => {
                    const state = city.state || 'Other';
                    if (!acc[state]) acc[state] = [];
                    acc[state].push(city);
                    return acc;
                  }, {})
                )
                  .sort(([stateA], [stateB]) => stateA.localeCompare(stateB))
                  .map(([state, stateCities]) => (
                    <div key={state} className="mb-8">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                        <span className="bg-blue-600 px-3 py-1 rounded-lg shadow-lg">{state}</span>
                        <span className="ml-3 text-sm font-normal text-gray-300">({stateCities.length} {stateCities.length === 1 ? 'city' : 'cities'})</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {stateCities
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((city) => (
                            <div key={city.id} className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-6">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center">
                                  <FiMapPin className="w-6 h-6 text-blue-600 mr-2" />
                                  <h3 className="text-lg font-semibold text-gray-900">{city.name}</h3>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => {
                                      setEditingCity(city);
                                      setCityForm({ name: city.name, state: city.state, country: city.country });
                                      setShowCityModal(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Edit City"
                                  >
                                    <FiEdit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCity(city.id)}
                                    className={`${libraries.filter(lib => lib.cityId === city.id).length > 0
                                      ? 'text-gray-400 cursor-not-allowed'
                                      : 'text-red-600 hover:text-red-800'
                                      }`}
                                    title={
                                      libraries.filter(lib => lib.cityId === city.id).length > 0
                                        ? 'Cannot delete city with libraries'
                                        : 'Delete City'
                                    }
                                  >
                                    <FiTrash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2 text-sm text-gray-600">
                                <p><strong>State:</strong> {city.state || 'Not specified'}</p>
                                <p><strong>Country:</strong> {city.country}</p>
                                <p><strong>Libraries:</strong> {libraries.filter(lib => lib.cityId === city.id).length}</p>
                                {libraries.filter(lib => lib.cityId === city.id).length > 0 && (
                                  <div className="mt-2 p-2 bg-yellow-50 rounded-md">
                                    <p className="text-xs text-yellow-800">
                                      <strong>Note:</strong> Delete all libraries before deleting this city
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))
              ) : (
                /* A-Z Alphabetical View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cities
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((city) => (
                      <div key={city.id} className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <FiMapPin className="w-6 h-6 text-blue-600 mr-2" />
                            <h3 className="text-lg font-semibold text-gray-900">{city.name}</h3>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setEditingCity(city);
                                setCityForm({ name: city.name, state: city.state, country: city.country });
                                setShowCityModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit City"
                            >
                              <FiEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCity(city.id)}
                              className={`${libraries.filter(lib => lib.cityId === city.id).length > 0
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-red-600 hover:text-red-800'
                                }`}
                              title={
                                libraries.filter(lib => lib.cityId === city.id).length > 0
                                  ? 'Cannot delete city with libraries'
                                  : 'Delete City'
                              }
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          <p><strong>State:</strong> {city.state || 'Not specified'}</p>
                          <p><strong>Country:</strong> {city.country}</p>
                          <p><strong>Libraries:</strong> {libraries.filter(lib => lib.cityId === city.id).length}</p>
                          {libraries.filter(lib => lib.cityId === city.id).length > 0 && (
                            <div className="mt-2 p-2 bg-yellow-50 rounded-md">
                              <p className="text-xs text-yellow-800">
                                <strong>Note:</strong> Delete all libraries before deleting this city
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'libraries' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white drop-shadow">Libraries Management</h2>
                <button
                  onClick={() => { setError(null); setShowLibraryModal(true); }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 shadow-lg"
                >
                  <FiPlus className="w-4 h-4 mr-2" />
                  Add Library
                </button>
              </div>

              {/* Library Filters */}
              <div className="flex flex-wrap gap-3 mb-6">
                <input
                  type="text"
                  placeholder="Search library name or address..."
                  value={librarySearch}
                  onChange={e => setLibrarySearch(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
                />
                <select value={libraryFilterCity} onChange={e => setLibraryFilterCity(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="all">All Cities</option>
                  {cities.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                    <option key={c.id} value={c.id}>{c.name}, {c.state}</option>
                  ))}
                </select>
                {(librarySearch || libraryFilterCity !== 'all') && (
                  <button onClick={() => { setLibrarySearch(''); setLibraryFilterCity('all'); }}
                    className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-sm hover:bg-red-200">
                    Clear
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {libraries
                  .filter(library => {
                    const city = cities.find(c => c.id === library.cityId);
                    const q = librarySearch.toLowerCase();
                    const matchSearch = !q || library.name?.toLowerCase().includes(q) || library.address?.toLowerCase().includes(q) || city?.name?.toLowerCase().includes(q);
                    const matchCity = libraryFilterCity === 'all' || library.cityId === parseInt(libraryFilterCity);
                    return matchSearch && matchCity;
                  })
                  .map((library) => {
                    const city = cities.find(c => c.id === library.cityId);
                    const librarian = librarians.find(l => l.libraryId === library.id);

                    return (
                      <div key={library.id} className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <FiHome className="w-6 h-6 text-green-600 mr-2" />
                            <h3 className="text-lg font-semibold text-gray-900">{library.name}</h3>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setEditingLibrary(library);
                                setLibraryForm({
                                  name: library.name,
                                  address: library.address || '',
                                  cityId: library.cityId,
                                  librarianId: librarian?.id || ''
                                });
                                setShowLibraryModal(true);
                              }}
                              className="text-green-600 hover:text-green-800"
                              title="Edit Library"
                            >
                              <FiEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteLibrary(library.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete Library"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          <p><strong>Address:</strong> {library.address || 'Not specified'}</p>
                          <p><strong>City:</strong> {city?.name}, {city?.state}</p>
                          <p><strong>Librarian:</strong> {librarian ? librarian.name : 'Not assigned'}</p>
                          <p><strong>Books:</strong> {library._count?.bookCopies || 0}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {activeTab === 'librarians' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white drop-shadow">Librarians Management</h2>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 shadow-lg"
                  >
                    <FiUsers className="w-4 h-4 mr-2" />
                    Assign Librarian
                  </button>
                  <button
                    onClick={() => setShowLibrarianModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 shadow-lg"
                  >
                    <FiPlus className="w-4 h-4 mr-2" />
                    Add Librarian
                  </button>
                </div>
              </div>

              {/* Librarian Filters */}
              <div className="flex flex-wrap gap-3 mb-6">
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={librarianSearch}
                  onChange={e => setLibrarianSearch(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
                />
                <select value={librarianFilterCity} onChange={e => setLibrarianFilterCity(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="all">All Cities</option>
                  {cities.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                    <option key={c.id} value={c.id}>{c.name}, {c.state}</option>
                  ))}
                </select>
                {(librarianSearch || librarianFilterCity !== 'all') && (
                  <button onClick={() => { setLibrarianSearch(''); setLibrarianFilterCity('all'); }}
                    className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-sm hover:bg-red-200">
                    Clear
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {librarians
                  .filter(librarian => {
                    const assignedLibrary = libraries.find(lib => lib.id === librarian.libraryId);
                    const city = assignedLibrary ? cities.find(c => c.id === assignedLibrary.cityId) : null;
                    const q = librarianSearch.toLowerCase();
                    const matchSearch = !q || librarian.name?.toLowerCase().includes(q) || librarian.email?.toLowerCase().includes(q);
                    const matchCity = librarianFilterCity === 'all' || city?.id === parseInt(librarianFilterCity);
                    return matchSearch && matchCity;
                  })
                  .map((librarian) => {
                    const assignedLibrary = libraries.find(lib => lib.id === librarian.libraryId);
                    const city = assignedLibrary ? cities.find(c => c.id === assignedLibrary.cityId) : null;

                    return (
                      <div key={librarian.id} className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <FiUsers className="w-6 h-6 text-purple-600 mr-2" />
                            <h3 className="text-lg font-semibold text-gray-900">{librarian.name}</h3>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setEditingLibrarian(librarian);
                                setLibrarianForm({
                                  name: librarian.name,
                                  email: librarian.email,
                                  password: '',
                                  phone: librarian.phone || '',
                                  address: librarian.address || '',
                                  libraryId: librarian.libraryId || ''
                                });
                                setShowLibrarianModal(true);
                              }}
                              className="text-purple-600 hover:text-purple-800"
                              title="Edit Librarian"
                            >
                              <FiEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteLibrarian(librarian.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete Librarian"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          <p><strong>Email:</strong> {librarian.email}</p>
                          <p><strong>Phone:</strong> {librarian.phone || 'Not provided'}</p>

                          {assignedLibrary ? (
                            <div className="mt-3 p-3 bg-green-50 rounded-md">
                              <p className="text-green-800 font-medium">Assigned to:</p>
                              <p className="text-green-700">{assignedLibrary.name}</p>
                              <p className="text-green-600 text-xs">{city?.name}, {city?.state}</p>
                            </div>
                          ) : (
                            <div className="mt-3 p-3 bg-yellow-50 rounded-md">
                              <p className="text-yellow-800 font-medium">Not Assigned</p>
                              <button
                                onClick={() => {
                                  setAssignForm({ librarianId: librarian.id, libraryId: '' });
                                  setShowAssignModal(true);
                                }}
                                className="text-yellow-700 hover:text-yellow-900 text-xs underline mt-1"
                              >
                                Assign to Library
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* City Form Modal */}
          <CityForm
            isOpen={showCityModal}
            onClose={() => {
              setShowCityModal(false);
              setEditingCity(null);
            }}
            onSubmit={handleCreateCity}
            initialData={editingCity}
            title={editingCity ? 'Edit City' : 'Add New City'}
            submitButtonText={editingCity ? 'Update City' : 'Add City'}
          />

          {/* Library Modal */}
          {showLibraryModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {editingLibrary ? 'Edit Library' : 'Add New Library'}
                  </h3>
                  <form onSubmit={handleCreateLibrary}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Library Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={libraryForm.name}
                        onChange={(e) => setLibraryForm({ ...libraryForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Enter library name"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <textarea
                        value={libraryForm.address}
                        onChange={(e) => setLibraryForm({ ...libraryForm, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Enter library address"
                        rows="3"
                      />
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <select
                        required
                        value={libraryForm.cityId}
                        onChange={(e) => {
                          console.log('Selected city ID:', e.target.value);
                          setLibraryForm({ ...libraryForm, cityId: e.target.value });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Select a city</option>
                        {cities.map((city) => (
                          <option key={city.id} value={city.id}>
                            {city.name}, {city.state}
                          </option>
                        ))}
                      </select>
                      {cities.length === 0 && (
                        <p className="mt-2 text-sm text-red-600">
                          No cities available. Please add a city first.
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowLibraryModal(false);
                          setEditingLibrary(null);
                          setLibraryForm({ name: '', address: '', cityId: '', librarianId: '' });
                          setError(null);
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                      >
                        {editingLibrary ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Librarian Modal */}
          {showLibrarianModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-10 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {editingLibrarian ? 'Edit Librarian' : 'Add New Librarian'}
                  </h3>
                  <form onSubmit={handleCreateLibrarian}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={librarianForm.name}
                        onChange={(e) => setLibrarianForm({ ...librarianForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter librarian name"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={librarianForm.email}
                        onChange={(e) => setLibrarianForm({ ...librarianForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter email address"
                      />
                    </div>
                    {!editingLibrarian && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Password *
                        </label>
                        <input
                          type="password"
                          required={!editingLibrarian}
                          value={librarianForm.password}
                          onChange={(e) => setLibrarianForm({ ...librarianForm, password: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Enter password"
                        />
                      </div>
                    )}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={librarianForm.phone}
                        onChange={(e) => setLibrarianForm({ ...librarianForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Library Assignment
                      </label>
                      <select
                        value={librarianForm.libraryId}
                        onChange={(e) => setLibrarianForm({ ...librarianForm, libraryId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">No assignment</option>
                        {libraries.map((library) => {
                          const city = cities.find(c => c.id === library.cityId);
                          return (
                            <option key={library.id} value={library.id}>
                              {library.name} ({city?.name})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowLibrarianModal(false);
                          setEditingLibrarian(null);
                          setLibrarianForm({ name: '', email: '', password: '', phone: '', address: '', libraryId: '' });
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                      >
                        {editingLibrarian ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Assign Librarian Modal */}
          {showAssignModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Assign Librarian to Library
                  </h3>
                  <form onSubmit={handleAssignLibrarian}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Librarian *
                      </label>
                      <select
                        required
                        value={assignForm.librarianId}
                        onChange={(e) => setAssignForm({ ...assignForm, librarianId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Choose a librarian</option>
                        {librarians.filter(lib => !lib.libraryId).map((librarian) => (
                          <option key={librarian.id} value={librarian.id}>
                            {librarian.name} ({librarian.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Library *
                      </label>
                      <select
                        required
                        value={assignForm.libraryId}
                        onChange={(e) => setAssignForm({ ...assignForm, libraryId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Choose a library</option>
                        {libraries.map((library) => {
                          const city = cities.find(c => c.id === library.cityId);
                          return (
                            <option key={library.id} value={library.id}>
                              {library.name} ({city?.name})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAssignModal(false);
                          setAssignForm({ librarianId: '', libraryId: '' });
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                      >
                        Assign
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (() => {
            const filteredMembers = members
              .filter(m => {
                const homeLib = libraries.find(l => l.id === m.homeLibraryId);
                const city = homeLib ? cities.find(c => c.id === homeLib.cityId) : null;
                const q = memberSearch.toLowerCase();
                const matchSearch = !q || m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || homeLib?.name?.toLowerCase().includes(q);
                const matchCity = memberFilterCity === 'all' || city?.id === parseInt(memberFilterCity);
                const matchLib = memberFilterLibrary === 'all' || m.homeLibraryId === parseInt(memberFilterLibrary);
                return matchSearch && matchCity && matchLib;
              })
              .sort((a, b) => {
                if (memberSort === 'name') return a.name?.localeCompare(b.name);
                if (memberSort === 'email') return a.email?.localeCompare(b.email);
                if (memberSort === 'joined') return new Date(b.createdAt) - new Date(a.createdAt);
                return 0;
              });

            const filteredLibsForMember = memberFilterCity === 'all'
              ? libraries
              : libraries.filter(l => l.cityId === parseInt(memberFilterCity));

            return (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-white drop-shadow">Members ({filteredMembers.length} / {members.length})</h2>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <input
                    type="text"
                    placeholder="Search name, email, library..."
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                  />
                  <select value={memberFilterCity} onChange={e => { setMemberFilterCity(e.target.value); setMemberFilterLibrary('all'); }}
                    className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="all">All Cities</option>
                    {cities.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                      <option key={c.id} value={c.id}>{c.name}, {c.state}</option>
                    ))}
                  </select>
                  <select value={memberFilterLibrary} onChange={e => setMemberFilterLibrary(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="all">All Libraries</option>
                    {filteredLibsForMember.sort((a, b) => a.name.localeCompare(b.name)).map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                  <select value={memberSort} onChange={e => setMemberSort(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="name">Sort: Name A-Z</option>
                    <option value="email">Sort: Email</option>
                    <option value="joined">Sort: Newest First</option>
                  </select>
                  {(memberSearch || memberFilterCity !== 'all' || memberFilterLibrary !== 'all') && (
                    <button onClick={() => { setMemberSearch(''); setMemberFilterCity('all'); setMemberFilterLibrary('all'); }}
                      className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-sm hover:bg-red-200">
                      Clear Filters
                    </button>
                  )}
                </div>

                <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Home Library</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredMembers.map((member, index) => {
                        const homeLib = libraries.find(l => l.id === member.homeLibraryId);
                        const city = homeLib ? cities.find(c => c.id === homeLib.cityId) : null;
                        return (
                          <tr key={member.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 text-sm text-gray-500">{index + 1}</td>
                            <td className="px-6 py-3">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold mr-3">
                                  {member.name?.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-gray-900">{member.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600">{member.email}</td>
                            <td className="px-6 py-3 text-sm text-gray-700">{homeLib?.name || <span className="text-gray-400 italic">Not assigned</span>}</td>
                            <td className="px-6 py-3 text-sm text-gray-600">{city ? `${city.name}, ${city.state}` : '—'}</td>
                            <td className="px-6 py-3 text-sm text-gray-500">
                              {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredMembers.length === 0 && (
                    <div className="text-center py-12 text-gray-500">No members match the filters.</div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
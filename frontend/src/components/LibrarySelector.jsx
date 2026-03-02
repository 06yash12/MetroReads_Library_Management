import { useState, useEffect } from 'react';
import api from '../services/api';
import ErrorMessage from './ErrorMessage';

const LibrarySelector = ({ onLibrarySelected, currentLibrary }) => {
  const [cities, setCities] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedLibrary, setSelectedLibrary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [librarySearchTerm, setLibrarySearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [filterState, setFilterState] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid | list

  useEffect(() => { fetchCities(); }, []);

  const fetchCities = async () => {
    try {
      setLoading(true);
      const response = await api.get('/member/cities');
      if (response.data.success) setCities(response.data.data);
    } catch { setError('Failed to load cities'); }
    finally { setLoading(false); }
  };

  const fetchLibraries = async (cityId) => {
    try {
      setLoading(true);
      const response = await api.get(`/member/cities/${cityId}/libraries`);
      if (response.data.success) { setLibraries(response.data.data); setStep(2); }
    } catch { setError('Failed to load libraries'); }
    finally { setLoading(false); }
  };

  const handleCitySelect = (cityId) => {
    setSelectedCity(cityId);
    setSelectedLibrary('');
    fetchLibraries(cityId);
  };

  const handleLibrarySelect = (libraryId) => { setSelectedLibrary(libraryId); setStep(3); };

  const confirmLibrarySelection = async () => {
    try {
      setLoading(true);
      const response = await api.put('/member/home-library', { libraryId: parseInt(selectedLibrary) });
      if (response.data.success) onLibrarySelected(response.data.data.homeLibrary);
    } catch { setError('Failed to set home library'); }
    finally { setLoading(false); }
  };

  const selectedCityData = cities.find(c => c.id === parseInt(selectedCity));
  const selectedLibraryData = libraries.find(l => l.id === parseInt(selectedLibrary));

  // Unique states for filter dropdown
  const uniqueStates = [...new Set(cities.map(c => c.state))].sort();

  // Filter + sort cities
  const filteredCities = cities
    .filter(city =>
      (city.name.toLowerCase().includes(citySearchTerm.toLowerCase()) ||
        city.state.toLowerCase().includes(citySearchTerm.toLowerCase())) &&
      (filterState === '' || city.state === filterState)
    )
    .sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'libraries-desc') return (b.libraryCount || 0) - (a.libraryCount || 0);
      if (sortBy === 'libraries-asc') return (a.libraryCount || 0) - (b.libraryCount || 0);
      return 0;
    });

  const filteredLibraries = libraries.filter(lib =>
    lib.name.toLowerCase().includes(librarySearchTerm.toLowerCase()) ||
    lib.address.toLowerCase().includes(librarySearchTerm.toLowerCase())
  );

  const StepIndicator = () => (
    <div className="flex items-center flex-shrink-0">
      {[['1', 'Select City'], ['2', 'Select Library'], ['3', 'Confirm']].map(([num, label], i) => (
        <div key={num} className="flex items-center">
          {i > 0 && <div className={`mx-3 w-16 h-0.5 ${step > i ? 'bg-blue-600' : 'bg-gray-200'}`} />}
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{num}</div>
            <span className="text-sm font-medium text-gray-600">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full">
      <div className="bg-white rounded-xl shadow-md p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          {/* Title */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {currentLibrary ? 'Change Your Home Library' : 'Select Your Home Library'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">Choose a library to browse books and make requests</p>
          </div>

          {/* Step Indicator */}
          <StepIndicator />
        </div>

        {error && <ErrorMessage message={error} onClose={() => setError('')} />}

        {/* Step 1: City Selection */}
        {step === 1 && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Choose Your City</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {filteredCities.length} cities found
              </div>
            </div>

            {/* Controls Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
              {/* Search */}
              <div className="relative sm:col-span-2">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search cities..."
                  value={citySearchTerm}
                  onChange={e => setCitySearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filter by State */}
              <select
                value={filterState}
                onChange={e => setFilterState(e.target.value)}
                className="py-2 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All States</option>
                {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="py-2 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
                <option value="libraries-desc">Most Libraries</option>
                <option value="libraries-asc">Fewest Libraries</option>
              </select>
            </div>


            {loading ? (
              <div className="text-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-2 text-gray-500 text-sm">Loading cities...</p>
              </div>
            ) : filteredCities.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">No cities found.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredCities.map(city => (
                  <button
                    key={city.id}
                    onClick={() => handleCitySelect(city.id)}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="font-semibold text-gray-900 text-sm">{city.name}</div>
                    <div className="text-xs text-gray-500">{city.state}, {city.country}</div>
                    <div className="text-xs text-blue-600 mt-1">{city.libraryCount} {city.libraryCount === 1 ? 'library' : 'libraries'}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Library Selection */}
        {step === 2 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Libraries in {selectedCityData?.name}</h3>
              <button onClick={() => setStep(1)} className="text-blue-600 hover:text-blue-800 text-sm">← Change City</button>
            </div>
            <div className="relative mb-4">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search libraries..."
                value={librarySearchTerm}
                onChange={e => setLibrarySearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {loading ? (
              <div className="text-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredLibraries.map(library => (
                  <button
                    key={library.id}
                    onClick={() => handleLibrarySelect(library.id)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="font-semibold text-gray-900">{library.name}</div>
                    <div className="text-sm text-gray-500 mt-1">{library.address}</div>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className="text-blue-600 font-medium">{library.stats.availableBooks} available</span>
                      <span className="text-gray-400">{library.stats.totalBooks} total</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Confirm Your Selection</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-gray-900 text-lg">{selectedLibraryData?.name}</div>
                  <div className="text-sm text-gray-600 mt-1">{selectedLibraryData?.address}</div>
                  <div className="text-sm text-gray-500">{selectedCityData?.name}, {selectedCityData?.state}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-blue-600 font-semibold">{selectedLibraryData?.stats.availableBooks} books available</div>
                  <div className="text-gray-500">{selectedLibraryData?.stats.activeMembers} active members</div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium">Back</button>
              <button onClick={confirmLibrarySelection} disabled={loading} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                {loading ? 'Setting...' : 'Confirm Selection'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibrarySelector;

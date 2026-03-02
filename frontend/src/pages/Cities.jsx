import { useState, useEffect } from 'react';
import { FiMapPin, FiBook, FiHome, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import axios from 'axios';

const Cities = () => {
    const [cities, setCities] = useState([]);
    const [libraries, setLibraries] = useState({});
    const [books, setBooks] = useState({});
    const [openCity, setOpenCity] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCities = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/cities/public`);
                setCities(res.data.data || []);
            } catch {
                setCities([]);
            } finally {
                setLoading(false);
            }
        };
        fetchCities();
    }, []);

    const handleCityClick = async (city) => {
        if (openCity === city.id) { setOpenCity(null); return; }
        setOpenCity(city.id);

        // fetch libraries for city if not cached
        if (!libraries[city.id]) {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/libraries/by-city/${city.id}`);
                const libs = res.data.data || res.data || [];
                setLibraries(prev => ({ ...prev, [city.id]: libs }));

                // fetch books for each library
                libs.forEach(async (lib) => {
                    if (!books[lib.id]) {
                        try {
                            const bRes = await axios.get(`${import.meta.env.VITE_API_URL}/books?libraryId=${lib.id}`);
                            setBooks(prev => ({ ...prev, [lib.id]: bRes.data.data || bRes.data || [] }));
                        } catch {
                            setBooks(prev => ({ ...prev, [lib.id]: [] }));
                        }
                    }
                });
            } catch {
                setLibraries(prev => ({ ...prev, [city.id]: [] }));
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Cities</h1>
                <p className="text-gray-500 text-sm mb-8">Browse libraries and books available in each city.</p>

                {loading ? (
                    <p className="text-gray-400 text-sm">Loading cities...</p>
                ) : cities.length === 0 ? (
                    <p className="text-gray-400 text-sm">No cities available.</p>
                ) : (
                    <div className="space-y-3">
                        {cities.map(city => (
                            <div key={city.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                {/* City header */}
                                <button
                                    onClick={() => handleCityClick(city)}
                                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <FiMapPin className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-semibold text-gray-900">{city.name}</p>
                                            {city.state && <p className="text-xs text-gray-400">{city.state}</p>}
                                        </div>
                                    </div>
                                    {openCity === city.id
                                        ? <FiChevronUp className="w-4 h-4 text-gray-400" />
                                        : <FiChevronDown className="w-4 h-4 text-gray-400" />}
                                </button>

                                {/* Libraries */}
                                {openCity === city.id && (
                                    <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                                        {!libraries[city.id] ? (
                                            <p className="text-xs text-gray-400">Loading libraries...</p>
                                        ) : libraries[city.id].length === 0 ? (
                                            <p className="text-xs text-gray-400">No libraries in this city yet.</p>
                                        ) : libraries[city.id].map(lib => (
                                            <div key={lib.id}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <FiHome className="w-3.5 h-3.5 text-purple-500" />
                                                    <p className="text-xs font-semibold text-gray-800">{lib.name}</p>
                                                    {lib.address && <span className="text-xs text-gray-400">— {lib.address}</span>}
                                                </div>
                                                {/* Books */}
                                                <div className="ml-5">
                                                    {!books[lib.id] ? (
                                                        <p className="text-xs text-gray-400">Loading books...</p>
                                                    ) : books[lib.id].length === 0 ? (
                                                        <p className="text-xs text-gray-400">No books available.</p>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {books[lib.id].slice(0, 10).map(book => (
                                                                <span key={book.id} className="flex items-center gap-1 text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                                    <FiBook className="w-2.5 h-2.5" />
                                                                    {book.title}
                                                                </span>
                                                            ))}
                                                            {books[lib.id].length > 10 && (
                                                                <span className="text-[11px] text-gray-400 px-2 py-0.5">+{books[lib.id].length - 10} more</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Cities;

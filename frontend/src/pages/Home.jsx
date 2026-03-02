import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookService } from '../services/api';
import { FiSearch, FiMapPin, FiBook, FiUsers, FiArrowRight, FiBookOpen, FiBarChart, FiChevronDown } from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner';
import IndiaMap from '../components/IndiaMap';
import axios from 'axios';

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [email, setEmail] = useState('');
  const [availableCities, setAvailableCities] = useState({});
  const [allBooks, setAllBooks] = useState([]);
  const [stats, setStats] = useState({ cities: 0, libraries: 0, books: 0, members: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/stats`);
        setStats(response.data);
      } catch {
        setStats({ cities: 0, libraries: 0, books: 0, members: 0 });
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/cities/public`);
        if (response.data && response.data.data) {
          const citiesByState = {};
          response.data.data.forEach(city => {
            const stateName = city.state || 'Other';
            if (!citiesByState[stateName]) citiesByState[stateName] = [];
            citiesByState[stateName].push(city.name);
          });
          const sortedCities = {};
          Object.keys(citiesByState).sort().forEach(state => {
            sortedCities[state] = citiesByState[state].sort();
          });
          setAvailableCities(sortedCities);
        }
      } catch {
        setAvailableCities({});
      }
    };
    fetchCities();
  }, []);

  useEffect(() => {
    const fetchAllBooks = async () => {
      try {
        const response = await bookService.getBooks('');
        setAllBooks(response.data || []);
      } catch {
        setAllBooks([]);
      }
    };
    fetchAllBooks();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const response = await bookService.getBooks(searchQuery);
      setSearchResults(response.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    alert('Thank you for subscribing!');
    setEmail('');
  };

  return (
    <>
      <style>{`
        select[size="1"] option, select[size="1"] optgroup { font-size: 14px; }
        select:focus { max-height: 200px; overflow-y: auto; }
      `}</style>
      <div className="min-h-screen bg-white">

        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}}></div>
          </div>
          <div className="relative max-w-[1600px] mx-auto px-4 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              {/* Left Content */}
              <div className="text-white">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-yellow-300 text-lg">✦</span>
                  <span className="text-yellow-200 font-semibold italic text-lg tracking-wide" style={{textShadow:'0 0 20px rgba(253,224,71,0.4)'}}>Open Books, Open Minds</span>
                  <span className="text-yellow-300 text-lg">✦</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight whitespace-nowrap">
                  Your City's Library, <span className="text-yellow-300">Now at Your Fingertips</span>
                </h1>
                <div className="text-lg text-blue-100 mb-5 leading-relaxed space-y-1">
                  <p className="whitespace-nowrap">Browse thousands of books across libraries in your city and beyond.</p>
                  <p className="whitespace-nowrap">Request any book online and pick it up at your nearest branch — no waiting, no paperwork.</p>
                  <p className="whitespace-nowrap">MetroReads connects readers with libraries across multiple cities, making borrowing as easy as a few taps.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link to="/signup" className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 rounded-lg font-bold hover:bg-gray-50 transition-all shadow-xl hover:shadow-2xl">
                    Join for Free <FiArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                  <Link to="/login-select" className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-white rounded-lg font-bold hover:bg-white hover:text-blue-600 transition-all">
                    Explore Libraries
                  </Link>
                </div>
              </div>

              {/* Right — Animated Stats Card */}
              <div className="hidden lg:flex justify-end items-center">
                <style>{`
                  @keyframes floatCard { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
                  @keyframes countUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
                  @keyframes pulseRing { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.5);opacity:0} }
                  @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
                  .stat-card { animation: floatCard 4s ease-in-out infinite; }
                  .stat-card:nth-child(2) { animation-delay: 0.5s; }
                  .stat-card:nth-child(3) { animation-delay: 1s; }
                  .stat-card:nth-child(4) { animation-delay: 1.5s; }
                  .stat-num { animation: countUp 0.8s ease forwards; }
                  .pulse-ring::after { content:''; position:absolute; inset:0; border-radius:50%; border:2px solid #fde047; animation:pulseRing 2s ease-out infinite; }
                  .shimmer-border { background:linear-gradient(90deg,rgba(255,255,255,0.1) 25%,rgba(255,255,255,0.3) 50%,rgba(255,255,255,0.1) 75%); background-size:200% auto; animation:shimmer 3s linear infinite; }
                  .stat-item:hover .stat-icon-wrap { transform:scale(1.15) rotate(-5deg); transition:transform 0.3s ease; }
                `}</style>
                <div className="relative w-fit">
                  <div className="absolute -top-6 -left-6 w-32 h-32 bg-yellow-400 rounded-full opacity-20 blur-2xl"></div>
                  <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-purple-500 rounded-full opacity-20 blur-2xl"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl transform rotate-6 opacity-10"></div>
                  <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl w-fit">
                    <div className="absolute top-0 left-6 right-6 h-px shimmer-border rounded-full"></div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { icon: FiMapPin,   value: stats.cities,    label: 'Cities',    delay: '0s' },
                        { icon: FiBook,     value: stats.libraries, label: 'Libraries', delay: '0.15s' },
                        { icon: FiBookOpen, value: stats.books,     label: 'Books',     delay: '0.3s' },
                        { icon: FiUsers,    value: stats.members,   label: 'Members',   delay: '0.45s' },
                      ].map(({ icon: Icon, value, label, delay }) => (
                        <div key={label} className="stat-item stat-card group relative bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl px-8 py-3 flex items-center gap-4 cursor-default transition-all duration-300 hover:shadow-lg hover:shadow-yellow-400/10 border border-white/10 hover:border-white/30" style={{ animationDelay: delay }}>
                          <div className="pulse-ring relative w-12 h-12 bg-white/10 rounded-full flex-shrink-0 flex items-center justify-center group-hover:bg-yellow-400/20 transition-colors duration-300">
                            <div className="stat-icon-wrap transition-transform duration-300">
                              <Icon className="w-6 h-6 text-yellow-300 group-hover:text-yellow-200" />
                            </div>
                          </div>
                          <div>
                            <div className="stat-num text-2xl font-extrabold text-white leading-none" style={{ animationDelay: delay }}>{value.toLocaleString()}</div>
                            <div className="text-xs font-semibold text-blue-200 uppercase tracking-widest group-hover:text-yellow-200 transition-colors duration-300 mt-1">{label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 text-center">
                      <p className="text-xs text-blue-200/70 tracking-wide">Live data · Updated in real time</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Stats Bar - Removed */}
        </div>

        {/* Search Results */}
        {hasSearched && (
          <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-12">
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <FiSearch className="w-6 h-6 mr-3 text-blue-600" />
                Search Results {searchResults.length > 0 && `(${searchResults.length})`}
              </h3>
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.map((book) => (
                    <div key={book.id} className="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-xl hover:border-blue-300 transition-all">
                      <div className="flex items-start space-x-4">
                        <div className="w-20 h-28 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FiBook className="w-10 h-10 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 mb-1 truncate">{book.title}</h4>
                          <p className="text-sm text-gray-600 mb-3">by {book.author}</p>
                          <Link to={`/books/${book.id}`} className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium">
                            View Details <FiArrowRight className="w-4 h-4 ml-1" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FiBook className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No books found. Try different keywords.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        {!hasSearched && (
          <>
            {/* Search Section */}
            <div className="bg-gray-50 py-6">
              <div className="max-w-[1600px] mx-auto px-4 lg:px-8">
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Find Your Next Book - Search through thousands of books in our collection</h2>
                </div>
                <div className="max-w-3xl mx-auto">
                  <form onSubmit={handleSearch}>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for books, authors, or ISBN..."
                        className="w-full pl-6 pr-36 py-5 text-lg rounded-2xl border-2 border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all shadow-lg"
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center"
                      >
                        {loading ? <LoadingSpinner size="small" text="" /> : (
                          <><FiSearch className="w-5 h-5 mr-2" />Search</>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Available Books Section */}
            <div className="py-6 bg-white">
              <div className="max-w-[1600px] mx-auto px-4 lg:px-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Available Books</h2>
                <div className="overflow-hidden relative">
                  <div id="books-carousel" className="flex gap-4 overflow-x-auto pb-4 scroll-smooth hide-scrollbar">
                    {allBooks.length > 0 ? allBooks.map((book, index) => {
                      const coverMap = {
                        '2 States': '2 States by Chetan Bhagat.jpg',
                        'A Suitable Boy': 'A Suitable Boy by Vikram Seth.jpg',
                        'Shantaram': 'Divakaruni Shantaram by Gregory David Roberts.jpg',
                        'Five Point Someone': 'Five Point Someone by Chetan Bhagat.jpg',
                        'Interpreter of Maladies': 'Interpreter of Maladies by Jhumpa Lahiri.jpg',
                        'Malgudi Days': 'Malgudi Days by R.K. Narayan.jpg',
                        "Midnight's Children": "Midnight's Children by Salman Rushdie.jpg",
                        'My Experiments with Truth': 'My Experiments with Truth by Mahatma Gandhi.jpg',
                        'Sacred Games': 'Sacred Games by Vikram Chandra.jpg',
                        'The Discovery of India': 'The Discovery of India by Jawaharlal Nehru.jpg',
                        'The God of Small Things': 'The God of Small Things by Arundhati Roy.jpg',
                        'The Guide': 'The Guide by R.K. Narayan.jpg',
                        'The Immortals of Meluha': 'The Immortals of Meluha by Amish Tripathi.jpg',
                        'The Inheritance of Loss': 'The Inheritance of Loss by Kiran Desai.jpg',
                        'The Namesake': 'The Namesake by Jhumpa Lahiri.jpg',
                        'The Palace of Illusions': 'The Palace of Illusions by Chitra Banerjee.jpg',
                        'The Rozabal Line': 'The Rozabal Line by Ashwin Sangh.jpg',
                        'The White Tiger': 'The White Tiger by Aravind Adiga.jpg',
                        'Train to Pakistan': 'Train to Pakistan by Khushwant Singh.jpg',
                        'Wings of Fire': 'Wings of Fire by A.P.J. Abdul Kalam.jpg'
                      };
                      const imagePath = coverMap[book.title]
                        ? `/book_covers/${coverMap[book.title]}`
                        : `/book_covers/${book.title} by ${book.author}.jpg`;
                      return (
                        <div key={index} className="flex-shrink-0 w-36">
                          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden mb-2 h-[200px] shadow-md">
                            <img
                              src={imagePath}
                              alt={book.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg></div>';
                              }}
                            />
                          </div>
                          <h3 className="text-sm font-bold text-gray-900 truncate mb-1">{book.title}</h3>
                          <p className="text-sm text-gray-600 truncate">by {book.author}</p>
                        </div>
                      );
                    }) : (
                      <div className="flex items-center justify-center w-full text-gray-500">
                        <p className="text-sm">Loading books...</p>
                      </div>
                    )}
                  </div>
                  {allBooks.length > 4 && (
                    <>
                      <button onClick={() => { const c = document.getElementById('books-carousel'); if (c) c.scrollLeft -= 200; }} className="absolute left-2 top-[100px] -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg z-10">
                        <FiArrowRight className="w-6 h-6 text-gray-700 rotate-180" />
                      </button>
                      <button onClick={() => { const c = document.getElementById('books-carousel'); if (c) c.scrollLeft += 200; }} className="absolute right-2 top-[100px] -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg z-10">
                        <FiArrowRight className="w-6 h-6 text-gray-700" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* India Map Section */}
            <div className="py-6 bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="max-w-[1600px] mx-auto px-4 lg:px-8">
                <div className="border-2 border-gray-300 rounded-2xl p-4 bg-white shadow-lg mt-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    <div className="flex flex-col justify-between space-y-4 w-full">
                      <div className="w-full flex-1">
                        <div className="text-center mb-4">
                          <h2 className="text-2xl font-bold text-gray-900">Key Features</h2>
                          <p className="text-sm text-gray-600 mt-1">Powerful tools to streamline your library operations</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { icon: FiMapPin,   title: "Multi-City Network",    description: "Manage libraries across multiple cities" },
                            { icon: FiBook,     title: "Digital Book Catalog",  description: "Browse and search thousands of books with advanced filters" },
                            { icon: FiUsers,    title: "Member Management",     description: "Track memberships, loans, and reading history seamlessly" },
                            { icon: FiBookOpen, title: "Easy Book Loans",       description: "Simple checkout system with automated due date tracking" },
                            { icon: FiBarChart, title: "Analytics & Reports",   description: "Track circulation and performance insights" },
                            { icon: FiSearch,   title: "Smart Search",          description: "Find books instantly by title, author, ISBN, or genre" },
                          ].map((feature, index) => (
                            <div key={index} className="flex flex-col items-center text-center p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl hover:shadow-lg transition-shadow">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-2">
                                <feature.icon className="w-6 h-6 text-white" />
                              </div>
                              <h3 className="text-sm font-bold text-gray-900 mb-1">{feature.title}</h3>
                              <p className="text-xs text-gray-600 leading-tight">{feature.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        <div className="bg-white p-3 rounded-xl shadow-lg w-full">
                          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Stay Connected</h2>
                          <form onSubmit={handleSubscribe}>
                            <div className="flex flex-col gap-2">
                              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" required />
                              <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md text-base">Subscribe</button>
                            </div>
                          </form>
                        </div>
                        <div className="bg-white p-3 rounded-xl shadow-lg overflow-visible w-full">
                          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Select Your City</h2>
                          <div className="flex flex-col gap-2">
                            <div className="relative z-50">
                              <select className="w-full px-4 py-3.5 pr-12 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white appearance-none cursor-pointer overflow-y-auto" defaultValue="" size="1">
                                <option value="" disabled>Select your city</option>
                                {Object.keys(availableCities).length > 0 ? (
                                  Object.keys(availableCities).map(state => (
                                    <optgroup key={state} label={state}>
                                      {availableCities[state].map(city => (
                                        <option key={`${state}-${city}`} value={city.toLowerCase().replace(/\s+/g, '-')}>{city}</option>
                                      ))}
                                    </optgroup>
                                  ))
                                ) : (
                                  <option value="" disabled>Loading cities...</option>
                                )}
                              </select>
                              <FiChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                            </div>
                            <button className="w-full py-3.5 bg-gradient-to-r from-green-600 to-teal-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-teal-700 transition-all shadow-md text-base">Find Libraries</button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-full">
                      <div className="w-full h-full border-2 border-gray-300 rounded-xl p-3">
                        <IndiaMap />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="bg-gray-900 text-white border-t border-gray-800">
          <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-5">
            <style>{`
              @keyframes fadeSlideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
              .tagline-item { opacity:0; animation:fadeSlideUp 0.6s ease forwards; }
              .tagline-item:nth-child(1) { animation-delay:0.1s; }
              .tagline-item:nth-child(2) { animation-delay:0.4s; }
              .tagline-item:nth-child(3) { animation-delay:0.7s; }
            `}</style>
            <div className="grid grid-cols-3 gap-4 items-center">

              {/* LEFT */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <img src="/book_covers/MetroReads.png" alt="MetroReads" className="w-8 h-8 object-contain" />
                  <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">MetroReads</span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-1 whitespace-nowrap">
                  A digital library platform connecting readers with books across multiple cities.
                </p>
                <div className="flex items-center gap-0">
                  {['Your city.', 'Your library.', 'Your books.'].map((text, i, arr) => (
                    <span key={text} className="tagline-item flex items-center gap-1 text-sm italic text-gray-500">
                      <span className="text-yellow-500">✦</span>
                      {text}
                      {i < arr.length - 1 && <span className="text-gray-600 mx-1.5 not-italic">·</span>}
                    </span>
                  ))}
                </div>
              </div>

              {/* CENTER */}
              <div className="flex flex-col items-center gap-1">
                <img src="/book_covers/Book.png" alt="Book" className="w-20 h-20 object-contain opacity-50" />
                <p className="text-xs text-white font-medium">© 2025 MetroReads. All rights reserved.</p>
              </div>

              {/* RIGHT */}
              <div className="flex flex-col gap-3 items-end">
                <div className="w-full">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Quick Links</h3>
                  <div className="flex flex-wrap items-center gap-0 text-xs text-gray-400">
                    {[
                      { to: '/signup', label: 'Sign as Member' },
                      { to: '/login', label: 'Login as Member' },
                      { to: '/login/librarian', label: 'Login as Librarian' },
                      { to: '/cities', label: 'Cities' },
                      { to: '/faq', label: 'FAQ' },
                      { to: '/about', label: 'About' },
                    ].map(({ to, label }, i, arr) => (
                      <span key={label} className="flex items-center">
                        <Link to={to} className="hover:text-blue-400 transition-colors px-2 py-0.5">{label}</Link>
                        {i < arr.length - 1 && <span className="text-gray-700">|</span>}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="w-full">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Contact</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span className="font-medium text-gray-300">Yash Sidram Gajaksoh</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      Indian
                    </span>
                    <a href="mailto:06yash12@gmail.com" className="flex items-center gap-1 hover:text-blue-400 transition-colors">
                      <svg className="w-3 h-3 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                      06yash12@gmail.com
                    </a>
                    <a href="https://github.com/06yash12" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-400 transition-colors">
                      <svg className="w-3 h-3 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                      github.com/06yash12
                    </a>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Home;

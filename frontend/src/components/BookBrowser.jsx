import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ErrorMessage from './ErrorMessage';

const BookBrowser = ({ libraryId }) => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [requestingBook, setRequestingBook] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [sortBy, setSortBy] = useState('title-asc');
  const [filterAvail, setFilterAvail] = useState('all');

  useEffect(() => {
    if (libraryId) {
      fetchBooks();
    }
  }, [libraryId, searchTerm]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '100',
        offset: '0'
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const response = await api.get(`/member/library/${libraryId}/books?${params}`);
      if (response.data.success) {
        setBooks(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch books:', error);
      setError('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const handleBookRequest = async (book) => {
    try {
      setRequestingBook(book.id);
      setError('');
      
      // Use the first available copy
      const bookCopyId = book.availableCopies[0]?.id;
      
      if (!bookCopyId) {
        setError('No copies available for this book');
        return;
      }
      
      const response = await api.post('/member/requests', {
        bookCopyId,
        libraryId,
        notes: `Request for "${book.title}" by ${book.author}`
      });
      
      if (response.data.success) {
        setSuccessMessage(`Request submitted for "${book.title}". You'll be notified when it's approved.`);
        // Remove the book from available list or update its status
        setBooks(prevBooks => 
          prevBooks.map(b => 
            b.id === book.id 
              ? { ...b, totalAvailable: Math.max(0, b.totalAvailable - 1) }
              : b
          ).filter(b => b.totalAvailable > 0)
        );
      }
    } catch (error) {
      console.error('Failed to request book:', error);
      setError(error.response?.data?.message || 'Failed to submit book request');
    } finally {
      setRequestingBook(null);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Apply filter + sort client-side
  const displayedBooks = books
    .filter(b => {
      if (filterAvail === 'available') return b.totalAvailable > 0;
      if (filterAvail === 'high') return b.totalAvailable >= 3;
      if (filterAvail === 'low') return b.totalAvailable === 1;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title);
      if (sortBy === 'title-desc') return b.title.localeCompare(a.title);
      if (sortBy === 'author-asc') return a.author.localeCompare(b.author);
      if (sortBy === 'copies-desc') return (b.totalAvailable || 0) - (a.totalAvailable || 0);
      if (sortBy === 'copies-asc') return (a.totalAvailable || 0) - (b.totalAvailable || 0);
      return 0;
    });

  return (
    <div>
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-gray-900">Browse Available Books</h2>
          <span className="text-sm text-gray-500">{displayedBooks.length} books</span>
        </div>

        {/* Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search books by title or author..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="title-asc">Title A–Z</option>
            <option value="title-desc">Title Z–A</option>
            <option value="author-asc">Author A–Z</option>
            <option value="copies-desc">Most Copies</option>
            <option value="copies-asc">Fewest Copies</option>
          </select>

          {/* Availability Filter */}
          <select
            value={filterAvail}
            onChange={e => setFilterAvail(e.target.value)}
            className="py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Books</option>
            <option value="available">Available Only</option>
            <option value="high">High Stock (3+)</option>
            <option value="low">Low Stock (1 left)</option>
          </select>
        </div>
      </div>

      {error && (
        <ErrorMessage message={error} onClose={() => setError('')} />
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setSuccessMessage('')}
                className="text-green-400 hover:text-green-600"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading books...</p>
        </div>
      ) : displayedBooks.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No books found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search terms.' : 'No books are currently available in this library.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {displayedBooks.map((book) => (
            <div key={book.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-row overflow-hidden">
              {/* Image Section - Left Side */}
              <div className="flex-shrink-0" style={{ width: '110px' }}>
                {book.imageUrl ? (
                  <img
                    src={book.imageUrl}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Details Section - Right Side */}
              <div className="p-3 flex flex-col flex-grow gap-2">
                {/* Centered Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center flex-grow flex flex-col justify-center">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">
                    {book.title}
                  </h3>
                  <p className="text-xs text-gray-600 mb-2">by {book.author}</p>
                  
                  <div className="mb-1 flex justify-center">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {book.totalAvailable} available
                    </span>
                  </div>
                  
                  {book.isbn && (
                    <p className="text-xs text-gray-500">
                      ISBN: {book.isbn}
                    </p>
                  )}
                </div>
                
                {/* Request Button */}
                <div>
                  <button
                    onClick={() => handleBookRequest(book)}
                    disabled={requestingBook === book.id || book.totalAvailable === 0}
                    className={`w-full px-2 py-2 rounded-lg text-xs font-semibold transition-colors duration-200 ${
                      book.totalAvailable > 0 && requestingBook !== book.id
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {requestingBook === book.id ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Requesting...
                      </div>
                    ) : book.totalAvailable === 0 ? (
                      'Not Available'
                    ) : (
                      'Request Book'
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookBrowser;
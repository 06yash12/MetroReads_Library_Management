import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiBook } from 'react-icons/fi';
import { bookService, loanService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const BookDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [borrowing, setBorrowing] = useState(false);

  const fetchBook = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookService.getBook(id);
      setBook(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch book details');
      if (err.response?.status === 404) {
        setTimeout(() => navigate('/'), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchBook();
    }
  }, [id]);

  const handleRetry = () => {
    fetchBook();
  };

  const handleBorrow = async () => {
    if (!isAuthenticated) {
      alert('Please login to borrow books');
      return;
    }

    const availableCopies = book.copies?.filter(copy => copy.status === 'AVAILABLE').length || 0;
    if (availableCopies === 0) {
      alert('No copies available');
      return;
    }

    try {
      setBorrowing(true);
      await loanService.borrowBook(book.id);
      alert('Book borrowed successfully!');
      // Refresh book data to update availability
      fetchBook();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to borrow book');
    } finally {
      setBorrowing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading book details..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ErrorMessage message={error} onRetry={handleRetry} />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Book not found</h2>
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-4">
          <Link
            to="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Back to Books
          </Link>
        </div>
      </div>

      {/* Main Content (compact row) */}
      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-4 flex items-center space-x-4" style={{ minHeight: '150px' }}>
          <img
            src={book.imageUrl || 'https://via.placeholder.com/150x150/f3f4f6/9ca3af?text=No+Image'}
            alt={book.title}
            className="w-24 h-24 object-cover rounded"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/150x150/f3f4f6/9ca3af?text=No+Image';
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 truncate">{book.title}</h1>
                <p className="text-sm text-gray-600">by {book.author}</p>
                {book.isbn && (
                  <p className="text-xs text-gray-500 mt-1">ISBN: {book.isbn}</p>
                )}
              </div>
              <div className="text-right">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                  (book.copies?.filter(copy => copy.status === 'AVAILABLE').length || 0) > 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {(book.copies?.filter(copy => copy.status === 'AVAILABLE').length || 0)} available
                </span>
                <div className="mt-1 text-xs text-gray-600">
                  Total: {book._count?.copies || book.totalCopies || 0}
                </div>
              </div>
            </div>
            {book.description && (
              <p className="mt-2 text-sm text-gray-700 line-clamp-2">{book.description}</p>
            )}
            <div className="mt-3 flex items-center space-x-3">
              {isAuthenticated ? (
                <button
                  onClick={handleBorrow}
                  disabled={borrowing || (book.copies?.filter(copy => copy.status === 'AVAILABLE').length || 0) === 0}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    (book.copies?.filter(copy => copy.status === 'AVAILABLE').length || 0) > 0 && !borrowing
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {borrowing ? 'Borrowing...' : 'Borrow Book'}
                </button>
              ) : (
                <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                  Login to Borrow
                </Link>
              )}
              <Link to="/" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50">
                Browse Books
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookDetails;
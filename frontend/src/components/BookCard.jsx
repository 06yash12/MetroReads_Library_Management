import { Link } from 'react-router-dom';
import { useState } from 'react';
import { loanService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const BookCard = ({ book, onBorrowSuccess }) => {
  const { isAuthenticated } = useAuth();
  const [borrowing, setBorrowing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const availableCopies = book.copies?.filter(copy => copy.status === 'AVAILABLE').length || 0;

  const handleBorrow = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      alert('Please login to borrow books');
      return;
    }

    if (availableCopies === 0) {
      alert('No copies available');
      return;
    }

    try {
      setBorrowing(true);
      await loanService.borrowBook(book.id);
      alert('Book borrowed successfully!');
      if (onBorrowSuccess) {
        onBorrowSuccess();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to borrow book');
    } finally {
      setBorrowing(false);
    }
  };

  const handleImageClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowImageModal(true);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-row overflow-hidden">
        {/* Image Frame Section - Left Side */}
        <div 
          className="relative bg-white cursor-pointer group flex-shrink-0"
          onClick={handleImageClick}
          style={{ width: '200px' }}
        >
          <div className="w-full h-full flex items-center justify-center p-3">
            <img
              src={book.imageUrl || '/placeholder-book.jpg'}
              alt={book.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/200x300/f3f4f6/9ca3af?text=No+Image';
              }}
            />
          </div>
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
            <span className="text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs font-medium bg-white bg-opacity-90 px-3 py-1.5 rounded shadow-lg">
              Click to enlarge
            </span>
          </div>
        </div>

        {/* Text Details Section - Right Side */}
        <div className="p-5 flex flex-col flex-grow bg-white">
          <Link to={`/books/${book.id}`}>
            <h3 className="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
              {book.title}
            </h3>
          </Link>
          
          <p className="text-base text-gray-600 mb-3">by {book.author}</p>
          
          <div className="mb-3">
            <span className={`inline-flex px-3 py-1.5 text-sm font-semibold rounded-full ${
              availableCopies > 0 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {availableCopies > 0 ? `${availableCopies} available` : 'Not available'}
            </span>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            ISBN: {book.isbn}
          </p>

          <div className="mt-auto">
            <button
              onClick={handleBorrow}
              disabled={borrowing || availableCopies === 0}
              className={`w-full px-4 py-3 rounded-lg text-base font-semibold transition-colors duration-200 ${
                availableCopies > 0 && !borrowing
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {borrowing ? 'Requesting...' : 'Request Book'}
            </button>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={book.imageUrl || '/placeholder-book.jpg'}
              alt={book.title}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/600x800/f3f4f6/9ca3af?text=No+Image';
              }}
            />
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg">
              <h3 className="text-xl font-bold mb-1">{book.title}</h3>
              <p className="text-sm text-gray-300">by {book.author}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BookCard;
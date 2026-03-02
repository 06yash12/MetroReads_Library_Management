import { useState, useEffect } from 'react';
import { FiBook, FiDownload, FiRefreshCw, FiEye, FiUsers, FiClock, FiAlertTriangle, FiPlus, FiEdit, FiX, FiTrash2 } from 'react-icons/fi';
import { bookService } from '../services/api';

const LibraryBookList = ({ libraryId, libraryName }) => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showBookForm, setShowBookForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [isbnPreview, setIsbnPreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);
  const [selectedBookCopies, setSelectedBookCopies] = useState(null); // for eye popup
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    description: '',
    imageUrl: '',
    totalCopies: 1
  });

  useEffect(() => {
    if (libraryId) {
      fetchBooks();
    }
  }, [libraryId]);

  // Fetch ISBN preview when totalCopies changes
  useEffect(() => {
    if (libraryId && bookForm.totalCopies > 0 && !editingBook) {
      fetchIsbnPreview();
    }
  }, [libraryId, bookForm.totalCopies, editingBook]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookService.getLibraryBookStatus(libraryId);
      setBooks(response.data || []);
    } catch (err) {
      console.error('Error fetching library books:', err);
      setError('Failed to fetch books');
    } finally {
      setLoading(false);
    }
  };

  const fetchIsbnPreview = async () => {
    try {
      const response = await bookService.previewIsbn(libraryId, bookForm.totalCopies);
      setIsbnPreview(response.data);
    } catch (err) {
      console.error('Error fetching ISBN preview:', err);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setBookForm({ ...bookForm, imageUrl: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateBook = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const bookData = {
        ...bookForm,
        libraryId: libraryId
      };
      
      if (editingBook) {
        await bookService.updateBook(editingBook.id, bookData);
      } else {
        const response = await bookService.createBook(bookData);
        console.log('Book created:', response);
      }
      
      // Reset form
      setBookForm({
        title: '',
        author: '',
        description: '',
        imageUrl: '',
        totalCopies: 1
      });
      setShowBookForm(false);
      setEditingBook(null);
      setIsbnPreview(null);
      setImageFile(null);
      setImagePreview('');
      
      // Refresh the book list
      await fetchBooks();
    } catch (err) {
      console.error('Error saving book:', err);
      setError(err.response?.data?.message || 'Failed to save book');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBook = (book) => {
    setEditingBook(book);
    setBookForm({
      title: book.title,
      author: book.author,
      description: book.description || '',
      imageUrl: book.imageUrl || '',
      totalCopies: book.totalCopies
    });
    setShowBookForm(true);
  };

  const handleCancelForm = () => {
    setShowBookForm(false);
    setEditingBook(null);
    setIsbnPreview(null);
    setImageFile(null);
    setImagePreview('');
    setBookForm({
      title: '',
      author: '',
      description: '',
      imageUrl: '',
      totalCopies: 1
    });
  };

  const handleDeleteClick = (book) => {
    setBookToDelete(book);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!bookToDelete) return;
    
    try {
      setLoading(true);
      setError(null);
      await bookService.deleteBook(bookToDelete.id);
      
      // Close modal and reset
      setShowDeleteModal(false);
      setBookToDelete(null);
      
      // Refresh the book list
      await fetchBooks();
    } catch (err) {
      console.error('Error deleting book:', err);
      setError(err.response?.data?.message || 'Failed to delete book');
      setShowDeleteModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setBookToDelete(null);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedBooks = (books || [])
    .filter(book => 
      (book.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (book.author || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (book.isbn || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';
      
      if (sortBy === 'title' || sortBy === 'author') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const exportToCSV = () => {
    const headers = [
      'ISBN No',
      'Book Name', 
      'Author',
      'Total Copies',
      'In Loan',
      'In Library Now',
      'Available',
      'Reserved',
      'Maintenance',
      'Lost'
    ];
    
    const csvData = filteredAndSortedBooks.map(book => [
      book.isbn || '',
      book.title || '',
      book.author || '',
      book.totalCopies || 0,
      book.loaned || 0,
      (book.totalCopies || 0) - (book.loaned || 0),
      book.available || 0,
      book.reserved || 0,
      book.maintenance || 0,
      book.lost || 0
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${libraryName}_books_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (book) => {
    if ((book.lost || 0) > 0) return 'text-red-600';
    if ((book.maintenance || 0) > 0) return 'text-yellow-600';
    if ((book.loaned || 0) > 0) return 'text-blue-600';
    return 'text-green-600';
  };

  const getStatusIcon = (book) => {
    if ((book.lost || 0) > 0) return <FiAlertTriangle className="w-4 h-4" />;
    if ((book.maintenance || 0) > 0) return <FiClock className="w-4 h-4" />;
    if ((book.loaned || 0) > 0) return <FiUsers className="w-4 h-4" />;
    return <FiBook className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <FiRefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-600">Loading books...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchBooks}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Library Books</h2>
          <p className="text-gray-600">Manage books in your library • {books.length} books available</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBookForm(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <FiPlus className="w-4 h-4 mr-2" />
            Add Book
          </button>
          <button
            onClick={fetchBooks}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FiRefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            <FiDownload className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by title, author, or ISBN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Books Table */}
      {filteredAndSortedBooks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <FiBook className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold mb-2">No Books Found</h3>
          <p>
            {searchTerm 
              ? 'No books match your search criteria.' 
              : 'Your library doesn\'t have any books yet. Start building your collection by adding your first book.'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('isbn')}
                  >
                    <div className="flex items-center">
                      ISBN No
                      {sortBy === 'isbn' && (
                        <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      Book Name
                      {sortBy === 'title' && (
                        <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('author')}
                  >
                    <div className="flex items-center">
                      Author
                      {sortBy === 'author' && (
                        <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Copies</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In Loan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In Library Now</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reserved</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Maintenance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lost</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedBookCopies(book)}
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="View Copies"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditBook(book)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Edit Book"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(book)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete Book"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {/* Derive ISBN from first copy's copyId to ensure it matches this library */}
                      {book.copies?.[0]?.copyId
                        ? book.copies[0].copyId.replace(/-\d+$/, '')
                        : book.isbn || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className="font-medium">{book.title || 'Untitled'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {book.author || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      {book.totalCopies || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                      {book.loaned || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                      {(book.totalCopies || 0) - (book.loaned || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {book.available || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                      {book.reserved || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                      {book.maintenance || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {book.lost || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {filteredAndSortedBooks.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {filteredAndSortedBooks.reduce((sum, book) => sum + (book.totalCopies || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Total Copies</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {filteredAndSortedBooks.reduce((sum, book) => sum + (book.loaned || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">On Loan</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {filteredAndSortedBooks.reduce((sum, book) => sum + (book.available || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {filteredAndSortedBooks.reduce((sum, book) => sum + (book.lost || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Lost</div>
            </div>
          </div>
        </div>
      )}

      {/* Copies Detail Popup */}
      {selectedBookCopies && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedBookCopies.title}</h2>
                <p className="text-sm text-gray-500">
                  {selectedBookCopies.author} • ISBN: {
                    // Derive ISBN from the first copy's copyId (strip the -1, -2 suffix)
                    selectedBookCopies.copies?.[0]?.copyId
                      ? selectedBookCopies.copies[0].copyId.replace(/-\d+$/, '')
                      : selectedBookCopies.isbn
                  }
                </p>
              </div>
              <button onClick={() => setSelectedBookCopies(null)} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {(selectedBookCopies.copies || []).map((copy, index) => {
                const statusColors = {
                  AVAILABLE: 'bg-green-100 text-green-700 border-green-200',
                  LOANED: 'bg-blue-100 text-blue-700 border-blue-200',
                  RESERVED: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                  MAINTENANCE: 'bg-orange-100 text-orange-700 border-orange-200',
                  LOST: 'bg-red-100 text-red-700 border-red-200',
                };
                const colorClass = statusColors[copy.status] || 'bg-gray-100 text-gray-700 border-gray-200';
                return (
                  <div key={copy.id} className={`flex items-center justify-between p-3 rounded-lg border ${colorClass}`}>
                    <div>
                      <p className="font-mono font-semibold text-sm">{copy.copyId}</p>
                      <p className="text-xs opacity-75">Copy {index + 1}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colorClass}`}>
                      {copy.status}
                    </span>
                  </div>
                );
              })}
              {(!selectedBookCopies.copies || selectedBookCopies.copies.length === 0) && (
                <p className="text-center text-gray-500 py-4">No copies found</p>
              )}
            </div>
            <div className="px-5 pb-5 grid grid-cols-3 gap-3 text-center border-t pt-4">
              <div className="bg-green-50 rounded-lg p-2">
                <p className="text-lg font-bold text-green-600">{selectedBookCopies.available || 0}</p>
                <p className="text-xs text-gray-600">Available</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2">
                <p className="text-lg font-bold text-blue-600">{selectedBookCopies.loaned || 0}</p>
                <p className="text-xs text-gray-600">Loaned</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-2">
                <p className="text-lg font-bold text-orange-600">{selectedBookCopies.maintenance || 0}</p>
                <p className="text-xs text-gray-600">Maintenance</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book Form Modal */}
      {showBookForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <FiBook className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-900">
                  {editingBook ? 'Edit Book' : 'Add New Book'}
                </h2>
              </div>
              <button
                onClick={handleCancelForm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateBook} className="p-6 space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <FiAlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              )}

              {/* ISBN Preview Section */}
              {!editingBook && isbnPreview && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-blue-900">ISBN Preview</h3>
                    <span className="text-xs text-blue-600">{isbnPreview.libraryName}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">ISBN:</span>
                      <span className="text-lg font-mono font-bold text-blue-600">{isbnPreview.isbn}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-gray-700">Copy IDs:</span>
                      <div className="flex flex-wrap gap-2">
                        {isbnPreview.copies.map((copyId, index) => (
                          <span key={index} className="px-2 py-1 bg-white border border-blue-300 rounded text-sm font-mono text-blue-700">
                            {copyId}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Book Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bookForm.title}
                    onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter book title"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Author <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter author name"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Total Copies <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={bookForm.totalCopies}
                    onChange={(e) => setBookForm({ ...bookForm, totalCopies: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Number of copies"
                  />
                  <p className="text-xs text-gray-500">Change this to see updated copy IDs above</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Description
                </label>
                <textarea
                  value={bookForm.description}
                  onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter book description (optional)"
                />
              </div>

              {/* Image Upload Section */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Book Cover Image
                </label>
                <div className="flex items-start space-x-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Upload from device or enter URL below</p>
                  </div>
                  {(imagePreview || bookForm.imageUrl) && (
                    <div className="w-24 h-32 border border-gray-300 rounded-lg overflow-hidden">
                      <img 
                        src={imagePreview || bookForm.imageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
                <input
                  type="url"
                  value={!imageFile ? bookForm.imageUrl : ''}
                  onChange={(e) => {
                    setImageFile(null);
                    setImagePreview('');
                    setBookForm({ ...bookForm, imageUrl: e.target.value });
                  }}
                  disabled={!!imageFile}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="Or enter image URL"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : (editingBook ? 'Update Book' : `Create Book with ISBN: ${isbnPreview?.isbn || '...'}`)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && bookToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <FiAlertTriangle className="w-6 h-6 text-red-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-900">Delete Book</h2>
              </div>
              <button
                onClick={handleDeleteCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-gray-700">
                Are you sure you want to delete this book?
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-start">
                  <span className="text-sm font-semibold text-gray-700 w-20">Title:</span>
                  <span className="text-sm text-gray-900 flex-1">{bookToDelete.title}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-sm font-semibold text-gray-700 w-20">Author:</span>
                  <span className="text-sm text-gray-900 flex-1">{bookToDelete.author}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-sm font-semibold text-gray-700 w-20">ISBN:</span>
                  <span className="text-sm text-gray-900 flex-1 font-mono">{bookToDelete.isbn}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-sm font-semibold text-gray-700 w-20">Copies:</span>
                  <span className="text-sm text-gray-900 flex-1">{bookToDelete.totalCopies}</span>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This action cannot be undone. All copies and associated data will be permanently deleted.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Deleting...' : 'Delete Book'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryBookList;

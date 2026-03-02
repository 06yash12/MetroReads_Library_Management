import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loanService } from '../services/api';
import { FiBook, FiCalendar, FiClock } from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const MyLoans = () => {
  const [activeLoans, setActiveLoans] = useState([]);
  const [loanHistory, setLoanHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [requestingReturnId, setRequestingReturnId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [activeResponse, historyResponse] = await Promise.all([
        loanService.getMyLoans(),
        loanService.getMyHistory()
      ]);
      
      setActiveLoans(activeResponse.data || []);
      setLoanHistory(historyResponse.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch loans');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysUntilDue = (dueDate) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isOverdue = (dueDate) => {
    return getDaysUntilDue(dueDate) < 0;
  };

  const handleRequestReturn = async (loanId) => {
    try {
      setRequestingReturnId(loanId);
      const notes = '';
      await loanService.requestReturn(loanId, notes);
      setToastMessage('Return requested. Please visit the library to complete the return.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request return');
    } finally {
      setRequestingReturnId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading your loans..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Library</h1>
          <p className="text-gray-600">Manage your borrowed books and loan history</p>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onRetry={fetchLoans} />
          </div>
        )}

        {!error && (
          <>
            {/* Tabs */}
            <div className="mb-6">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'active'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Active Loans ({activeLoans.length})
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'history'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Loan History ({loanHistory.length})
                </button>
              </nav>
            </div>

            {/* Active Loans Tab */}
            {activeTab === 'active' && (
              <div>
                {activeLoans.length === 0 ? (
                  <div className="text-center py-12">
                    <FiBook className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No active loans
                    </h3>
                    <p className="text-gray-600 mb-4">
                      You don't have any books currently borrowed.
                    </p>
                    <Link
                      to="/"
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Browse Books
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {activeLoans.map((loan) => (
                      <div key={loan.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex items-stretch min-h-[120px]">
                        {/* Cover */}
                        <div className="w-20 flex-shrink-0">
                          <img
                            src={loan.bookCopy.book.imageUrl || 'https://via.placeholder.com/80x120/f3f4f6/9ca3af?text=Book'}
                            alt={loan.bookCopy.book.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/80x120/f3f4f6/9ca3af?text=Book'; }}
                          />
                        </div>
                        {/* Book info */}
                        <div className="flex-1 px-4 py-3 border-r border-gray-100 flex flex-col justify-center">
                          <Link to={`/books/${loan.bookCopy.book.id}`} className="font-semibold text-gray-900 hover:text-blue-600 text-sm">
                            {loan.bookCopy.book.title}
                          </Link>
                          <p className="text-xs text-gray-500 mt-0.5">by {loan.bookCopy.book.author}</p>
                          <p className="text-xs text-gray-400 mt-1">Borrowed: {formatDate(loan.borrowedAt)}</p>
                        </div>
                        {/* Dates */}
                        <div className="px-4 py-3 border-r border-gray-100 flex flex-col justify-center min-w-[150px]">
                          <p className="text-xs text-gray-500 mb-0.5">Due Date</p>
                          <p className="text-sm font-medium text-gray-800">{formatDate(loan.dueDate)}</p>
                          <p className={`text-xs mt-1 font-medium ${isOverdue(loan.dueDate) ? 'text-red-500' : getDaysUntilDue(loan.dueDate) <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {isOverdue(loan.dueDate) ? `Overdue by ${Math.abs(getDaysUntilDue(loan.dueDate))} days` : `${getDaysUntilDue(loan.dueDate)} days left`}
                          </p>
                        </div>
                        {/* Actions */}
                        <div className="px-4 py-3 flex flex-col items-center justify-center gap-2 min-w-[140px]">
                          <button
                            onClick={() => handleRequestReturn(loan.id)}
                            disabled={requestingReturnId === loan.id}
                            className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {requestingReturnId === loan.id ? 'Requesting...' : '↩ Request Return'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Loan History Tab */}
            {activeTab === 'history' && (
              <div>
                {loanHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <FiBook className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No loan history
                    </h3>
                    <p className="text-gray-600">
                      You haven't borrowed any books yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {loanHistory.map((loan) => (
                      <div key={loan.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex items-stretch min-h-[120px]">
                        {/* Cover */}
                        <div className="w-20 flex-shrink-0">
                          <img
                            src={loan.bookCopy.book.imageUrl || 'https://via.placeholder.com/80x120/f3f4f6/9ca3af?text=Book'}
                            alt={loan.bookCopy.book.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/80x120/f3f4f6/9ca3af?text=Book'; }}
                          />
                        </div>
                        {/* Book info */}
                        <div className="flex-1 px-4 py-3 border-r border-gray-100 flex flex-col justify-center">
                          <Link to={`/books/${loan.bookCopy.book.id}`} className="font-semibold text-gray-900 hover:text-blue-600 text-sm">
                            {loan.bookCopy.book.title}
                          </Link>
                          <p className="text-xs text-gray-500 mt-0.5">by {loan.bookCopy.book.author}</p>
                          <p className="text-xs text-gray-400 mt-1">Borrowed: {formatDate(loan.borrowedAt)}</p>
                        </div>
                        {/* Dates */}
                        <div className="px-4 py-3 border-r border-gray-100 flex flex-col justify-center min-w-[160px]">
                          <p className="text-xs text-gray-500 mb-0.5">Due Date</p>
                          <p className="text-sm font-medium text-gray-800">{formatDate(loan.dueDate)}</p>
                          {loan.returnedAt && (
                            <>
                              <p className="text-xs text-gray-500 mt-2 mb-0.5">Returned</p>
                              <p className="text-sm font-medium text-green-700">{formatDate(loan.returnedAt)}</p>
                            </>
                          )}
                        </div>
                        {/* Status */}
                        <div className="px-5 py-3 flex items-center justify-center min-w-[130px]">
                          <span className={`inline-flex items-center px-3 py-2 rounded-lg text-xs font-bold tracking-wide border ${
                            loan.status === 'RETURNED'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : loan.status === 'OVERDUE'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {loan.status === 'RETURNED' ? '✓ Returned' : loan.status === 'OVERDUE' ? '⚠ Overdue' : loan.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-3 rounded shadow-lg">
          <span>{toastMessage}</span>
          <button className="ml-3 underline" onClick={() => setToastMessage('')}>Close</button>
        </div>
      )}
    </div>
  );
};

export default MyLoans;
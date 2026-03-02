import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ErrorMessage from './ErrorMessage';

const LoanManager = () => {
  const [activeLoans, setActiveLoans] = useState([]);
  const [loanHistory, setLoanHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [processingLoan, setProcessingLoan] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (activeTab === 'active') {
      fetchActiveLoans();
    } else {
      fetchLoanHistory();
    }
  }, [activeTab]);

  const fetchActiveLoans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/member/loans/active');
      if (response.data.success) {
        setActiveLoans(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch active loans:', error);
      setError('Failed to load active loans');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoanHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/member/loans/history');
      if (response.data.success) {
        setLoanHistory(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch loan history:', error);
      setError('Failed to load loan history');
    } finally {
      setLoading(false);
    }
  };

  const handleReissue = async (loanId) => {
    try {
      setProcessingLoan(loanId);
      setError('');
      
      const response = await api.post(`/member/loans/${loanId}/reissue`);
      
      if (response.data.success) {
        setSuccessMessage('Loan extended successfully!');
        // Refresh active loans to show updated due date
        fetchActiveLoans();
      }
    } catch (error) {
      console.error('Failed to reissue loan:', error);
      setError(error.response?.data?.message || 'Failed to extend loan');
    } finally {
      setProcessingLoan(null);
    }
  };

  const handleReturnRequest = async (loanId) => {
    try {
      setProcessingLoan(loanId);
      setError('');
      
      const response = await api.post(`/member/loans/${loanId}/return-request`, {
        notes: 'Return requested by member'
      });
      
      if (response.data.success) {
        setSuccessMessage('Return request submitted. Please visit the library to complete the return.');
      }
    } catch (error) {
      console.error('Failed to submit return request:', error);
      setError(error.response?.data?.message || 'Failed to submit return request');
    } finally {
      setProcessingLoan(null);
    }
  };

  const getStatusBadge = (status, daysUntilDue) => {
    if (status === 'OVERDUE') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Overdue</span>;
    }
    
    if (status === 'RETURNED') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Returned</span>;
    }
    
    if (daysUntilDue <= 0) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Due Today</span>;
    }
    
    if (daysUntilDue <= 3) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Due Soon</span>;
    }
    
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Active</span>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">My Loans</h2>
        
        {/* Filter Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('active')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'active'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Active Loans
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Loan History
            </button>
          </nav>
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
          <p className="mt-4 text-gray-600">Loading loans...</p>
        </div>
      ) : (
        <>
          {/* Active Loans */}
          {activeTab === 'active' && (
            <>
              {activeLoans.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No active loans</h3>
                  <p className="mt-1 text-sm text-gray-500">You don't have any books currently borrowed.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeLoans.map((loan) => (
                    <div key={loan.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex items-stretch min-h-[110px]">
                      {/* Cover */}
                      <div className="w-20 flex-shrink-0 bg-gray-100">
                        {loan.book.imageUrl ? (
                          <img src={loan.book.imageUrl} alt={loan.book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                          </div>
                        )}
                      </div>
                      {/* Book info */}
                      <div className="flex-1 px-4 py-3 border-r border-gray-100 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-sm font-semibold text-gray-900">{loan.book.title}</h3>
                          {getStatusBadge(loan.status, loan.daysUntilDue)}
                        </div>
                        <p className="text-xs text-gray-500">by {loan.book.author}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{loan.library.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Borrowed: {formatDate(loan.borrowedAt)}</p>
                      </div>
                      {/* Dates */}
                      <div className="px-4 py-3 border-r border-gray-100 flex flex-col justify-center min-w-[150px]">
                        <p className="text-xs text-gray-500 mb-0.5">Due Date</p>
                        <p className={`text-sm font-medium ${loan.daysUntilDue <= 0 ? 'text-red-600' : loan.daysUntilDue <= 3 ? 'text-yellow-600' : 'text-gray-800'}`}>
                          {formatDate(loan.dueDate)} {loan.daysUntilDue > 0 && <span className="text-xs text-gray-400">({loan.daysUntilDue}d)</span>}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Extensions: {loan.reissueCount}/2</p>
                        {loan.fineAmount > 0 && <p className="text-xs text-red-500 mt-1">Fine: ${loan.fineAmount.toFixed(2)}</p>}
                      </div>
                      {/* Actions */}
                      <div className="px-4 py-3 flex flex-col items-center justify-center gap-2 min-w-[140px]">
                        {loan.canReissue && (
                          <button
                            onClick={() => handleReissue(loan.id)}
                            disabled={processingLoan === loan.id}
                            className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                          >
                            {processingLoan === loan.id ? 'Extending...' : '↻ Extend Loan'}
                          </button>
                        )}
                        <button
                          onClick={() => handleReturnRequest(loan.id)}
                          disabled={processingLoan === loan.id}
                          className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold text-green-600 bg-green-50 border border-green-200 hover:bg-green-100 disabled:opacity-50 transition-colors"
                        >
                          {processingLoan === loan.id ? 'Processing...' : '↩ Request Return'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Loan History */}
          {activeTab === 'history' && (
            <>
              {loanHistory.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No loan history</h3>
                  <p className="mt-1 text-sm text-gray-500">You haven't borrowed any books yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {loanHistory.map((loan) => (
                    <div key={loan.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex items-stretch min-h-[110px]">
                      {/* Cover */}
                      <div className="w-20 flex-shrink-0 bg-gray-100">
                        {loan.book.imageUrl ? (
                          <img src={loan.book.imageUrl} alt={loan.book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                          </div>
                        )}
                      </div>
                      {/* Book info */}
                      <div className="flex-1 px-4 py-3 border-r border-gray-100 flex flex-col justify-center">
                        <h4 className="text-sm font-semibold text-gray-900 mb-0.5">{loan.book.title}</h4>
                        <p className="text-xs text-gray-500">by {loan.book.author}</p>
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
                        {loan.reissueCount > 0 && <p className="text-xs text-gray-400 mt-1">Extensions: {loan.reissueCount}</p>}
                      </div>
                      {/* Status */}
                      <div className="px-5 py-3 flex items-center justify-center min-w-[130px]">
                        <span className={`inline-flex items-center px-3 py-2 rounded-lg text-xs font-bold border ${
                          loan.status === 'RETURNED' ? 'bg-green-50 text-green-700 border-green-200' :
                          loan.status === 'OVERDUE'  ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {loan.status === 'RETURNED' ? '✓ Returned' : loan.status === 'OVERDUE' ? '⚠ Overdue' : loan.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default LoanManager;
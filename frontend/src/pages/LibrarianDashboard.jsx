import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { libraryService, bookService, loanService } from '../services/api';
import api from '../services/api';
import { FiHome, FiBook, FiUsers, FiActivity, FiPlus, FiEye, FiRotateCcw, FiInbox, FiCheck, FiX, FiClock, FiSquare } from 'react-icons/fi';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import LibraryBookList from '../components/LibraryBookList';
import CodeVerificationModal from '../components/CodeVerificationModal';

const LibrarianDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [library, setLibrary] = useState(null);
  const [books, setBooks] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingIssues, setPendingIssues] = useState([]);
  const [overdueBooks, setOverdueBooks] = useState([]);
  const [activityHistory, setActivityHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [processingRequest, setProcessingRequest] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [expectedBookForVerification, setExpectedBookForVerification] = useState(null);
  const [cancellingIssueId, setCancellingIssueId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    fetchLibrarianData();
  }, []);

  const fetchLibrarianData = async () => {
    try {
      setLoading(true);
      setError(null);

      // debug log removed

      if (!user?.libraryId) {
        setError('No library assigned to your account. Please contact an administrator.');
        setLoading(false);
        return;
      }

      // Fetch library details first
      try {
        const libraryResponse = await libraryService.getLibrary(user.libraryId);
        setLibrary(libraryResponse.data);
        
        // Fetch library stats
        try {
          const statsResponse = await libraryService.getLibraryStats(user.libraryId);
          console.log('Stats response:', statsResponse.data);
          // statsResponse.data contains the full library object with stats property
          if (statsResponse.data && statsResponse.data.stats) {
            setLibrary(prev => ({
              ...prev,
              stats: statsResponse.data.stats
            }));
          }
        } catch (statsErr) {
          console.error('Stats fetch error:', statsErr);
          // Continue without stats
        }
      } catch (libErr) {
        console.error('Library fetch error:', libErr);
        setError('Failed to fetch library details');
        setLoading(false);
        return;
      }

      // Fetch basic data first (books and loans)
      try {
        const [booksResponse, loansResponse] = await Promise.all([
          bookService.getBooks(),
          loanService.getActiveLoans()
        ]);

        // Filter books and loans for this library only
        const libraryBooks = booksResponse.data?.filter(book => 
          book.copies?.some(copy => copy.libraryId === user.libraryId)
        ) || [];
        
        const libraryLoans = loansResponse.data?.filter(loan => 
          loan.bookCopy?.libraryId === user.libraryId
        ) || [];

        setBooks(libraryBooks);
        setActiveLoans(libraryLoans);
      } catch (basicErr) {
        console.error('Basic data fetch error:', basicErr);
        // Continue with empty data rather than failing completely
        setBooks([]);
        setActiveLoans([]);
      }

      // Fetch librarian-specific data (requests, issues, overdue)
      try {
        const [requestsResponse, issuesResponse, overdueResponse] = await Promise.all([
          api.get(`/librarian/requests/pending?libraryId=${user.libraryId}`).catch(err => {
            console.error('Requests fetch error:', err);
            return { data: { data: [] } };
          }),
          api.get(`/librarian/pending-issues?libraryId=${user.libraryId}`).catch(err => {
            console.error('Issues fetch error:', err);
            return { data: { data: [] } };
          }),
          api.get(`/librarian/overdue-books?libraryId=${user.libraryId}`).catch(err => {
            console.error('Overdue fetch error:', err);
            return { data: { data: [] } };
          })
        ]);

        setPendingRequests(requestsResponse.data?.data || []);
        setPendingIssues(issuesResponse.data?.data || []);
        setOverdueBooks(overdueResponse.data?.data || []);

        // Fetch activity history
        try {
          setHistoryLoading(true);
          const historyResponse = await api.get(`/librarian/activity-history?libraryId=${user.libraryId}&limit=50`).catch(() => ({ data: { data: [] } }));
          setActivityHistory(historyResponse.data?.data || []);
        } catch { setActivityHistory([]); } finally { setHistoryLoading(false); }
      } catch (librarianErr) {
        console.error('Librarian data fetch error:', librarianErr);
        // Set empty arrays for librarian data
        setPendingRequests([]);
        setPendingIssues([]);
        setOverdueBooks([]);
      }

    } catch (err) {
      console.error('Fetch librarian data error:', err);
      setError(err.response?.data?.message || 'Failed to fetch library data');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnBook = async (loanId) => {
    try {
      await loanService.returnBook(loanId);
      await fetchLibrarianData(); // Refresh data
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to return book');
    }
  };

  const handleRequestReturnFromMember = async (loanId) => {
    try {
      setProcessingRequest(loanId);
      const note = returnNotesByLoan[loanId] || '';
      await api.post(`/librarian/loans/${loanId}/request-return`, { notes: note });
      setSuccessMessage('Return request sent to member.');
      setReturnNotesByLoan(prev => ({ ...prev, [loanId]: '' }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request return');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleApproveRequest = async (requestId, notes = '') => {
    try {
      setProcessingRequest(requestId);
      setError(null);
      
      const response = await api.post(`/librarian/requests/${requestId}/approve`, {
        notes
      });
      
      if (response.data.success) {
        setSuccessMessage('Request approved successfully! Member will be notified.');
        await fetchLibrarianData(); // Refresh data
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId, rejectionNote) => {
    try {
      setProcessingRequest(requestId);
      setError(null);
      
      const response = await api.post(`/librarian/requests/${requestId}/reject`, {
        rejectionNote
      });
      
      if (response.data.success) {
        setSuccessMessage('Request rejected successfully. Member will be notified.');
        await fetchLibrarianData(); // Refresh data
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleCancelPickup = async (requestId, reason) => {
    try {
      setProcessingRequest(requestId);
      setError(null);
      const response = await api.post(`/librarian/requests/${requestId}/cancel-pickup`, {
        reason: reason || 'Pickup cancelled by librarian'
      });
      if (response.data.success) {
        setSuccessMessage('Pickup cancelled. Member will be notified.');
        setCancellingIssueId(null);
        setCancelReason('');
        await fetchLibrarianData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel pickup');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleVerifyCode = async (code, issueBook = false) => {
    try {
      setVerifyingCode(true);
      
      // First verify the code with expected book information
      const verifyResponse = await api.post('/librarian/verify-code', {
        code,
        verificationType: 'ALPHANUMERIC',
        expectedBook: expectedBookForVerification ? {
          title: expectedBookForVerification.title,
          author: expectedBookForVerification.author
        } : null
      });
      
      if (verifyResponse.data.success) {
        if (issueBook) {
          // Complete the issuance
          await api.post('/librarian/complete-issue', {
            tokenId: verifyResponse.data.data.tokenId,
            notes: 'Book issued via code verification'
          });
          
          setSuccessMessage('Book issued successfully!');
          await fetchLibrarianData(); // Refresh data
          return { success: true };
        } else {
          // Just return verification result
          return {
            success: true,
            data: verifyResponse.data.data
          };
        }
      } else {
        return {
          success: false,
          message: 'Invalid or expired code'
        };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to verify code';
      if (issueBook) {
        setError(errorMessage);
      }
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setVerifyingCode(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const activityConfig = {
    ISSUE:        { label: 'Book Issued',      color: 'bg-blue-100 text-blue-800',    dot: 'bg-blue-500' },
    RETURN:       { label: 'Book Returned',    color: 'bg-green-100 text-green-800',  dot: 'bg-green-500' },
    REISSUE:      { label: 'Reissued',         color: 'bg-purple-100 text-purple-800',dot: 'bg-purple-500' },
    FINE_PAYMENT: { label: 'Fine Paid',        color: 'bg-yellow-100 text-yellow-800',dot: 'bg-yellow-500' },
    APPROVED:     { label: 'Request Approved', color: 'bg-teal-100 text-teal-800',    dot: 'bg-teal-500' },
    REJECTED:     { label: 'Request Rejected', color: 'bg-red-100 text-red-800',      dot: 'bg-red-500' },
  };

  const renderHistory = () => (
    <div className="bg-white rounded-lg shadow-md p-5 h-full">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FiActivity className="w-5 h-5 text-indigo-500" />
        Activity History
      </h2>
      {historyLoading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
      ) : activityHistory.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <FiClock className="mx-auto h-10 w-10 mb-2" />
          <p className="text-sm">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
          {activityHistory.map((item, i) => {
            const cfg = activityConfig[item.transactionType] || { label: item.transactionType, color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' };
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs text-gray-400">{formatDate(item.transactionDate || item.createdAt)}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">
                    {item.bookCopy?.book?.title || item.book?.title || '—'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {item.member?.name || ''}{item.member?.email ? ` · ${item.member.email}` : ''}
                  </p>
                  {item.fineAmount > 0 && (
                    <p className="text-xs text-yellow-600 font-medium">Fine: ${item.fineAmount.toFixed(2)}</p>
                  )}
                  {item.notes && <p className="text-xs text-gray-400 italic truncate">{item.notes}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (loading) {
    return <LoadingSpinner text="Loading librarian dashboard..." />;
  }

  if (!user?.libraryId && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Library Assignment</h2>
          <p className="text-gray-600 mb-4">
            You are not currently assigned to any library. Please contact an administrator to get assigned to a library.
          </p>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Debug Info:</strong><br/>
              User ID: {user?.id}<br/>
              Email: {user?.email}<br/>
              Role: {user?.role}<br/>
              Library ID: {user?.libraryId || 'Not assigned'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div>
      {/* Library Info Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center mb-4">
          <FiHome className="w-8 h-8 text-blue-600 mr-3" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{library?.name}</h2>
            <p className="text-gray-600">{library?.address}</p>
            <p className="text-sm text-gray-500">
              {library?.city?.name}, {library?.city?.state}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <FiBook className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Total Books</h3>
              <p className="text-2xl font-bold text-green-600">
                {library?.stats?.totalBooks || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <FiActivity className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Active Loans</h3>
              <p className="text-2xl font-bold text-blue-600">
                {library?.stats?.activeLoans || activeLoans.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <FiCheck className="w-8 h-8 text-indigo-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Available</h3>
              <p className="text-2xl font-bold text-indigo-600">
                {library?.stats?.availableBooks || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <FiSquare className="w-8 h-8 text-yellow-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Maintenance</h3>
              <p className="text-2xl font-bold text-yellow-600">
                {library?.stats?.maintenanceBooks || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <FiInbox className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Pending Requests</h3>
              <p className="text-2xl font-bold text-orange-600">
                {library?.stats?.pendingRequests ?? pendingRequests.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Loans</h3>
        {activeLoans.length > 0 ? (
          <div className="space-y-4">
            {activeLoans.slice(0, 5).map((loan) => (
              <div key={loan.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{loan.bookCopy?.book?.title}</h4>
                  <p className="text-sm text-gray-600">by {loan.bookCopy?.book?.author}</p>
                  <p className="text-sm text-gray-500">
                    Borrowed by: {loan.user?.name} • Due: {new Date(loan.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleReturnBook(loan.id)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <FiRotateCcw className="w-4 h-4 mr-1" />
                  Return
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No active loans at the moment.</p>
        )}
      </div>
    </div>
  );

  const renderBooks = () => (
    <LibraryBookList 
      libraryId={user.libraryId} 
      libraryName={library?.name || 'Library'} 
    />
  );

  const renderLoans = () => (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Active Loans</h2>
      
      {activeLoans.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Book
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Borrower
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Borrowed Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeLoans.map((loan) => (
                <tr key={loan.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {loan.bookCopy?.book?.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        by {loan.bookCopy?.book?.author}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{loan.user?.name}</div>
                    <div className="text-sm text-gray-500">{loan.user?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(loan.borrowedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      new Date(loan.dueDate) < new Date() 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {new Date(loan.dueDate).toLocaleDateString()}
                    </span>
                  </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {loan.transactions && loan.transactions.length > 0 ? (
                    <button onClick={() => handleReturnBook(loan.id)} className="text-blue-600 hover:text-blue-900">
                      Collect Return
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={returnNotesByLoan[loan.id] || ''}
                        onChange={(e) => setReturnNotesByLoan(prev => ({ ...prev, [loan.id]: e.target.value }))}
                        placeholder="Note to member"
                        className="px-2 py-1 border border-red-300 rounded text-red-700 placeholder-red-400 text-xs"
                      />
                      <button
                        onClick={() => handleRequestReturnFromMember(loan.id)}
                        disabled={processingRequest === loan.id}
                        className="text-red-600 hover:text-red-800"
                      >
                        {processingRequest === loan.id ? 'Requesting...' : 'Request Return'}
                      </button>
                    </div>
                  )}
                </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500">No active loans at the moment.</p>
        </div>
      )}
    </div>
  );

  const renderRequests = () => (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Book Requests</h2>
      
      {pendingRequests.length > 0 ? (
        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center gap-4">
                {/* Book Cover - Extreme Left */}
                <div className="flex-shrink-0">
                  {request.bookCopy.book.imageUrl && (
                    <img
                      src={request.bookCopy.book.imageUrl}
                      alt={request.bookCopy.book.title}
                      className="w-24 h-32 object-cover rounded shadow-md"
                    />
                  )}
                </div>

                {/* Book Info - Center Left Box */}
                <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-center space-y-1">
                    <h3 className="text-base font-semibold text-gray-900">
                      {request.bookCopy.book.title} by {request.bookCopy.book.author}
                    </h3>
                    <div>
                      <span className="text-sm text-gray-600">Status: </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Requested: {formatDate(request.requestDate)}
                    </p>
                  </div>
                </div>

                {/* Member Info - Center Right Box */}
                <div className="flex-1 bg-gray-50 border border-gray-300 rounded-lg p-3">
                  <h4 className="font-semibold text-gray-900 mb-2 text-center text-sm">Member Information</h4>
                  <div className="space-y-1 text-center text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Name:</span>
                      <span className="ml-2 text-gray-600">{request.member.name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Email:</span>
                      <span className="ml-2 text-gray-600">{request.member.email}</span>
                    </div>
                    {request.member.phone && (
                      <div>
                        <span className="font-medium text-gray-700">Phone:</span>
                        <span className="ml-2 text-gray-600">{request.member.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  {request.memberHistory && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="grid grid-cols-3 gap-1 text-xs text-center">
                        <div>
                          <span className="text-gray-500 block">Loans</span>
                          <span className="font-medium">{request.memberHistory.totalLoans}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Overdue</span>
                          <span className={`font-medium ${request.memberHistory.overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {request.memberHistory.overdueCount}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Fines</span>
                          <span className={`font-medium ${request.memberHistory.finesPending > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ${request.memberHistory.finesPending.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons - Right Side */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleApproveRequest(request.id)}
                    disabled={processingRequest === request.id}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    <FiCheck className="w-4 h-4 mr-1" />
                    {processingRequest === request.id ? 'Approving...' : 'Approve'}
                  </button>
                  
                  {rejectingRequestId === request.id ? (
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        value={rejectionNote}
                        onChange={(e) => setRejectionNote(e.target.value)}
                        placeholder="Reason for rejection..."
                        className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            if (rejectionNote.trim()) {
                              handleRejectRequest(request.id, rejectionNote.trim());
                              setRejectingRequestId(null);
                              setRejectionNote('');
                            }
                          }}
                          disabled={!rejectionNote.trim()}
                          className="flex-1 px-2 py-1 text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => { setRejectingRequestId(null); setRejectionNote(''); }}
                          className="flex-1 px-2 py-1 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRejectingRequestId(request.id)}
                      disabled={processingRequest === request.id}
                      className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                    >
                      <FiX className="w-4 h-4 mr-1" />
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FiInbox className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
          <p className="text-gray-500">All book requests have been processed.</p>
        </div>
      )}
    </div>
  );

  const renderPendingIssues = () => (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Pending Pickups</h2>
      <p className="text-sm text-gray-600 mb-6">
        Approved requests waiting for member pickup (24-hour deadline)
      </p>
      
      {pendingIssues.length > 0 ? (
        <div className="space-y-4">
          {pendingIssues.map((issue) => (
            <div key={issue.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {issue.book.title}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      issue.hoursLeft <= 2 ? 'bg-red-100 text-red-800' :
                      issue.hoursLeft <= 6 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {issue.hoursLeft}h left
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-1">by {issue.book.author}</p>
                  <p className="text-sm text-gray-500 mb-3">
                    Member: {issue.member.name} • Approved: {formatDate(issue.approvedDate)}
                  </p>
                  
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Ready for Pickup</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Member has a pickup code. Ask them to show their code and verify it below.
                    </p>
                    <div className="flex flex-wrap gap-2 items-start">
                      <button
                        onClick={() => {
                          setExpectedBookForVerification({
                            title: issue.book.title,
                            author: issue.book.author
                          });
                          setShowCodeModal(true);
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <FiSquare className="w-4 h-4 mr-2" />
                        Verify Pickup Code
                      </button>

                      {cancellingIssueId === issue.id ? (
                        <div className="flex flex-col gap-1 w-64">
                          <input
                            type="text"
                            value={cancelReason}
                            onChange={e => setCancelReason(e.target.value)}
                            placeholder="Reason for cancellation..."
                            className="px-3 py-1.5 text-sm border border-red-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleCancelPickup(issue.id, cancelReason.trim())}
                              disabled={processingRequest === issue.id}
                              className="px-3 py-1.5 text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
                            >
                              {processingRequest === issue.id ? 'Cancelling...' : 'Confirm Cancel'}
                            </button>
                            <button
                              onClick={() => { setCancellingIssueId(null); setCancelReason(''); }}
                              className="px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
                            >
                              Back
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCancellingIssueId(issue.id)}
                          className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                        >
                          <FiX className="w-4 h-4 mr-2" />
                          Cancel Pickup
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FiClock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pending pickups</h3>
          <p className="text-gray-500">No approved requests are waiting for pickup.</p>
        </div>
      )}
    </div>
  );

  const renderOverdueBooks = () => (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Overdue Books</h2>
      
      {overdueBooks.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Book
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days Overdue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fine
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {overdueBooks.map((overdue) => (
                <tr key={overdue.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {overdue.book.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        by {overdue.book.author}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{overdue.member.name}</div>
                    <div className="text-sm text-gray-500">{overdue.member.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(overdue.dueDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                      {overdue.daysOverdue} days
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${overdue.estimatedFine.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FiCheck className="mx-auto h-12 w-12 text-green-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No overdue books</h3>
          <p className="text-gray-500">All books have been returned on time.</p>
        </div>
      )}
    </div>
  );

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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">Librarian Dashboard</h1>
            <p className="text-gray-200 drop-shadow">
              Manage your library: {library?.name}
            </p>
          </div>

          {error && (
            <div className="mb-6">
              <ErrorMessage message={error} onClose={() => setError(null)} inline={true} />
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FiCheck className="h-5 w-5 text-green-400" />
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
                    <FiX className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <nav className="flex space-x-8">
                {[
                  { id: 'overview', label: 'Overview', icon: FiHome },
                  { id: 'requests', label: `Requests (${pendingRequests.length})`, icon: FiInbox },
                  { id: 'pickups', label: `Pickups (${pendingIssues.length})`, icon: FiClock },
                  { id: 'books', label: 'Books', icon: FiBook },
                  { id: 'loans', label: 'Active Loans', icon: FiActivity },
                  { id: 'overdue', label: `Overdue (${overdueBooks.length})`, icon: FiUsers },
                  { id: 'history', label: 'History', icon: FiEye }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      activeTab === tab.id
                        ? 'bg-white bg-opacity-20 text-white shadow-lg'
                        : 'text-gray-200 hover:text-white hover:bg-white hover:bg-opacity-10'
                    }`}
                  >
                    <tab.icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                ))}
              </nav>
              
              <button
                onClick={fetchLibrarianData}
                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 bg-opacity-80 rounded-md hover:bg-opacity-100 transition-colors"
              >
                <FiRotateCcw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-6">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'requests' && renderRequests()}
            {activeTab === 'pickups' && renderPendingIssues()}
            {activeTab === 'books' && renderBooks()}
            {activeTab === 'loans' && renderLoans()}
            {activeTab === 'overdue' && (
              <div>
                {renderOverdueBooks()}
              </div>
            )}
            {activeTab === 'history' && renderHistory()}
          </div>
        </div>
      </div>

      {/* Code Verification Modal */}
      <CodeVerificationModal
        isOpen={showCodeModal}
        onClose={() => {
          setShowCodeModal(false);
          setExpectedBookForVerification(null);
        }}
        onVerify={handleVerifyCode}
        loading={verifyingCode}
        expectedBook={expectedBookForVerification}
      />
    </div>
  );
};

export default LibrarianDashboard;
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import ErrorMessage from './ErrorMessage';

const RequestManager = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [cancellingRequest, setCancellingRequest] = useState(null);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== 'all') {
        params.append('status', activeTab.toUpperCase());
      }

      const response = await api.get(`/member/requests?${params}`);
      if (response.data.success) {
        setRequests(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      setError('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      setCancellingRequest(requestId);
      const response = await api.delete(`/member/requests/${requestId}`);

      if (response.data.success) {
        // Remove the cancelled request from the list
        setRequests(prevRequests =>
          prevRequests.filter(request => request.id !== requestId)
        );
      }
    } catch (error) {
      console.error('Failed to cancel request:', error);
      setError(error.response?.data?.message || 'Failed to cancel request');
    } finally {
      setCancellingRequest(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      APPROVED: { color: 'bg-green-100 text-green-800', text: 'Approved' },
      REJECTED: { color: 'bg-red-100 text-red-800', text: 'Rejected' },
      EXPIRED: { color: 'bg-gray-100 text-gray-800', text: 'Expired' }
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
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

  const getPickupCode = (request) => {
    // Use the alphanumericCode from issueToken if available
    if (request.issueToken && request.issueToken.alphanumericCode) {
      return request.issueToken.alphanumericCode;
    }
    // Fallback to generated code (shouldn't happen for approved requests)
    return generatePickupCode(request.id);
  };

  const generatePickupCode = (requestId) => {
    // Generate a random 6-digit code based on request ID (fallback only)
    const seed = requestId * 7919; // Use prime number for better distribution
    const code = (seed % 900000 + 100000).toString(); // Ensures 6 digits (100000-999999)
    return code;
  };

  const generateQRCode = (request) => {
    // Create QR code data with member name, book name, author, and code
    const code = getPickupCode(request);
    const qrData = `Member: ${user?.name || 'N/A'}\nBook: ${request.book.title}\nAuthor: ${request.book.author}\nCode: ${code}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">My Book Requests</h2>

        {/* Filter Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All Requests' },
              { key: 'pending', label: 'Pending' },
              { key: 'approved', label: 'Approved' },
              { key: 'rejected', label: 'Rejected' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {error && (
        <ErrorMessage message={error} onClose={() => setError('')} />
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No requests found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === 'all'
              ? "You haven't made any book requests yet."
              : `No ${activeTab} requests found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-row overflow-hidden">
              {/* Book Image - Left Side */}
              <div className="flex-shrink-0 bg-gray-50" style={{ width: '220px' }}>
                {request.book.imageUrl ? (
                  <img
                    src={request.book.imageUrl}
                    alt={request.book.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/180x270/f3f4f6/9ca3af?text=No+Image';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Book Details and Pickup Info - Right Side */}
              <div className="p-4 flex flex-grow">
                {/* Left Column - Book Info */}
                <div className="flex-1 flex flex-col justify-between pr-3">
                  <div>
                    {/* Book Title and Author in one box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-center">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {request.book.title}
                      </h3>
                      <p className="text-base text-gray-600">by {request.book.author}</p>
                    </div>

                    {/* Requested date in box */}
                    <div className="bg-white border border-gray-300 rounded-lg p-2.5 mb-2 text-center">
                      <p className="text-xs text-gray-500 mb-0.5">Requested date & time:</p>
                      <p className="text-sm font-medium text-gray-700">{formatDate(request.requestDate)}</p>
                    </div>

                    {/* Pickup by date in box */}
                    {request.pickupDeadline && (
                      <div className="bg-white border border-gray-300 rounded-lg p-2.5 text-center">
                        <p className="text-xs text-gray-500 mb-0.5">Pickup by:</p>
                        <p className="text-sm font-medium text-gray-700">{formatDate(request.pickupDeadline)}</p>
                      </div>
                    )}
                  </div>

                  {/* Status-specific buttons */}
                  <div className="mt-3 flex justify-center">
                    {request.status === 'PENDING' && (
                      <button
                        onClick={() => handleCancelRequest(request.id)}
                        disabled={cancellingRequest === request.id}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancellingRequest === request.id ? 'Cancelling...' : 'Cancel Request'}
                      </button>
                    )}

                    {request.status === 'APPROVED' && (
                      <button className="px-4 py-2 text-sm font-semibold text-green-700 bg-green-100 border border-green-300 rounded cursor-default">
                        ✓ Request Approved
                      </button>
                    )}

                    {request.status === 'REJECTED' && request.rejectionNote && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-800">
                          <span className="font-medium">Rejection reason:</span> {request.rejectionNote}
                        </p>
                        {request.processedBy && (
                          <p className="text-xs text-gray-600 mt-1">
                            <span className="font-medium">Processed by:</span> {request.processedBy}
                          </p>
                        )}
                      </div>
                    )}

                    {request.status === 'EXPIRED' && request.processedBy && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Processed by:</span> {request.processedBy}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Column - Pickup Details (Only for Approved) */}
                {request.status === 'APPROVED' && (
                  <div className="flex-shrink-0 border-l border-gray-200 pl-3" style={{ width: '420px' }}>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 h-full">
                      {/* Top Row: QR Code and Pickup Code side by side */}
                      <div className="flex items-start gap-3 mb-3">
                        {/* Left: QR Code */}
                        <div className="flex-shrink-0">
                          <div className="bg-white p-2 rounded border-2 border-gray-300 shadow-sm">
                            <img
                              src={generateQRCode(request)}
                              alt="Pickup QR Code"
                              className="w-24 h-24"
                            />
                          </div>
                        </div>

                        {/* Right: Pickup Code */}
                        <div className="flex-1">
                          <h4 className="text-xs font-semibold text-gray-700 mb-1.5">Your Pickup Code:</h4>
                          <div className="bg-white px-2.5 py-1.5 rounded border-2 border-blue-300 shadow-sm flex items-center justify-between gap-2">
                            <div className="font-mono text-xl font-bold text-blue-700 tracking-wider">
                              {getPickupCode(request)}
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(getPickupCode(request));
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Copy code"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Bottom: Pickup Instructions in 3 boxes */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-3 text-center">Pickup Instructions:</h4>
                        <div className="space-y-2">
                          <div className="bg-white px-3 py-2 rounded border border-gray-300 shadow-sm">
                            <p className="text-xs text-gray-700 flex items-start">
                              <span className="mr-2">•</span>
                              <span>Visit {request.library.name} during operating hours</span>
                            </p>
                          </div>
                          <div className="bg-white px-3 py-2 rounded border border-gray-300 shadow-sm">
                            <p className="text-xs text-gray-700 flex items-start">
                              <span className="mr-2">•</span>
                              <span>Show your code and ID to the librarian for verification</span>
                            </p>
                          </div>
                          <div className="bg-white px-3 py-2 rounded border border-gray-300 shadow-sm">
                            <p className="text-xs text-gray-700 flex items-start">
                              <span className="mr-2">•</span>
                              <span>Collect your book and enjoy reading!</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RequestManager;
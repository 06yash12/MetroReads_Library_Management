import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FiClock, FiMapPin, FiCopy, FiCheck } from 'react-icons/fi';

const PickupNotification = () => {
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const [dismissedNotifications, setDismissedNotifications] = useState(new Set());
  const [expandedNotifications, setExpandedNotifications] = useState(new Set());

  useEffect(() => {
    fetchApprovedRequests();
  }, []);

  const fetchApprovedRequests = async () => {
    try {
      const response = await api.get('/member/requests?status=APPROVED');
      if (response.data.success) {
        const approved = response.data.data.filter(req => 
          req.status === 'APPROVED' && req.issueToken && req.issueToken.status === 'GENERATED' && new Date(req.pickupDeadline) > new Date()
        );
        setApprovedRequests(approved);
      }
    } catch (error) {
      console.error('Failed to fetch approved requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const formatTimeLeft = (pickupDeadline) => {
    const now = new Date();
    const deadline = new Date(pickupDeadline);
    const hoursLeft = Math.max(0, Math.ceil((deadline - now) / (1000 * 60 * 60)));
    
    if (hoursLeft <= 0) return 'Expired';
    if (hoursLeft < 24) return `${hoursLeft}h left`;
    const daysLeft = Math.ceil(hoursLeft / 24);
    return `${daysLeft}d left`;
  };

  const dismissNotification = (requestId) => {
    setDismissedNotifications(prev => new Set([...prev, requestId]));
  };

  const toggleExpanded = (requestId) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) {
        newSet.delete(requestId);
      } else {
        newSet.add(requestId);
      }
      return newSet;
    });
  };

  if (loading || approvedRequests.length === 0) {
    return null;
  }

  const visibleRequests = approvedRequests.filter(req => !dismissedNotifications.has(req.id));

  if (visibleRequests.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      {visibleRequests.map((request) => {
        const isExpanded = expandedNotifications.has(request.id);
        
        return (
          <div key={request.id} className="mb-2">
            {/* Compact Notification */}
            {!isExpanded ? (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-400 rounded-lg shadow-sm flex items-center justify-between px-3 py-2">
                <div className="flex items-center space-x-2 flex-1">
                  <FiCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-semibold text-green-800">Book is ready for pickup!</span>
                  <span className="text-xs text-gray-600">({request.book.title})</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    formatTimeLeft(request.pickupDeadline).includes('Expired') 
                      ? 'bg-red-100 text-red-800'
                      : formatTimeLeft(request.pickupDeadline).includes('h')
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    <FiClock className="w-3 h-3 mr-1" />
                    {formatTimeLeft(request.pickupDeadline)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleExpanded(request.id)}
                    className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                  >
                    See Details
                  </button>
                  <button
                    onClick={() => dismissNotification(request.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Dismiss notification"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              /* Expanded Notification */
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-400 p-3 rounded-lg shadow-sm relative">
                {/* Close Button */}
                <button
                  onClick={() => dismissNotification(request.id)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Dismiss notification"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-6">
                    <div className="flex items-center space-x-2 mb-1">
                      <FiCheck className="w-4 h-4 text-green-600" />
                      <h3 className="text-sm font-semibold text-green-800">
                        Book Ready for Pickup!
                      </h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        formatTimeLeft(request.pickupDeadline).includes('Expired') 
                          ? 'bg-red-100 text-red-800'
                          : formatTimeLeft(request.pickupDeadline).includes('h')
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        <FiClock className="w-3 h-3 mr-1" />
                        {formatTimeLeft(request.pickupDeadline)}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-700 mb-2">
                      <strong>{request.book.title}</strong> by {request.book.author}
                    </p>
                    
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center text-xs text-gray-600">
                        <FiMapPin className="w-3 h-3 mr-1" />
                        {request.library.name}
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-2 border-2 border-dashed border-green-300">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-0.5">Your Pickup Code:</p>
                          <code className="text-lg font-mono font-bold text-green-700 tracking-wider">
                            {request.issueToken.alphanumericCode}
                          </code>
                        </div>
                        <button
                          onClick={() => copyCode(request.issueToken.alphanumericCode)}
                          className="flex items-center px-2 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
                        >
                          {copiedCode === request.issueToken.alphanumericCode ? (
                            <>
                              <FiCheck className="w-3 h-3 mr-1" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <FiCopy className="w-3 h-3 mr-1" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-600">
                        <p className="font-medium mb-0.5">Pickup Instructions:</p>
                        <ol className="list-decimal list-inside space-y-0.5 text-xs">
                          <li>Visit {request.library.name} during operating hours</li>
                          <li>Show this code to the librarian</li>
                          <li>Present your ID for verification</li>
                          <li>Collect your book and enjoy reading!</li>
                        </ol>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleExpanded(request.id)}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      ← Collapse
                    </button>
                  </div>
                  
                  {request.book.imageUrl && (
                    <div className="ml-3 flex-shrink-0">
                      <img
                        src={request.book.imageUrl}
                        alt={request.book.title}
                        className="w-12 h-16 object-cover rounded shadow-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PickupNotification;
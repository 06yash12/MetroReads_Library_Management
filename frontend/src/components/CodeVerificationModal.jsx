import React, { useState } from 'react';
import { FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';

const CodeVerificationModal = ({ isOpen, onClose, onVerify, loading, expectedBook }) => {
  const [code, setCode] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      setVerificationResult({
        success: false,
        message: 'Please enter a pickup code'
      });
      return;
    }

    try {
      setVerifying(true);
      setVerificationResult(null);
      
      const result = await onVerify(code.trim().toUpperCase());
      
      if (result.success) {
        setVerificationResult({
          success: true,
          message: 'Code verified successfully!',
          data: result.data
        });
      } else {
        setVerificationResult({
          success: false,
          message: result.message || 'Invalid code'
        });
      }
    } catch (error) {
      setVerificationResult({
        success: false,
        message: error.message || 'Verification failed'
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleIssueBook = async () => {
    if (verificationResult?.success && verificationResult.data) {
      try {
        await onVerify(code.trim().toUpperCase(), true); // Issue the book
        handleClose();
      } catch (error) {
        setVerificationResult({
          success: false,
          message: error.message || 'Failed to issue book'
        });
      }
    }
  };

  const handleClose = () => {
    setCode('');
    setVerificationResult(null);
    setVerifying(false);
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !verifying) {
      if (verificationResult?.success) {
        handleIssueBook();
      } else {
        handleVerifyCode();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Verify Pickup Code
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {expectedBook && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Expected Book for Pickup:</h4>
              <p className="text-sm text-blue-800">
                <strong>Title:</strong> {expectedBook.title}
              </p>
              <p className="text-sm text-blue-800">
                <strong>Author:</strong> {expectedBook.author}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                The pickup code must match this specific book.
              </p>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Member's Pickup Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/[^A-Z0-9]/g, '').toUpperCase();
                setCode(value);
              }}
              onKeyPress={handleKeyPress}
              placeholder="XXXXXXXX"
              maxLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg tracking-wider text-center"
              disabled={verifying || loading}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Ask the member to show their pickup code from their dashboard
            </p>
          </div>

          {verificationResult && (
            <div className={`mb-4 p-4 rounded-lg ${
              verificationResult.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {verificationResult.success ? (
                    <FiCheck className="h-5 w-5 text-green-400" />
                  ) : (
                    <FiAlertCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    verificationResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {verificationResult.message}
                  </p>
                  
                  {verificationResult.success && verificationResult.data && (
                    <div className="mt-3 text-sm text-green-700">
                      <div className="bg-white rounded p-3 border">
                        <p><strong>Member:</strong> {verificationResult.data.member.name}</p>
                        <p><strong>Book:</strong> {verificationResult.data.book.title}</p>
                        <p><strong>Author:</strong> {verificationResult.data.book.author}</p>
                        <p><strong>Due Date:</strong> {new Date(verificationResult.data.dueDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={verifying || loading}
            >
              Cancel
            </button>
            
            {verificationResult?.success ? (
              <button
                onClick={handleIssueBook}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Issuing...' : 'Issue Book'}
              </button>
            ) : (
              <button
                onClick={handleVerifyCode}
                disabled={verifying || !code.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {verifying ? 'Verifying...' : 'Verify Code'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeVerificationModal;
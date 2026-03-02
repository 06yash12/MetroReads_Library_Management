import { FiX, FiAlertCircle } from 'react-icons/fi';

const ErrorMessage = ({ message, onRetry, onClose, inline = false }) => {
  if (inline) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <FiAlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="text-sm">{message}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-red-500 hover:text-red-700 ml-2"
          >
            <FiX className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-md">
        <h3 className="font-semibold mb-2">Oops! Something went wrong</h3>
        <p className="text-sm mb-4">{message}</p>
        <div className="flex space-x-2 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200"
            >
              Try Again
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors duration-200"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  let errorMessage = 'An unexpected error occurred';
  
  if (error?.message?.includes('not found')) {
    errorMessage = 'Stablecoin not found. Please check the ticker and try again.';
  } else if (error?.message?.includes('rate limit')) {
    errorMessage = 'API rate limit exceeded. Please try again in a few minutes.';
  } else if (error?.message) {
    errorMessage = error.message;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-12"
    >
      <div className="rounded-full bg-red-100 p-3 mb-4">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
      <p className="text-gray-600 text-center max-w-md mb-6">
        {errorMessage}
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Try Again
      </button>
    </motion.div>
  );
};

export default ErrorState;
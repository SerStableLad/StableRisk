import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SearchBar from './SearchBar';
import RiskReport from './RiskReport';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import { useSearchStablecoin } from '../hooks/useSearchStablecoin';

const Dashboard = () => {
  const [ticker, setTicker] = useState('');
  
  const { 
    data: riskReport, 
    isLoading, 
    isError, 
    error, 
    refetch
  } = useSearchStablecoin(ticker);

  const handleSearch = (value: string) => {
    setTicker(value.toUpperCase());
  };

  const handleTryAgain = () => {
    refetch();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Evaluate Stablecoin Risk
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Enter a stablecoin ticker to get a comprehensive risk analysis based on
          audit history, peg stability, transparency, oracle setup, and liquidity.
        </p>
      </motion.div>

      <SearchBar onSearch={handleSearch} />

      {isLoading && <LoadingState />}
      
      {isError && (
        <ErrorState 
          error={error as Error} 
          onRetry={handleTryAgain} 
        />
      )}

      {!isLoading && !isError && riskReport && (
        <RiskReport report={riskReport} />
      )}
    </div>
  );
};

export default Dashboard;
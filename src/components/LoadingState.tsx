import React from 'react';
import { motion } from 'framer-motion';

const LoadingState = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-12"
    >
      <div className="flex space-x-2 mb-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-4 h-4 bg-blue-600 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
      <p className="text-gray-600 text-lg">
        Analyzing stablecoin risk factors...
      </p>
      <div className="mt-6 text-sm text-gray-500 max-w-md text-center">
        <p>
          We're collecting data from multiple sources including CoinGecko, 
          GitHub, and DeFiLlama to generate a comprehensive risk report.
        </p>
      </div>
    </motion.div>
  );
};

export default LoadingState;
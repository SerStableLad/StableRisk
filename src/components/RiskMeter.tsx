import React from 'react';
import { motion } from 'framer-motion';

interface RiskMeterProps {
  score: number;
}

const RiskMeter: React.FC<RiskMeterProps> = ({ score }) => {
  // Normalize score to 0-100 range
  const normalizedScore = (score / 5) * 100;
  
  // Determine risk level and color with improved contrast
  let riskLevel = 'High Risk';
  let color = 'text-red-700'; // Darker red for better contrast
  let bgColor = 'bg-red-600';
  
  if (score >= 3.5) {
    riskLevel = 'Low Risk';
    color = 'text-green-700'; // Darker green for better contrast
    bgColor = 'bg-green-600';
  } else if (score >= 2) {
    riskLevel = 'Medium Risk';
    color = 'text-yellow-700'; // Darker yellow for better contrast
    bgColor = 'bg-yellow-500';
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        {/* Background track */}
        <div className="absolute inset-0 rounded-full border-8 border-gray-200"></div>
        
        {/* Colored progress */}
        <motion.div
          className={`absolute top-0 left-0 right-0 bottom-0 rounded-full border-8 ${bgColor}`}
          initial={{ strokeDashoffset: 264 }}
          animate={{ 
            strokeDashoffset: 264 - (normalizedScore / 100) * 264 
          }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            clipPath: `polygon(50% 50%, 50% 0%, ${normalizedScore <= 50 
              ? `${100 - normalizedScore * 2}% 0%` 
              : `0% 0%, 0% ${(normalizedScore - 50) * 2}%`})`
          }}
        />
        
        {/* Central content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span 
            className={`text-3xl font-bold ${color}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {score.toFixed(1)}
          </motion.span>
          <motion.span 
            className="text-xs text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            out of 5.0
          </motion.span>
        </div>
      </div>
      
      <motion.div 
        className={`mt-4 font-semibold ${color}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
      >
        {riskLevel}
      </motion.div>
    </div>
  );
};

export default RiskMeter;
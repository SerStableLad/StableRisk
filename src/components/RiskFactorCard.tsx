import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RiskFactorCardProps {
  name: string;
  score: number;
  description: string;
  details: string[];
}

const RiskFactorCard: React.FC<RiskFactorCardProps> = ({
  name,
  score,
  description,
  details,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine color based on score
  let scoreColor = 'bg-red-500';
  if (score >= 3.5) {
    scoreColor = 'bg-green-500';
  } else if (score >= 2) {
    scoreColor = 'bg-yellow-500';
  }

  return (
    <motion.div 
      className="bg-white rounded-lg shadow-md overflow-hidden"
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">{name}</h4>
          <div className={`${scoreColor} text-white text-sm font-medium rounded-full px-2.5 py-1`}>
            {score.toFixed(1)}
          </div>
        </div>
        <p className="text-gray-600 mb-4">{description}</p>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          {isExpanded ? (
            <>
              <span>Show less</span>
              <ChevronUp className="ml-1 h-4 w-4" />
            </>
          ) : (
            <>
              <span>Show details</span>
              <ChevronDown className="ml-1 h-4 w-4" />
            </>
          )}
        </button>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200 px-6 py-4 bg-gray-50"
          >
            <ul className="space-y-2 text-sm text-gray-600">
              {details.map((detail, index) => (
                <li key={index} className="flex items-start">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 mr-2"></span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RiskFactorCard;
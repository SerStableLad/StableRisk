import React from 'react';
import { motion } from 'framer-motion';
import { Audit } from '../types/RiskReport';

interface AuditTimelineProps {
  audits: Audit[];
}

const AuditTimeline: React.FC<AuditTimelineProps> = ({ audits }) => {
  const sortedAudits = [...audits].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="relative">
      {sortedAudits.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No audit history available
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-9 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          
          <ul className="space-y-6">
            {sortedAudits.map((audit, index) => (
              <motion.li 
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex items-start"
              >
                <div className="flex-shrink-0">
                  <div className={`
                    h-5 w-5 rounded-full border-4 border-white 
                    ${audit.issues.critical > 0 ? 'bg-red-500' : 
                      audit.issues.high > 0 ? 'bg-orange-500' : 
                      audit.issues.medium > 0 ? 'bg-yellow-500' : 'bg-green-500'}
                    shadow
                  `}></div>
                </div>
                <div className="ml-4 flex-grow">
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {audit.firm}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {new Date(audit.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div className="mt-1 sm:mt-0 flex space-x-2 text-xs">
                      {audit.issues.critical > 0 && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full">
                          {audit.issues.critical} Critical
                        </span>
                      )}
                      {audit.issues.high > 0 && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full">
                          {audit.issues.high} High
                        </span>
                      )}
                      {audit.issues.medium > 0 && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                          {audit.issues.medium} Medium
                        </span>
                      )}
                      {audit.issues.low > 0 && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                          {audit.issues.low} Low
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    {audit.summary}
                  </p>
                  {audit.link && (
                    <a 
                      href={audit.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs text-blue-600 hover:text-blue-800"
                    >
                      View Audit Report →
                    </a>
                  )}
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AuditTimeline;
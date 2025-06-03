import React from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, Github, ExternalLink, Clock, Shield, RefreshCw } from 'lucide-react';
import RiskMeter from './RiskMeter';
import RiskFactorCard from './RiskFactorCard';
import PegStabilityChart from './PegStabilityChart';
import LiquidityDistribution from './LiquidityDistribution';
import AuditTimeline from './AuditTimeline';
import { RiskReport as RiskReportType } from '../types/RiskReport';

interface RiskReportProps {
  report: RiskReportType;
}

const RiskReport: React.FC<RiskReportProps> = ({ report }) => {
  const { 
    coinInfo, 
    totalScore, 
    factors, 
    pegEvents, 
    auditHistory, 
    liquidityData,
    transparencyInfo 
  } = report;

  const handleExport = () => {
    // In the real app, implement PDF or JSON export
    console.log('Exporting report');
  };

  const handleShare = () => {
    // In the real app, implement sharing functionality
    console.log('Sharing report');
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={container}
      className="mt-8"
    >
      <motion.div variants={item} className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            {coinInfo.logo && (
              <img 
                src={coinInfo.logo} 
                alt={coinInfo.name} 
                className="w-12 h-12 mr-4 rounded-full"
              />
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {coinInfo.name} ({coinInfo.symbol})
              </h2>
              <p className="text-gray-500">{coinInfo.description}</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleExport}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0 md:mr-8">
              <RiskMeter score={totalScore} />
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-semibold mb-2">Summary</h3>
              <p className="text-gray-600 mb-4">
                {report.summary}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Market Cap:</span>{' '}
                  <span className="font-medium">${coinInfo.marketCap.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">Launch Date:</span>{' '}
                  <span className="font-medium">{coinInfo.launchDate}</span>
                </div>
                <div>
                  <span className="text-gray-500">Collateral Type:</span>{' '}
                  <span className="font-medium">{coinInfo.collateralType}</span>
                </div>
                <div>
                  <span className="text-gray-500">Blockchain:</span>{' '}
                  <span className="font-medium">{coinInfo.blockchain}</span>
                </div>
                <div className="col-span-2 space-y-2">
                  {coinInfo.website && (
                    <div>
                      <span className="text-gray-500">Website:</span>{' '}
                      <a
                        href={coinInfo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {new URL(coinInfo.website).hostname}
                      </a>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">GitHub:</span>{' '}
                    {coinInfo.github ? (
                      <a
                        href={coinInfo.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <Github className="h-4 w-4 mr-1" />
                        View Repository
                      </a>
                    ) : (
                      <span className="text-gray-400">No repository found</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.h3 variants={item} className="text-xl font-bold text-gray-900 mb-4">
        Risk Factor Analysis
      </motion.h3>
      
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {Object.entries(factors).map(([key, factor]) => (
          <RiskFactorCard 
            key={key} 
            name={factor.name} 
            score={factor.score} 
            description={factor.description} 
            details={factor.details}
          />
        ))}
      </motion.div>

      <motion.h3 variants={item} className="text-xl font-bold text-gray-900 mb-4">
        Transparency & Proof of Reserves
      </motion.h3>

      <motion.div variants={item} className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-lg font-semibold mb-4">Proof of Reserves</h4>
            <div className="space-y-4">
              <div className="flex items-start">
                <Shield className="h-5 w-5 text-blue-600 mt-1 mr-3" />
                <div>
                  <p className="font-medium">Provider</p>
                  <p className="text-gray-600">
                    {transparencyInfo?.porProvider || 'No PoR provider found'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <RefreshCw className="h-5 w-5 text-blue-600 mt-1 mr-3" />
                <div>
                  <p className="font-medium">Update Frequency</p>
                  <p className="text-gray-600">
                    {transparencyInfo?.updateFrequency || 'Not specified'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Clock className="h-5 w-5 text-blue-600 mt-1 mr-3" />
                <div>
                  <p className="font-medium">Last Updated</p>
                  <p className="text-gray-600">
                    {transparencyInfo?.lastUpdate ? 
                      new Date(transparencyInfo.lastUpdate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 
                      'Not available'
                    }
                  </p>
                </div>
              </div>
            </div>

            {transparencyInfo?.porUrl && (
              <a
                href={transparencyInfo.porUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center mt-4 text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Latest Proof of Reserves
              </a>
            )}
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Reserve Composition</h4>
            {transparencyInfo?.reserves ? (
              <div className="space-y-3">
                {transparencyInfo.reserves.map((reserve, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-700">{reserve.asset}</span>
                    <span className="font-medium">{reserve.percentage}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">Reserve composition data not available</p>
            )}

            {transparencyInfo?.transparencyUrl && (
              <a
                href={transparencyInfo.transparencyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center mt-4 text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Transparency Report
              </a>
            )}
          </div>
        </div>
      </motion.div>

      <motion.h3 variants={item} className="text-xl font-bold text-gray-900 mb-4">
        Peg Stability
      </motion.h3>
      
      <motion.div variants={item} className="bg-white rounded-lg shadow-md p-6 mb-8">
        <PegStabilityChart pegEvents={pegEvents} launchDate={coinInfo.launchDate} />
      </motion.div>

      <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <motion.div variants={item}>
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Audit History
          </h3>
          <div className="bg-white rounded-lg shadow-md p-6">
            <AuditTimeline audits={auditHistory} />
          </div>
        </motion.div>
        
        <motion.div variants={item}>
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Liquidity Distribution
          </h3>
          <div className="bg-white rounded-lg shadow-md p-6">
            <LiquidityDistribution data={liquidityData} />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default RiskReport;
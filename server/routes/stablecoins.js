import express from 'express';
import NodeCache from 'node-cache';
import { fetchCoinInfo } from '../services/coinGeckoService.js';
import { getLiquidityData, getGithubUrl } from '../services/liquidityService.js';
import { analyzeGithubRepo } from '../services/githubService.js';
import { getAuditHistory } from '../services/auditService.js';
import { analyzePegStability } from '../services/pegService.js';
import { checkTransparency } from '../services/transparencyService.js';
import { calculateRiskScore } from '../services/scoringEngine.js';

const router = express.Router();
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

router.get('/:ticker', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const validate = req.query.validate === 'true';
    const cacheKey = `risk_report_${ticker.toLowerCase()}`;
    
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // Fetch initial data with better error handling
    let coinInfo;
    
    try {
      coinInfo = await fetchCoinInfo(ticker);
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          message: `Stablecoin ${ticker} not found in CoinGecko database`,
          details: 'Please verify the ticker symbol and try again'
        });
      }
      throw error;
    }
    
    if (!coinInfo) {
      return res.status(404).json({
        message: `Stablecoin ${ticker} not found`,
        details: 'The stablecoin could not be found in our data sources'
      });
    }

    // Get GitHub URL with error handling
    try {
      const githubUrl = await getGithubUrl(coinInfo.website, ticker);
      coinInfo.github = githubUrl;
    } catch (error) {
      console.warn(`Failed to fetch GitHub URL for ${ticker}:`, error.message);
      // Non-critical error, continue without GitHub data
    }
    
    // Get liquidity data
    let liquidityData = [];
    try {
      const liquidityInfo = await getLiquidityData(ticker);
      liquidityData = liquidityInfo.liquidityData;
    } catch (error) {
      console.warn(`Failed to fetch liquidity data for ${ticker}:`, error.message);
      // Non-critical error, continue with empty liquidity data
    }
    
    // If GitHub repo is available, analyze it
    let githubData = null;
    let auditHistory = [];
    
    if (coinInfo.github) {
      try {
        [githubData, auditHistory] = await Promise.all([
          analyzeGithubRepo(coinInfo.github),
          getAuditHistory(ticker, coinInfo.name)
        ]);
      } catch (error) {
        console.warn(`Failed to analyze GitHub data for ${ticker}:`, error.message);
        // Non-critical error, continue with null values
      }
    }
    
    // Fetch remaining data with error handling
    let pegEvents, transparencyScore;
    
    try {
      [pegEvents, transparencyScore] = await Promise.all([
        analyzePegStability(ticker),
        checkTransparency(coinInfo.website, ticker)
      ]);
    } catch (error) {
      console.error(`Failed to fetch additional data for ${ticker}:`, error.message);
      return res.status(500).json({
        message: 'Failed to analyze stablecoin data',
        details: 'Error fetching price stability or transparency information'
      });
    }
    
    // Calculate risk score
    const riskReport = calculateRiskScore({
      coinInfo,
      githubData,
      auditHistory,
      pegEvents,
      transparencyScore,
      liquidityData
    });
    
    // Add empty discrepancies array since we're not cross-validating anymore
    const fullReport = {
      ...riskReport,
      discrepancies: []
    };
    
    cache.set(cacheKey, fullReport);
    res.json(fullReport);
  } catch (error) {
    console.error(`Error processing ${req.params.ticker}:`, error);
    
    // Determine specific error message
    let errorMessage = 'Failed to fetch stablecoin data';
    let errorDetails = 'An unexpected error occurred';
    let statusCode = 500;
    
    if (error.response?.status === 429) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded';
      errorDetails = 'Too many requests. Please try again in a few minutes';
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timeout';
      errorDetails = 'The request took too long to complete. Please try again';
    } else if (error.response?.status === 403) {
      errorMessage = 'API access denied';
      errorDetails = 'Please check API key configuration';
    }
    
    res.status(statusCode).json({
      message: errorMessage,
      details: errorDetails
    });
  }
});

export default router;
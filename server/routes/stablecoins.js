import express from 'express';
import NodeCache from 'node-cache';
import { fetchCoinInfo } from '../services/coinGeckoService.js';
import { analyzeGithubRepo } from '../services/githubService.js';
import { getAuditHistory } from '../services/auditService.js';
import { analyzePegStability } from '../services/pegService.js';
import { checkTransparency } from '../services/transparencyService.js';
import { getLiquidityData } from '../services/liquidityService.js';
import { calculateRiskScore } from '../services/scoringEngine.js';

const router = express.Router();
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 }); // Cache for 1 hour

// Get risk report for a specific stablecoin
router.get('/:ticker', async (req, res, next) => {
  try {
    const { ticker } = req.params;
    const cacheKey = `risk_report_${ticker.toLowerCase()}`;
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // Fetch base coin info
    const coinInfo = await fetchCoinInfo(ticker);
    if (!coinInfo) {
      return res.status(404).json({ message: `Stablecoin ${ticker} not found` });
    }
    
    // Parallel fetch all required data
    const [
      githubData,
      auditHistory,
      pegEvents,
      transparencyScore,
      liquidityData
    ] = await Promise.all([
      analyzeGithubRepo(coinInfo.github),
      getAuditHistory(ticker, coinInfo.name),
      analyzePegStability(ticker),
      checkTransparency(coinInfo.website, ticker),
      getLiquidityData(ticker)
    ]);
    
    // Calculate risk score
    const riskReport = calculateRiskScore({
      coinInfo,
      githubData,
      auditHistory,
      pegEvents,
      transparencyScore,
      liquidityData
    });
    
    // Cache the result
    cache.set(cacheKey, riskReport);
    
    res.json(riskReport);
  } catch (error) {
    next(error);
  }
});

// Search for stablecoins by keyword
router.get('/search/:keyword', async (req, res, next) => {
  try {
    const { keyword } = req.params;
    const results = await searchStablecoins(keyword);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

export default router;
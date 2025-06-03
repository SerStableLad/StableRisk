import express from 'express';
import NodeCache from 'node-cache';
import { fetchCoinInfo } from '../services/coinGeckoService.js';
import { getLiquidityData } from '../services/liquidityService.js';
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
    
    // Fetch data from both CoinGecko and DeFiLlama
    const [coinInfo, liquidityData] = await Promise.all([
      fetchCoinInfo(ticker),
      getLiquidityData(ticker)
    ]);
    
    if (!coinInfo) {
      return res.status(404).json({ message: `Stablecoin ${ticker} not found` });
    }
    
    // Cross-validate data between sources
    const discrepancies = [];
    if (validate) {
      const cgMarketCap = coinInfo.marketCap;
      const dlMarketCap = liquidityData.reduce((sum, item) => sum + item.amount, 0);
      
      if (Math.abs(cgMarketCap - dlMarketCap) / cgMarketCap > 0.1) {
        discrepancies.push({
          field: 'marketCap',
          coingeckoValue: cgMarketCap,
          defiLlamaValue: dlMarketCap,
          severity: 'high',
          description: 'Significant market cap discrepancy between data sources'
        });
      }
    }
    
    // If GitHub repo is available, analyze it and get audit history
    let githubData = null;
    let auditHistory = [];
    
    if (coinInfo.github) {
      [githubData, auditHistory] = await Promise.all([
        analyzeGithubRepo(coinInfo.github),
        getAuditHistory(ticker, coinInfo.name, coinInfo.github)
      ]);
    }
    
    // Fetch remaining data
    const [pegEvents, transparencyScore] = await Promise.all([
      analyzePegStability(ticker),
      checkTransparency(coinInfo.website, ticker)
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
    
    // Add discrepancies to the report
    const fullReport = {
      ...riskReport,
      discrepancies
    };
    
    cache.set(cacheKey, fullReport);
    res.json(fullReport);
  } catch (error) {
    next(error);
  }
});

export default router;
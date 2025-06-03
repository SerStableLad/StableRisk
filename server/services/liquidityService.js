import axios from 'axios';
import NodeCache from 'node-cache';
import { createTimeoutAxios } from '../utils/apiUtils.js';

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 }); // Cache for 1 hour
const DEFILLAMA_API = 'https://api.llama.fi';

// Configure axios with timeout
const defiLlamaClient = createTimeoutAxios(axios.create({
  baseURL: DEFILLAMA_API
}));

/**
 * Gets liquidity distribution data for a stablecoin
 * @param {string} ticker - The stablecoin ticker
 * @returns {Promise<Array>} - Liquidity data by chain
 */
export async function getLiquidityData(ticker) {
  const cacheKey = `liquidity_${ticker.toLowerCase()}`;
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }
  
  try {
    // Get stablecoin data from DeFiLlama
    const response = await defiLlamaClient.get(`/stablecoins`);
    const stablecoin = response.data.stablecoins.find(
      s => s.symbol.toLowerCase() === ticker.toLowerCase()
    );
    
    if (!stablecoin) {
      throw new Error(`Stablecoin ${ticker} not found`);
    }
    
    // Get chain distribution
    const chainData = await defiLlamaClient.get(
      `/stablecoin/${stablecoin.id}/chains`
    );
    
    const liquidityData = chainData.data.chains.map(chain => ({
      chain: chain.name,
      amount: chain.circulating
    }));
    
    cache.set(cacheKey, liquidityData);
    return liquidityData;
  } catch (error) {
    console.error('Error fetching liquidity data:', error.message);
    return [];
  }
}
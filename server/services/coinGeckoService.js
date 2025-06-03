import axios from 'axios';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 }); // Cache for 1 hour
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const API_KEY = process.env.COINGECKO_API_KEY;

// Validate API key
if (!API_KEY) {
  console.error('CoinGecko API key is missing. Please set COINGECKO_API_KEY in .env');
}

// Configure axios instance for CoinGecko
const coinGeckoClient = axios.create({
  baseURL: COINGECKO_API,
  headers: {
    'x-cg-pro-api-key': API_KEY
  },
  timeout: 10000
});

// Add retry logic for failed requests
coinGeckoClient.interceptors.response.use(null, async error => {
  const config = error.config;
  config.retryCount = config.retryCount || 0;
  
  if (config.retryCount >= 3) {
    return Promise.reject(error);
  }
  
  config.retryCount += 1;
  
  if (error.response?.status === 429) {
    const retryAfter = parseInt(error.response.headers['retry-after']) || 60;
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return coinGeckoClient.request(config);
  }
  
  // Retry with exponential backoff
  const delay = Math.pow(2, config.retryCount) * 1000;
  await new Promise(resolve => setTimeout(resolve, delay));
  return coinGeckoClient.request(config);
});

/**
 * Fetches basic coin information from CoinGecko API
 */
export async function fetchCoinInfo(ticker) {
  if (!ticker) {
    throw new Error('Ticker is required');
  }
  
  const cacheKey = `coin_info_${ticker.toLowerCase()}`;
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }
  
  try {
    // First get the coin ID from the ticker
    const coinsListResponse = await coinGeckoClient.get('/coins/list');
    const coinsList = coinsListResponse.data;
    
    // Filter for stablecoins only
    const stablecoinCategories = [
      'stablecoins',
      'algorithmic-stablecoin',
      'asset-backed-stablecoin',
      'decentralized-stablecoin'
    ];
    
    const coin = coinsList.find(c => 
      c.symbol.toLowerCase() === ticker.toLowerCase() &&
      stablecoinCategories.some(cat => c.categories?.includes(cat))
    );
    
    if (!coin) {
      throw new Error(`Stablecoin ${ticker} not found`);
    }
    
    // Get detailed coin info
    const coinInfoResponse = await coinGeckoClient.get(
      `/coins/${coin.id}?localization=false&tickers=true&market_data=true&community_data=false&developer_data=true&sparkline=false`
    );
    
    const data = coinInfoResponse.data;
    
    // Extract price feed information
    const priceFeed = data.tickers
      .filter(t => t.target === 'USD' && t.trust_score === 'green')
      .sort((a, b) => b.volume - a.volume)[0]?.market.identifier || '';
    
    // Extract the relevant information
    const coinInfo = {
      id: data.id,
      name: data.name,
      symbol: data.symbol.toUpperCase(),
      logo: data.image?.large,
      description: data.description?.en?.split('.')[0] || '',
      website: data.links?.homepage?.[0] || '',
      github: data.links?.repos_url?.github?.[0] || '',
      marketCap: data.market_data?.market_cap?.usd || 0,
      launchDate: data.genesis_date || 'Unknown',
      collateralType: determineCollateralType(data),
      blockchain: determineBlockchain(data),
      priceFeed
    };
    
    cache.set(cacheKey, coinInfo);
    return coinInfo;
  } catch (error) {
    console.error('CoinGecko API error:', error.message);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        throw new Error('CoinGecko API rate limit exceeded. Please try again in a few minutes.');
      } else if (error.response?.status === 403) {
        throw new Error('Invalid or missing CoinGecko API key. Please check your configuration.');
      }
    }
    
    throw new Error('Failed to fetch stablecoin data from CoinGecko');
  }
}

function determineCollateralType(data) {
  const description = data.description?.en?.toLowerCase() || '';
  const tags = data.categories || [];
  
  if (description.includes('fiat') || description.includes('usd backed')) {
    return 'Fiat-backed';
  } else if (description.includes('algorithm') || tags.includes('algorithmic-stablecoin')) {
    return 'Algorithmic';
  } else if (description.includes('crypto') || description.includes('collateral')) {
    return 'Crypto-backed';
  }
  
  return 'Unknown';
}

function determineBlockchain(data) {
  if (!data.platforms || Object.keys(data.platforms).length === 0) {
    return 'Unknown';
  }
  
  if (Object.keys(data.platforms).length > 1) {
    return 'Multi-chain';
  }
  
  const platform = Object.keys(data.platforms)[0];
  
  const platformMapping = {
    'ethereum': 'Ethereum',
    'binance-smart-chain': 'BSC',
    'solana': 'Solana',
    'polygon-pos': 'Polygon',
    'avalanche': 'Avalanche',
    'tron': 'Tron',
    'arbitrum-one': 'Arbitrum',
    'optimistic-ethereum': 'Optimism'
  };
  
  return platformMapping[platform] || platform;
}
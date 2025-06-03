import axios from 'axios';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 }); // Cache for 1 hour
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const API_KEY = process.env.COINGECKO_API_KEY;

// Configure axios instance for CoinGecko with proper API key header
const coinGeckoClient = axios.create({
  baseURL: COINGECKO_API,
  headers: {
    'x-cg-pro-api-key': API_KEY
  },
  timeout: 10000,
  maxRetries: 3,
  retryDelay: 1000
});

// Add response interceptor for rate limiting
coinGeckoClient.interceptors.response.use(null, async error => {
  if (error.response?.status === 429) {
    const retryAfter = parseInt(error.response.headers['retry-after']) || 60;
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return coinGeckoClient.request(error.config);
  }
  return Promise.reject(error);
});

// Keywords that indicate a bridged or wrapped token
const BRIDGE_KEYWORDS = [
  'bridged',
  'wrapped',
  'bridge',
  'bsc',
  'polygon',
  'avalanche',
  'arbitrum',
  'optimism',
  'bnb',
  'wormhole',
  'portal',
  'multichain',
  'anyswap',
  'binance-peg',
  'harmony',
  'fantom'
];

// Native token identifiers
const NATIVE_KEYWORDS = [
  'native',
  'original',
  'mainnet',
  'ethereum'
];

/**
 * Checks if a coin is likely a bridged version
 */
function isBridgedToken(coin) {
  const nameAndId = (coin.name + ' ' + coin.id).toLowerCase();
  return BRIDGE_KEYWORDS.some(keyword => nameAndId.includes(keyword));
}

/**
 * Scores a coin based on how likely it is to be the native version
 * Higher score = more likely to be native
 */
function getNativeScore(coin) {
  const nameAndId = (coin.name + ' ' + coin.id).toLowerCase();
  let score = 0;

  // Prefer coins with native keywords
  NATIVE_KEYWORDS.forEach(keyword => {
    if (nameAndId.includes(keyword)) score += 2;
  });

  // Penalize coins with bridge keywords
  BRIDGE_KEYWORDS.forEach(keyword => {
    if (nameAndId.includes(keyword)) score -= 2;
  });

  // Prefer shorter IDs (usually indicates original token)
  score += 5 - Math.min(coin.id.length / 10, 5);

  // Prefer ethereum platform
  if (coin.platforms && coin.platforms.ethereum) score += 2;

  return score;
}

/**
 * Fetches basic coin information from CoinGecko API
 */
export async function fetchCoinInfo(ticker) {
  const cacheKey = `coin_info_${ticker.toLowerCase()}`;
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }
  
  try {
    // First get the coin ID from the ticker
    const coinsListResponse = await coinGeckoClient.get('/coins/list', {
      params: {
        include_platform: true
      }
    });
    const coinsList = coinsListResponse.data;
    
    // Find all coins matching the ticker
    const matchingCoins = coinsList.filter(c => 
      c.symbol.toLowerCase() === ticker.toLowerCase()
    );

    if (matchingCoins.length === 0) {
      throw new Error(`Stablecoin ${ticker} not found`);
    }

    // Sort by native score (highest first)
    matchingCoins.sort((a, b) => getNativeScore(b) - getNativeScore(a));

    // Get the most likely native token
    const coin = matchingCoins[0];

    // If it looks like a bridged token, check if there are only bridged versions
    if (isBridgedToken(coin)) {
      throw new Error(`Only bridged versions of ${ticker} were found. Please search for the native token.`);
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
    
    // Extract GitHub repository URLs
    const githubRepos = data.links?.repos_url?.github || [];
    const primaryGithubRepo = githubRepos[0] || '';
    
    // Extract the relevant information
    const coinInfo = {
      id: data.id,
      name: data.name,
      symbol: data.symbol.toUpperCase(),
      logo: data.image?.large,
      description: data.description?.en?.split('.')[0] || '',
      website: data.links?.homepage?.[0] || '',
      github: primaryGithubRepo,
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
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      throw new Error('CoinGecko API rate limit exceeded. Please try again in a few minutes.');
    }
    throw error;
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
    'avalanche': 'Avalanche'
  };
  
  return platformMapping[platform] || platform;
}
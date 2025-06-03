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

// Ultra-strict bridge detection patterns
const BRIDGE_PATTERNS = {
  // Direct bridge indicators
  bridgeKeywords: [
    'bridged',
    'wrapped',
    'bridge',
    'pegged',
    'synthetic',
    'mirrored',
    'portal',
    'anyswap',
    'multichain',
    'wormhole'
  ],
  
  // Chain-specific bridge indicators
  chainBridges: [
    'bsc',
    'bnb',
    'polygon',
    'matic',
    'avalanche',
    'avax',
    'arbitrum',
    'optimism',
    'harmony',
    'fantom',
    'aurora',
    'metis',
    'zksync',
    'starknet',
    'base',
    'linea',
    'scroll',
    'mantle',
    'manta'
  ],
  
  // Platform-specific patterns
  platformPatterns: [
    'binance-peg',
    'layer2',
    'l2.',
    'sidechain',
    'rollup'
  ],
  
  // Bridge protocol identifiers
  bridgeProtocols: [
    'axelar',
    'celer',
    'hop',
    'across',
    'stargate',
    'layerzero',
    'hyperlane',
    'synapse'
  ]
};

// Native chain identifiers in order of preference
const NATIVE_CHAINS = [
  {
    id: 'ethereum',
    weight: 100,
    keywords: ['mainnet', 'erc20', 'eth']
  },
  {
    id: 'tron',
    weight: 90,
    keywords: ['trc20', 'trx']
  },
  {
    id: 'bitcoin',
    weight: 85,
    keywords: ['btc', 'omni']
  },
  {
    id: 'solana',
    weight: 80,
    keywords: ['sol', 'spl']
  },
  {
    id: 'cardano',
    weight: 75,
    keywords: ['ada']
  }
];

/**
 * Ultra-strict bridge detection
 */
function detectBridgeToken(coin, platforms = {}) {
  const textToAnalyze = [
    coin.name,
    coin.id,
    coin.symbol,
    Object.keys(platforms).join(' '),
    coin.description || ''
  ].join(' ').toLowerCase();

  // Check all bridge patterns
  for (const [category, patterns] of Object.entries(BRIDGE_PATTERNS)) {
    if (patterns.some(pattern => textToAnalyze.includes(pattern.toLowerCase()))) {
      return {
        isBridged: true,
        reason: `Matched ${category} pattern`
      };
    }
  }

  // Check platform-specific indicators
  const platformList = Object.keys(platforms);
  if (platformList.length > 0) {
    // Suspicious if not on any major chain
    if (!platformList.some(p => NATIVE_CHAINS.some(nc => p.includes(nc.id)))) {
      return {
        isBridged: true,
        reason: 'No major chain deployment'
      };
    }

    // Suspicious if on too many chains
    if (platformList.length > 3) {
      return {
        isBridged: true,
        reason: 'Deployed on too many chains'
      };
    }
  }

  return {
    isBridged: false,
    reason: 'No bridge indicators found'
  };
}

/**
 * Calculate native score with improved weighting
 */
function calculateNativeScore(coin, platforms = {}) {
  let score = 0;
  const textToAnalyze = [coin.name, coin.id, coin.symbol].join(' ').toLowerCase();

  // Immediate disqualification for bridge indicators
  const bridgeCheck = detectBridgeToken(coin, platforms);
  if (bridgeCheck.isBridged) {
    return -1000;
  }

  // Platform scoring
  for (const chain of NATIVE_CHAINS) {
    if (platforms[chain.id]) {
      score += chain.weight;
      // Bonus for matching chain-specific keywords
      chain.keywords.forEach(keyword => {
        if (textToAnalyze.includes(keyword)) {
          score += 20;
        }
      });
    }
  }

  // Naming conventions
  if (!coin.name.includes(' ')) score += 30; // Simple names are often original
  if (coin.id.length < 10) score += 20; // Short IDs are often original
  if (coin.id === coin.symbol.toLowerCase()) score += 50; // Direct symbol match

  // Market data indicators (if available)
  if (coin.market_cap_rank) {
    score += Math.max(0, (100 - coin.market_cap_rank)); // Higher rank = more likely original
  }

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
    // Get full coins list with platforms
    const coinsListResponse = await coinGeckoClient.get('/coins/list', {
      params: {
        include_platform: true
      }
    });
    
    // Filter and score matching coins
    const matchingCoins = coinsListResponse.data
      .filter(c => c.symbol.toLowerCase() === ticker.toLowerCase())
      .map(coin => ({
        ...coin,
        nativeScore: calculateNativeScore(coin, coin.platforms || {})
      }))
      .filter(coin => coin.nativeScore > -1000) // Remove definite bridges
      .sort((a, b) => b.nativeScore - a.nativeScore);

    if (matchingCoins.length === 0) {
      throw new Error(`Stablecoin ${ticker} not found`);
    }

    // Select the most likely native token
    const selectedCoin = matchingCoins[0];
    
    // Get detailed coin info
    const coinInfoResponse = await coinGeckoClient.get(
      `/coins/${selectedCoin.id}?localization=false&tickers=true&market_data=true&community_data=false&developer_data=true&sparkline=false`
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
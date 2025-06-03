import axios from 'axios';
import NodeCache from 'node-cache';
import cheerio from 'cheerio';

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
const DEFILLAMA_API = 'https://api.llama.fi';

async function findGithubFromWebsite(websiteUrl) {
  try {
    const response = await axios.get(websiteUrl);
    const $ = cheerio.load(response.data);
    
    // Look for GitHub links in the website
    const githubLink = $('a[href*="github.com"]').first().attr('href');
    if (githubLink) {
      return githubLink.replace(/\/$/, ''); // Remove trailing slash
    }
    
    return '';
  } catch (error) {
    console.error('Error fetching website:', error.message);
    return '';
  }
}

export async function getLiquidityData(ticker) {
  const cacheKey = `liquidity_${ticker.toLowerCase()}`;
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }
  
  try {
    // Get stablecoin data from DeFiLlama
    const response = await axios.get(`${DEFILLAMA_API}/stablecoins`);
    const stablecoin = response.data.stablecoins.find(
      s => s.symbol.toLowerCase() === ticker.toLowerCase()
    );
    
    if (!stablecoin) {
      throw new Error(`Stablecoin ${ticker} not found`);
    }
    
    // Get chain distribution
    const chainData = await axios.get(
      `${DEFILLAMA_API}/stablecoin/${stablecoin.id}/chains`
    );
    
    const liquidityData = chainData.data.chains.map(chain => ({
      chain: chain.name,
      amount: chain.circulating
    }));

    // Get protocol info which might contain GitHub link
    const protocolInfo = await axios.get(
      `${DEFILLAMA_API}/protocol/${stablecoin.id}`
    ).catch(() => ({ data: {} }));

    const githubUrl = protocolInfo.data.github || '';
    
    cache.set(cacheKey, {
      liquidityData,
      githubUrl
    });

    return {
      liquidityData,
      githubUrl
    };
  } catch (error) {
    console.error('Error fetching liquidity data:', error.message);
    return {
      liquidityData: [],
      githubUrl: ''
    };
  }
}

export async function getGithubUrl(websiteUrl, ticker) {
  // Try DeFiLlama first
  const { githubUrl } = await getLiquidityData(ticker);
  if (githubUrl) {
    return githubUrl;
  }

  // If no GitHub from DeFiLlama, try website
  if (websiteUrl) {
    const websiteGithub = await findGithubFromWebsite(websiteUrl);
    if (websiteGithub) {
      return websiteGithub;
    }
  }

  return '';
}
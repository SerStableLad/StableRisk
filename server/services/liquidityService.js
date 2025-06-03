import axios from 'axios';
import NodeCache from 'node-cache';
import cheerio from 'cheerio';

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

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
    // Get data from CoinGecko instead of DeFiLlama
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${ticker.toLowerCase()}/tickers`
    );
    
    // Calculate liquidity by summing up volumes from major exchanges
    const liquidityData = response.data.tickers
      .filter(t => t.target === 'USD' && t.trust_score === 'green')
      .reduce((acc, t) => {
        const exchange = t.market.identifier;
        const existingExchange = acc.find(item => item.chain === exchange);
        
        if (existingExchange) {
          existingExchange.amount += t.volume;
        } else {
          acc.push({
            chain: exchange,
            amount: t.volume
          });
        }
        
        return acc;
      }, [])
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10); // Keep top 10 exchanges

    return {
      liquidityData,
      githubUrl: ''
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
  // Try website first
  if (websiteUrl) {
    const websiteGithub = await findGithubFromWebsite(websiteUrl);
    if (websiteGithub) {
      return websiteGithub;
    }
  }

  // Try CoinGecko API
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${ticker.toLowerCase()}`
    );
    
    if (response.data.links?.repos_url?.github?.[0]) {
      return response.data.links.repos_url.github[0];
    }
  } catch (error) {
    console.error('Error fetching GitHub URL from CoinGecko:', error.message);
  }

  return '';
}
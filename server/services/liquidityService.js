import axios from 'axios';
import NodeCache from 'node-cache';
import cheerio from 'cheerio';

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

async function findGithubFromWebsite(websiteUrl) {
  try {
    const response = await axios.get(websiteUrl, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Look for GitHub links in various ways
    const githubLinks = new Set();
    
    // Direct GitHub links
    $('a[href*="github.com"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.includes('github.io')) {
        githubLinks.add(href);
      }
    });
    
    // Social media icons/links
    $('a[class*="github"], a[class*="social"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('github.com') && !href.includes('github.io')) {
        githubLinks.add(href);
      }
    });
    
    // Footer links
    $('footer a[href*="github.com"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.includes('github.io')) {
        githubLinks.add(href);
      }
    });
    
    // Convert Set to Array and filter/clean URLs
    const validGithubLinks = Array.from(githubLinks)
      .map(url => {
        try {
          // Normalize URL
          const cleanUrl = url.trim()
            .replace(/\/$/, '') // Remove trailing slash
            .replace(/\/+$/, '') // Remove multiple trailing slashes
            .replace('http:', 'https:'); // Use HTTPS
          
          // Ensure it's a valid GitHub repository URL
          if (cleanUrl.match(/github\.com\/[^/]+\/[^/]+$/)) {
            return cleanUrl;
          }
        } catch (e) {
          console.warn('Invalid GitHub URL:', url);
        }
        return null;
      })
      .filter(Boolean);
    
    return validGithubLinks[0] || '';
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
    // Get data from CoinGecko
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
  const cacheKey = `github_url_${ticker.toLowerCase()}`;
  const cachedUrl = cache.get(cacheKey);
  
  if (cachedUrl) {
    return cachedUrl;
  }
  
  let githubUrl = '';
  
  // Try website first if available
  if (websiteUrl) {
    try {
      githubUrl = await findGithubFromWebsite(websiteUrl);
      
      if (githubUrl) {
        cache.set(cacheKey, githubUrl);
        return githubUrl;
      }
    } catch (error) {
      console.warn('Error finding GitHub URL from website:', error.message);
    }
  }
  
  // Try CoinGecko API as fallback
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${ticker.toLowerCase()}`
    );
    
    if (response.data.links?.repos_url?.github?.[0]) {
      githubUrl = response.data.links.repos_url.github[0].replace(/\/$/, '');
      cache.set(cacheKey, githubUrl);
      return githubUrl;
    }
  } catch (error) {
    console.warn('Error fetching GitHub URL from CoinGecko:', error.message);
  }
  
  cache.set(cacheKey, '');
  return '';
}
import axios from 'axios';
import NodeCache from 'node-cache';
import * as cheerio from 'cheerio';

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

async function findGithubFromWebsite(websiteUrl) {
  try {
    // Normalize website URL
    const normalizedUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
    
    const response = await axios.get(normalizedUrl, {
      timeout: 10000, // Increased timeout
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      validateStatus: status => status < 400 // Accept redirects
    });
    
    const $ = cheerio.load(response.data);
    
    // Look for GitHub links in various ways
    const githubLinks = new Set();
    
    // Direct GitHub links with improved selector
    $('a[href*="github.com"], a[href*="GITHUB.COM"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.includes('github.io') && !href.includes('/issues')) {
        githubLinks.add(href);
      }
    });
    
    // Social media icons/links with common class names
    $('a[class*="github"], a[class*="social"], a[class*="Git"], [aria-label*="GitHub"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('github.com') && !href.includes('github.io')) {
        githubLinks.add(href);
      }
    });
    
    // Look for meta tags
    $('meta[content*="github.com"]').each((_, el) => {
      const content = $(el).attr('content');
      if (content && content.includes('github.com') && !content.includes('github.io')) {
        githubLinks.add(content);
      }
    });
    
    // Also check for links in documentation/developer sections
    $('div[class*="docs"], div[class*="developer"], div[class*="resources"]').find('a[href*="github.com"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.includes('github.io')) {
        githubLinks.add(href);
      }
    });
    
    // Convert Set to Array and filter/clean URLs
    const validGithubLinks = Array.from(githubLinks)
      .map(url => {
        try {
          // Handle relative URLs
          const fullUrl = url.startsWith('http') ? url : new URL(url, normalizedUrl).href;
          
          // Normalize URL
          const cleanUrl = fullUrl.trim()
            .replace(/\/$/, '') // Remove trailing slash
            .replace(/\/+$/, '') // Remove multiple trailing slashes
            .replace('http:', 'https:') // Use HTTPS
            .split('#')[0] // Remove hash
            .split('?')[0]; // Remove query params
          
          // Ensure it's a valid GitHub repository URL
          // Match organization/user repos: github.com/org/repo
          // Match organization repos: github.com/orgs/org/repositories
          if (cleanUrl.match(/github\.com\/[^/]+\/[^/]+$/) || 
              cleanUrl.match(/github\.com\/orgs\/[^/]+\/repositories$/)) {
            return cleanUrl;
          }
        } catch (e) {
          console.warn('Invalid GitHub URL:', url);
        }
        return null;
      })
      .filter(Boolean);
    
    // If we found an orgs URL, try to get the main repository
    const orgsUrl = validGithubLinks.find(url => url.includes('/orgs/'));
    if (orgsUrl && !validGithubLinks.some(url => url.match(/github\.com\/[^/]+\/[^/]+$/))) {
      try {
        const orgResponse = await axios.get(orgsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        const $org = cheerio.load(orgResponse.data);
        
        // Look for pinned repositories
        $org('a[href*="/repositories"]').each((_, el) => {
          const href = $org(el).attr('href');
          if (href && href.match(/\/[^/]+\/[^/]+$/)) {
            validGithubLinks.push(`https://github.com${href}`);
          }
        });
      } catch (error) {
        console.warn('Error fetching organization page:', error.message);
      }
    }
    
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
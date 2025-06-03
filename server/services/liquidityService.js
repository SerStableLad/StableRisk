import axios from 'axios';
import NodeCache from 'node-cache';
import * as cheerio from 'cheerio';

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Common documentation platforms and their URL patterns
const DOC_PLATFORMS = {
  gitbook: ['/gitbook.io/', '.gitbook.io'],
  readthedocs: ['.readthedocs.io', '/readthedocs.org/'],
  github: ['/github.io/', '/docs/', '/documentation/'],
  notion: ['.notion.site'],
  custom: ['docs.', 'documentation.', 'whitepaper.', '/docs', '/documentation', '/whitepaper']
};

async function findDocumentationUrls(websiteUrl) {
  try {
    const normalizedUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
    
    const response = await axios.get(normalizedUrl, {
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });
    
    const $ = cheerio.load(response.data);
    const docUrls = new Set();
    
    // Look for documentation links
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().toLowerCase();
      
      if (!href) return;
      
      // Convert relative URLs to absolute
      const fullUrl = href.startsWith('http') ? href : new URL(href, normalizedUrl).href;
      
      // Check against documentation platform patterns
      const isDocLink = Object.values(DOC_PLATFORMS).flat().some(pattern => 
        fullUrl.includes(pattern) || text.includes('documentation') || text.includes('docs')
      );
      
      if (isDocLink) {
        docUrls.add(fullUrl);
      }
    });
    
    return Array.from(docUrls);
  } catch (error) {
    console.error('Error finding documentation URLs:', error.message);
    return [];
  }
}

async function findAuditReports(docUrls) {
  const auditKeywords = ['audit', 'security', 'assessment', 'review'];
  const auditFirms = ['certik', 'consensys', 'trail of bits', 'quantstamp', 'hacken', 'omniscia', 'peckshield'];
  const auditReports = [];
  
  for (const url of docUrls) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Look for audit-related links and content
      $('a').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().toLowerCase();
        
        if (!href) return;
        
        const hasAuditKeyword = auditKeywords.some(keyword => text.includes(keyword));
        const hasAuditFirm = auditFirms.some(firm => text.includes(firm));
        
        if (hasAuditKeyword || hasAuditFirm) {
          const fullUrl = href.startsWith('http') ? href : new URL(href, url).href;
          
          // Check if it's a PDF or document link
          if (fullUrl.match(/\.(pdf|doc|docx)$/i) || text.includes('report')) {
            auditReports.push({
              url: fullUrl,
              title: text,
              source: url
            });
          }
        }
      });
      
      // Look for embedded audit information
      $('div, section, article').each((_, el) => {
        const text = $(el).text().toLowerCase();
        
        if (auditKeywords.some(keyword => text.includes(keyword)) &&
            auditFirms.some(firm => text.includes(firm))) {
          const auditInfo = {
            content: text.slice(0, 500), // First 500 characters
            source: url
          };
          auditReports.push(auditInfo);
        }
      });
      
    } catch (error) {
      console.warn(`Error fetching audit info from ${url}:`, error.message);
    }
  }
  
  return auditReports;
}

async function findGithubFromWebsite(websiteUrl) {
  try {
    const normalizedUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
    
    const response = await axios.get(normalizedUrl, {
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      validateStatus: status => status < 400
    });
    
    const $ = cheerio.load(response.data);
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
          const fullUrl = url.startsWith('http') ? url : new URL(url, normalizedUrl).href;
          
          const cleanUrl = fullUrl.trim()
            .replace(/\/$/, '')
            .replace(/\/+$/, '')
            .replace('http:', 'https:')
            .split('#')[0]
            .split('?')[0];
          
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
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${ticker.toLowerCase()}/tickers`
    );
    
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
      .slice(0, 10);

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
  
  if (websiteUrl) {
    try {
      // First find documentation URLs
      const docUrls = await findDocumentationUrls(websiteUrl);
      
      // Look for audit reports in documentation
      const auditReports = await findAuditReports(docUrls);
      
      // Cache audit reports for later use
      if (auditReports.length > 0) {
        cache.set(`audit_reports_${ticker.toLowerCase()}`, auditReports);
      }
      
      // Try to find GitHub URL from main website
      githubUrl = await findGithubFromWebsite(websiteUrl);
      
      // If not found, try documentation pages
      if (!githubUrl) {
        for (const docUrl of docUrls) {
          githubUrl = await findGithubFromWebsite(docUrl);
          if (githubUrl) break;
        }
      }
      
      if (githubUrl) {
        cache.set(cacheKey, githubUrl);
        return githubUrl;
      }
    } catch (error) {
      console.warn('Error finding GitHub URL from website:', error.message);
    }
  }
  
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
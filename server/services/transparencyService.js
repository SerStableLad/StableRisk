import axios from 'axios';
import NodeCache from 'node-cache';
import { JSDOM } from 'jsdom';
import { createTimeoutAxios } from '../utils/apiUtils.js';

const cache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 }); // Cache for 24 hours

// Configure axios with timeout
const webClient = createTimeoutAxios(axios.create());

// Update the checkTransparency function to use the timeout-enabled client
export async function checkTransparency(websiteUrl, ticker) {
  const cacheKey = `transparency_${ticker.toLowerCase()}`;
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }
  
  try {
    // Fetch and analyze website content using timeout-enabled client
    const response = await webClient.get(websiteUrl);
    const dom = new JSDOM(response.data);
    const content = dom.window.document;
    
    // Look for transparency indicators
    const transparencyInfo = {
      porProvider: findPORProvider(content),
      porUrl: findPORUrl(content, websiteUrl),
      updateFrequency: findUpdateFrequency(content),
      lastUpdate: findLastUpdate(content),
      transparencyUrl: findTransparencyUrl(content, websiteUrl),
      reserves: findReserveComposition(content)
    };
    
    // Calculate score based on findings
    let score = 2.0; // Base score
    
    if (transparencyInfo.porProvider) score += 1.0;
    if (transparencyInfo.porUrl) score += 0.5;
    if (transparencyInfo.updateFrequency) score += 0.5;
    if (transparencyInfo.lastUpdate) score += 0.5;
    if (transparencyInfo.transparencyUrl) score += 0.5;
    
    const result = {
      score,
      hasTransparencyPage: !!transparencyInfo.transparencyUrl,
      hasReservesDashboard: !!transparencyInfo.porUrl,
      hasRegularReporting: !!transparencyInfo.updateFrequency,
      details: generateTransparencyDetails(transparencyInfo),
      transparencyInfo
    };
    
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error checking transparency:', error.message);
    
    return {
      score: 2.0,
      hasTransparencyPage: false,
      hasReservesDashboard: false,
      hasRegularReporting: false,
      details: [
        'Unable to verify transparency information',
        'No public reserves dashboard found',
        'Consider researching official documentation'
      ],
      transparencyInfo: null
    };
  }
}

function findPORProvider(document) {
  const providers = ['armanino', 'chainlink', 'merkle', 'proof of reserve'];
  const content = document.documentElement.textContent.toLowerCase();
  
  for (const provider of providers) {
    if (content.includes(provider)) {
      return provider.charAt(0).toUpperCase() + provider.slice(1);
    }
  }
  
  return null;
}

function findPORUrl(document, baseUrl) {
  const links = Array.from(document.querySelectorAll('a'));
  
  for (const link of links) {
    const href = link.href;
    const text = link.textContent.toLowerCase();
    
    if (text.includes('proof of reserve') || 
        text.includes('por') || 
        text.includes('reserves dashboard')) {
      return new URL(href, baseUrl).toString();
    }
  }
  
  return null;
}

function findUpdateFrequency(document) {
  const content = document.documentElement.textContent.toLowerCase();
  
  if (content.includes('real-time') || content.includes('live')) {
    return 'Real-time';
  }
  if (content.includes('daily')) {
    return 'Daily';
  }
  if (content.includes('weekly')) {
    return 'Weekly';
  }
  if (content.includes('monthly')) {
    return 'Monthly';
  }
  
  return null;
}

function findLastUpdate(document) {
  const datePattern = /last updated:?\s*([\w\s,]+\d{4})/i;
  const content = document.documentElement.textContent;
  const match = content.match(datePattern);
  
  if (match) {
    return new Date(match[1]).toISOString();
  }
  
  return null;
}

function findTransparencyUrl(document, baseUrl) {
  const links = Array.from(document.querySelectorAll('a'));
  
  for (const link of links) {
    const href = link.href;
    const text = link.textContent.toLowerCase();
    
    if (text.includes('transparency') || 
        text.includes('attestation') || 
        text.includes('audit report')) {
      return new URL(href, baseUrl).toString();
    }
  }
  
  return null;
}

function findReserveComposition(document) {
  // This is a simplified version - in reality, you'd need more sophisticated parsing
  const reserves = [];
  const tables = document.querySelectorAll('table');
  
  for (const table of tables) {
    const rows = table.querySelectorAll('tr');
    
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const asset = cells[0].textContent.trim();
        const percentage = parseFloat(cells[1].textContent.replace('%', ''));
        
        if (asset && !isNaN(percentage)) {
          reserves.push({ asset, percentage });
        }
      }
    }
  }
  
  return reserves.length > 0 ? reserves : null;
}

function generateTransparencyDetails(transparencyInfo) {
  const details = [];
  
  if (transparencyInfo.porProvider) {
    details.push(`Proof of Reserves provided by ${transparencyInfo.porProvider}`);
  }
  
  if (transparencyInfo.updateFrequency) {
    details.push(`Reserve data updated ${transparencyInfo.updateFrequency.toLowerCase()}`);
  }
  
  if (transparencyInfo.lastUpdate) {
    details.push(`Last update: ${new Date(transparencyInfo.lastUpdate).toLocaleDateString()}`);
  }
  
  if (transparencyInfo.reserves) {
    details.push(`Reserve composition available with ${transparencyInfo.reserves.length} assets`);
  }
  
  if (details.length === 0) {
    details.push('Limited transparency information available');
    details.push('Consider requesting more detailed disclosures');
  }
  
  return details;
}
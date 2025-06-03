import axios from 'axios';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 }); // Cache for 24 hours

/**
 * Checks stablecoin transparency by analyzing website content
 * @param {string} websiteUrl - Stablecoin website URL
 * @param {string} ticker - Stablecoin ticker
 * @returns {Promise<Object>} - Transparency score and details
 */
export async function checkTransparency(websiteUrl, ticker) {
  const cacheKey = `transparency_${ticker.toLowerCase()}`;
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }
  
  try {
    // Fetch and analyze website content
    const response = await axios.get(websiteUrl);
    const content = response.data.toLowerCase();
    
    // Check for transparency indicators
    const hasTransparencyPage = content.includes('transparency') || 
      content.includes('reserves') || 
      content.includes('audit');
    
    const hasReservesDashboard = content.includes('dashboard') || 
      content.includes('real-time') || 
      content.includes('live');
    
    const hasRegularReporting = content.includes('report') || 
      content.includes('attestation') || 
      content.includes('quarterly');
    
    // Calculate score based on findings
    let score = 2.0; // Base score
    
    if (hasTransparencyPage) score += 1.0;
    if (hasReservesDashboard) score += 1.0;
    if (hasRegularReporting) score += 1.0;
    
    const result = {
      score,
      hasTransparencyPage,
      hasReservesDashboard,
      hasRegularReporting,
      details: [
        hasTransparencyPage ? 'Dedicated transparency page found' : 'No dedicated transparency page',
        hasReservesDashboard ? 'Live reserves dashboard available' : 'No real-time reserves dashboard',
        hasRegularReporting ? 'Regular reporting/attestations published' : 'Limited public reporting',
        `Overall transparency score: ${score.toFixed(1)}/5.0`
      ]
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
      ]
    };
  }
}
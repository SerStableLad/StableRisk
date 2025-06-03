import axios from 'axios';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

const cache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 }); // Cache for 24 hours
const GITHUB_API = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Configure axios with GitHub token
const githubClient = axios.create({
  baseURL: GITHUB_API,
  headers: {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json'
  }
});

/**
 * Analyzes a GitHub repository to extract relevant information
 * @param {string} repoUrl - GitHub repository URL
 * @returns {Promise<Object>} - GitHub repository analysis
 */
export async function analyzeGithubRepo(repoUrl) {
  // If no repo URL provided, return empty data
  if (!repoUrl) {
    return {
      recentCommits: 0,
      contributorCount: 0,
      issuesCount: 0,
      hasSecurityPolicy: false,
      oracleInfo: await analyzeOracleImplementation(null)
    };
  }

  const cacheKey = `github_analysis_${repoUrl}`;
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }
  
  try {
    // Extract owner and repo from URL
    const urlParts = repoUrl.replace(/\/$/, '').split('/');
    const owner = urlParts[urlParts.length - 2];
    const repo = urlParts[urlParts.length - 1];
    
    if (!owner || !repo) {
      throw new Error('Invalid GitHub repository URL');
    }
    
    // Get repository information
    const repoResponse = await githubClient.get(`/repos/${owner}/${repo}`);
    
    // Get recent commits (last 30)
    const commitsResponse = await githubClient.get(
      `/repos/${owner}/${repo}/commits?per_page=30`
    );
    
    // Get contributors count
    const contributorsResponse = await githubClient.get(
      `/repos/${owner}/${repo}/contributors?per_page=1&anon=true`
    );
    
    // Get open issues count
    const issuesResponse = await githubClient.get(
      `/repos/${owner}/${repo}/issues?state=open&per_page=1`
    );
    
    // Check for security policy
    let hasSecurityPolicy = false;
    try {
      const securityPolicyResponse = await githubClient.get(
        `/repos/${owner}/${repo}/contents/SECURITY.md`
      );
      hasSecurityPolicy = !!securityPolicyResponse.data;
    } catch (err) {
      // Security policy file not found, that's fine
    }
    
    // Analyze repository for oracle-related code
    const oracleInfo = await analyzeOracleImplementation(owner, repo);
    
    const result = {
      recentCommits: commitsResponse.data.length,
      contributorCount: getContributorCount(contributorsResponse),
      issuesCount: getIssuesCount(issuesResponse),
      hasSecurityPolicy,
      oracleInfo
    };
    
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('GitHub analysis error:', error.message);
    return {
      recentCommits: 0,
      contributorCount: 0,
      issuesCount: 0,
      hasSecurityPolicy: false,
      oracleInfo: await analyzeOracleImplementation(null)
    };
  }
}

/**
 * Extract contributor count from response headers
 */
function getContributorCount(response) {
  if (response.headers.link && response.headers.link.includes('rel="last"')) {
    // Extract last page number from Link header
    const match = response.headers.link.match(/page=(\d+)>; rel="last"/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return response.data.length;
}

/**
 * Extract issues count from response headers
 */
function getIssuesCount(response) {
  if (response.headers.link && response.headers.link.includes('rel="last"')) {
    // Extract last page number from Link header
    const match = response.headers.link.match(/page=(\d+)>; rel="last"/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return response.data.length;
}

/**
 * Analyze repository for oracle implementation details
 */
async function analyzeOracleImplementation(owner, repo) {
  if (!owner || !repo) {
    return {
      usesChainlink: false,
      hasMultipleOracles: false,
      hasTimelock: false,
      hasPriceDeviation: false,
      centralizedOracle: true
    };
  }

  try {
    // Search for oracle-related files and code
    const searchResponse = await githubClient.get(
      `/search/code?q=repo:${owner}/${repo}+oracle+chainlink+price+feed`
    );

    const files = searchResponse.data.items;
    
    // Analyze files for oracle patterns
    const usesChainlink = files.some(file => 
      file.name.toLowerCase().includes('chainlink') ||
      file.path.toLowerCase().includes('chainlink')
    );

    const hasMultipleOracles = files.filter(file =>
      file.name.toLowerCase().includes('oracle') ||
      file.path.toLowerCase().includes('oracle')
    ).length > 1;

    // Check for timelock implementations
    const timelockResponse = await githubClient.get(
      `/search/code?q=repo:${owner}/${repo}+timelock+delay`
    );
    const hasTimelock = timelockResponse.data.total_count > 0;

    // Check for price deviation checks
    const deviationResponse = await githubClient.get(
      `/search/code?q=repo:${owner}/${repo}+deviation+threshold`
    );
    const hasPriceDeviation = deviationResponse.data.total_count > 0;

    // Determine if oracle is centralized
    const centralizedOracle = !hasMultipleOracles || files.some(file =>
      file.name.toLowerCase().includes('admin') ||
      file.name.toLowerCase().includes('owner')
    );

    return {
      usesChainlink,
      hasMultipleOracles,
      hasTimelock,
      hasPriceDeviation,
      centralizedOracle
    };
  } catch (error) {
    console.error('Error analyzing oracle implementation:', error.message);
    return {
      usesChainlink: false,
      hasMultipleOracles: false,
      hasTimelock: false,
      hasPriceDeviation: false,
      centralizedOracle: true
    };
  }
}
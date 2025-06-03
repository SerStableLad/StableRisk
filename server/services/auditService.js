import NodeCache from 'node-cache';
import axios from 'axios';
import dotenv from 'dotenv';
import { getCurrentDate, getEightMonthsAgo } from '../utils/dateUtils.js';

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
 * Gets audit history for a stablecoin
 * @param {string} ticker - The stablecoin ticker
 * @param {string} name - The full name of the stablecoin
 * @param {string} repoUrl - GitHub repository URL
 * @returns {Promise<Array>} - List of audits
 */
export async function getAuditHistory(ticker, name, repoUrl) {
  if (!repoUrl) {
    return [];
  }

  const cacheKey = `audit_history_${ticker.toLowerCase()}`;
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
      return [];
    }

    // First try to get the default branch
    let defaultBranch = 'main';
    try {
      const repoResponse = await githubClient.get(`/repos/${owner}/${repo}`);
      defaultBranch = repoResponse.data.default_branch;
    } catch (error) {
      console.error('Error getting default branch:', error.message);
    }

    // Search for audit files in the repository
    const searchResponse = await githubClient.get('/search/code', {
      params: {
        q: `repo:${owner}/${repo} filename:audit path:audit OR path:audits OR path:security extension:pdf OR extension:md`,
        per_page: 100
      }
    });

    if (!searchResponse.data.items?.length) {
      // Try alternative search if no results found
      const altSearchResponse = await githubClient.get('/search/code', {
        params: {
          q: `repo:${owner}/${repo} audit security filename:report extension:pdf OR extension:md`,
          per_page: 100
        }
      });
      searchResponse.data.items = altSearchResponse.data.items;
    }

    const auditFiles = searchResponse.data.items || [];
    
    if (auditFiles.length === 0) {
      return [];
    }

    // Process each audit file
    const audits = [];
    const eightMonthsAgo = getEightMonthsAgo();
    let hasRecentAudit = false;

    for (const file of auditFiles) {
      try {
        // Get commit history for the file
        const commitsResponse = await githubClient.get(
          `/repos/${owner}/${repo}/commits`,
          {
            params: {
              path: file.path,
              per_page: 1
            }
          }
        );

        if (commitsResponse.data.length > 0) {
          const commit = commitsResponse.data[0];
          const commitDate = new Date(commit.commit.committer.date);
          
          // Check if this is a recent audit
          if (commitDate >= eightMonthsAgo) {
            hasRecentAudit = true;
          }

          // Get file content for markdown files
          let summary = '';
          if (file.name.endsWith('.md')) {
            const contentResponse = await githubClient.get(
              `/repos/${owner}/${repo}/contents/${file.path}`,
              {
                headers: {
                  Accept: 'application/vnd.github.v3.raw'
                }
              }
            );
            summary = extractSummary(contentResponse.data);
          }

          // Create audit entry
          const audit = {
            firm: extractAuditFirm(file.path, file.name),
            date: commitDate.toISOString(),
            summary: summary || `Security audit report: ${file.name}`,
            link: `${repoUrl}/blob/${defaultBranch}/${file.path}`,
            issues: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0
            }
          };

          // Try to extract issue counts from summary
          if (summary) {
            const issueMatches = summary.match(/(\d+)\s*(critical|high|medium|low)/gi);
            if (issueMatches) {
              issueMatches.forEach(match => {
                const [count, severity] = match.toLowerCase().split(/\s+/);
                audit.issues[severity] = parseInt(count, 10);
              });
            }
          }

          audits.push(audit);
        }
      } catch (error) {
        console.error(`Error processing audit file ${file.path}:`, error.message);
      }
    }

    // Sort audits by date (newest first)
    audits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // If there are no recent audits but we have older ones, return the most recent
    if (!hasRecentAudit && audits.length > 0) {
      return [audits[0]];
    }

    // Return all audits if we have recent ones
    return audits;

  } catch (error) {
    console.error('Error fetching audit history:', error.message);
    return [];
  }
}

/**
 * Extract audit firm name from file path and name
 */
function extractAuditFirm(filePath, fileName) {
  const commonFirms = [
    'certik', 'consensys', 'trail of bits', 'quantstamp', 'omniscia',
    'hacken', 'peckshield', 'slowmist', 'chainsecurity', 'openzeppelin',
    'halborn', 'mixbytes', 'zokyo', 'certora', 'runtime verification'
  ];

  const pathLower = filePath.toLowerCase();
  const nameLower = fileName.toLowerCase();

  // First check for common audit firms
  for (const firm of commonFirms) {
    if (pathLower.includes(firm) || nameLower.includes(firm)) {
      return firm.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
  }

  // Try to extract from path segments
  const segments = pathLower.split('/');
  const auditIndex = segments.findIndex(s => s.includes('audit'));
  
  if (auditIndex > 0) {
    const potentialFirm = segments[auditIndex - 1]
      .replace(/[-_]/g, ' ')
      .replace(/\d+/g, '')
      .trim();

    if (potentialFirm && !potentialFirm.includes('audit')) {
      return potentialFirm.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }

  // Try to extract from filename
  const nameWithoutExt = nameLower.replace(/\.[^/.]+$/, '');
  const firmWords = nameWithoutExt
    .split(/[-_\s]/)
    .filter(word => 
      !word.includes('audit') && 
      !word.includes('report') && 
      !word.match(/^\d+$/)
    );

  if (firmWords.length > 0) {
    return firmWords
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return 'Independent Auditor';
}

/**
 * Extract a summary from audit report content
 */
function extractSummary(content) {
  // Try to find an executive summary or overview section
  const sections = content.split(/#{1,3} /);
  
  // Look for summary sections
  const summarySection = sections.find(section => 
    section.toLowerCase().includes('executive summary') ||
    section.toLowerCase().includes('overview') ||
    section.toLowerCase().includes('audit summary')
  );

  if (summarySection) {
    // Get the first substantial paragraph
    const paragraphs = summarySection.split('\n\n')
      .map(p => p.trim())
      .filter(p => p.length > 50);
    
    return paragraphs[0] || 'No detailed summary available';
  }

  // If no summary section found, return first substantial paragraph
  const paragraphs = content.split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length > 50);
  
  return paragraphs[0] || 'No detailed summary available';
}
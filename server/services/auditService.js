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
 * @returns {Promise<Array>} - List of audits
 */
export async function getAuditHistory(ticker, name, repoUrl) {
  const cacheKey = `audit_history_${ticker.toLowerCase()}`;
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }

  if (!repoUrl) {
    return [];
  }

  try {
    // Extract owner and repo from URL
    const urlParts = repoUrl.replace(/\/$/, '').split('/');
    const owner = urlParts[urlParts.length - 2];
    const repo = urlParts[urlParts.length - 1];

    // Get repository tree
    const treeResponse = await githubClient.get(`/repos/${owner}/${repo}/git/trees/main?recursive=1`);
    if (!treeResponse.data.tree) {
      // Try master branch if main doesn't exist
      const masterTreeResponse = await githubClient.get(`/repos/${owner}/${repo}/git/trees/master?recursive=1`);
      if (!masterTreeResponse.data.tree) {
        return [];
      }
      treeResponse.data = masterTreeResponse.data;
    }

    // Search for audit-related files
    const auditFiles = treeResponse.data.tree.filter(item => {
      const path = item.path.toLowerCase();
      return (
        path.includes('audit') &&
        (path.endsWith('.pdf') || path.endsWith('.md') || path.endsWith('.txt')) &&
        !path.includes('test') &&
        !path.includes('example')
      );
    });

    // Get file contents and metadata for each audit file
    const eightMonthsAgo = getEightMonthsAgo();

    const audits = [];
    for (const file of auditFiles) {
      try {
        // Get file metadata
        const fileResponse = await githubClient.get(`/repos/${owner}/${repo}/commits`, {
          params: {
            path: file.path,
            per_page: 1
          }
        });

        if (fileResponse.data.length > 0) {
          const commitDate = new Date(fileResponse.data[0].commit.committer.date);
          
          // Only include audits from the last 8 months
          if (commitDate >= eightMonthsAgo) {
            // Get file content for .md and .txt files
            let summary = '';
            if (file.path.endsWith('.md') || file.path.endsWith('.txt')) {
              const contentResponse = await githubClient.get(`/repos/${owner}/${repo}/contents/${file.path}`);
              const content = Buffer.from(contentResponse.data.content, 'base64').toString();
              summary = extractSummary(content);
            }

            audits.push({
              firm: extractAuditFirm(file.path),
              date: commitDate.toISOString(),
              summary: summary || `Audit report: ${file.path}`,
              link: `${repoUrl}/blob/main/${file.path}`,
              issues: {
                critical: 0, // These would need to be parsed from the content
                high: 0,
                medium: 0,
                low: 0
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error processing audit file ${file.path}:`, error.message);
      }
    }

    // Sort audits by date (newest first)
    audits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    cache.set(cacheKey, audits);
    return audits;
  } catch (error) {
    console.error('Error fetching audit history:', error.message);
    return [];
  }
}

/**
 * Extract audit firm name from file path
 */
function extractAuditFirm(filePath) {
  const commonFirms = [
    'certik', 'consensys', 'trail of bits', 'quantstamp', 'omniscia',
    'hacken', 'peckshield', 'slowmist', 'chainsecurity', 'openzeppelin'
  ];

  const path = filePath.toLowerCase();
  const firmMatch = commonFirms.find(firm => path.includes(firm));
  
  if (firmMatch) {
    return firmMatch.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  // Try to extract firm name from path segments
  const segments = path.split('/');
  const auditIndex = segments.findIndex(s => s.includes('audit'));
  if (auditIndex > 0) {
    return segments[auditIndex - 1]
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return 'Unknown Firm';
}

/**
 * Extract a summary from audit report content
 */
function extractSummary(content) {
  // Try to find an executive summary or overview section
  const sections = content.split(/#{1,3} /);
  const summarySection = sections.find(section => 
    section.toLowerCase().includes('summary') ||
    section.toLowerCase().includes('overview')
  );

  if (summarySection) {
    // Get the first paragraph
    const paragraphs = summarySection.split('\n\n');
    return paragraphs[1] || paragraphs[0];
  }

  // If no summary section found, return first non-empty paragraph
  const paragraphs = content.split('\n\n');
  return paragraphs.find(p => p.trim().length > 0) || '';
}
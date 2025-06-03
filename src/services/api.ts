import axios from 'axios';
import { RiskReport, DataDiscrepancy } from '../types/RiskReport';

const API_BASE_URL = ''; // Empty string to use relative URLs with the proxy

/**
 * Fetches stablecoin risk report data with cross-validation
 */
export async function fetchStablecoinRiskReport(ticker: string): Promise<RiskReport> {
  if (!ticker) {
    throw new Error('Ticker is required');
  }
  
  try {
    const response = await axios.get<RiskReport & { discrepancies: DataDiscrepancy[] }>(
      `${API_BASE_URL}/api/stablecoins/${ticker}?validate=true`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorDetails = error.response?.data?.details || '';
      const errorMessage = error.response?.data?.message || 'Failed to fetch stablecoin data';
      
      if (error.response?.status === 404) {
        throw new Error(`${errorMessage}. ${errorDetails}`);
      } else if (error.response?.status === 429) {
        throw new Error('API rate limit exceeded. Please try again in a few minutes.');
      } else if (error.response?.status === 403) {
        throw new Error('API access denied. Please check API key configuration.');
      }
      throw new Error(`${errorMessage}. ${errorDetails}`);
    }
    throw new Error('An unexpected error occurred while fetching stablecoin data');
  }
}
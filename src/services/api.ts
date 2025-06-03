import axios from 'axios';
import { RiskReport } from '../types/RiskReport';

const API_BASE_URL = ''; // Empty string to use relative URLs with the proxy

/**
 * Fetches stablecoin risk report data
 */
export async function fetchStablecoinRiskReport(ticker: string): Promise<RiskReport> {
  if (!ticker) {
    throw new Error('Ticker is required');
  }
  
  try {
    const response = await axios.get<RiskReport>(`${API_BASE_URL}/api/stablecoins/${ticker}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error(`Stablecoin ${ticker} not found`);
      } else if (error.response?.status === 429) {
        throw new Error('API rate limit exceeded. Please try again in a few minutes.');
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch stablecoin data');
    }
    throw new Error('An unexpected error occurred');
  }
}
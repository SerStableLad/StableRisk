import { useQuery } from 'react-query';
import { fetchStablecoinRiskReport } from '../services/api';
import { RiskReport } from '../types/RiskReport';

export function useSearchStablecoin(ticker: string) {
  return useQuery<RiskReport, Error>(
    ['stablecoin', ticker],
    () => fetchStablecoinRiskReport(ticker),
    {
      // Only fetch when ticker is provided
      enabled: !!ticker,
      // Cache the results for 1 hour
      staleTime: 60 * 60 * 1000,
      // Don't refetch on window focus
      refetchOnWindowFocus: false,
    }
  );
}
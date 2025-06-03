// Risk Report Types

export interface CoinInfo {
  name: string;
  symbol: string;
  logo?: string;
  description: string;
  website: string;
  github: string;
  marketCap: number;
  launchDate: string;
  collateralType: string;
  blockchain: string;
  priceFeed: string;
}

export interface DataDiscrepancy {
  field: string;
  coingeckoValue: string | number;
  defiLlamaValue: string | number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface RiskFactor {
  name: string;
  score: number;
  description: string;
  details: string[];
}

export interface Audit {
  firm: string;
  date: string;
  summary: string;
  link?: string;
  issues: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface PegEvent {
  date: string;
  price: number;
  description: string;
}

export interface LiquidityData {
  chain: string;
  amount: number;
}

export interface Reserve {
  asset: string;
  percentage: number;
}

export interface TransparencyInfo {
  porProvider?: string;
  porUrl?: string;
  updateFrequency?: string;
  lastUpdate?: string;
  transparencyUrl?: string;
  reserves?: Reserve[];
}

export interface RiskReport {
  coinInfo: CoinInfo;
  totalScore: number;
  summary: string;
  discrepancies: DataDiscrepancy[];
  factors: {
    auditHistory: RiskFactor;
    pegStability: RiskFactor;
    transparency: RiskFactor;
    oracleSetup: RiskFactor;
    liquidity: RiskFactor;
  };
  pegEvents: PegEvent[];
  auditHistory: Audit[];
  liquidityData: LiquidityData[];
  transparencyInfo?: TransparencyInfo;
}
import axios from 'axios';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';
import { createTimeoutAxios } from '../utils/apiUtils.js';

dotenv.config();

const cache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 }); // Cache for 24 hours
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const API_KEY = process.env.COINGECKO_API_KEY;

// Configure axios with API key and timeout
const coinGeckoClient = createTimeoutAxios(axios.create({
  baseURL: COINGECKO_API,
  headers: {
    'x-cg-pro-api-key': API_KEY
  }
}));

/**
 * Analyzes stablecoin peg stability using historical price data
 * @param {string} ticker - The stablecoin ticker
 * @returns {Promise<Array>} - List of peg events
 */
export async function analyzePegStability(ticker) {
  const cacheKey = `peg_stability_${ticker.toLowerCase()}`;
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }
  
  try {
    // Get coin ID from ticker
    const coinsListResponse = await coinGeckoClient.get('/coins/list');
    const coinsList = coinsListResponse.data;
    
    const coin = coinsList.find(c => 
      c.symbol.toLowerCase() === ticker.toLowerCase()
    );
    
    if (!coin) {
      throw new Error(`Stablecoin ${ticker} not found`);
    }
    
    // Get historical market data using /market_chart endpoint
    const marketDataResponse = await coinGeckoClient.get(
      `/coins/${coin.id}/market_chart`,
      {
        params: {
          vs_currency: 'usd',
          days: '365', // Get one year of data
          interval: 'daily'
        }
      }
    );
    
    if (!marketDataResponse.data?.prices?.length) {
      throw new Error('No price data available');
    }

    // Process price data
    const priceData = marketDataResponse.data.prices.map(([timestamp, price]) => ({
      date: new Date(timestamp).toISOString().split('T')[0],
      price: Number(price)
    }));
    
    // Analyze peg stability and detect depeg events
    const pegEvents = analyzePegEvents(priceData);
    
    cache.set(cacheKey, pegEvents);
    return pegEvents;
  } catch (error) {
    console.error('Error analyzing peg stability:', error.message);
    return [];
  }
}

/**
 * Analyze price data to detect significant peg deviations
 */
function analyzePegEvents(priceData) {
  const pegEvents = [];
  const idealPeg = 1.0;
  
  // Filter out data points with minimal deviation to reduce noise
  const significantEvents = priceData.filter((data, index) => {
    const deviation = Math.abs((data.price - idealPeg) / idealPeg);
    
    // Include if deviation is significant (>0.2%) or if it's a local maximum/minimum
    if (deviation > 0.002) {
      // Check if it's a local maximum/minimum in a 7-day window
      if (index < 3 || index > priceData.length - 4) {
        return true; // Include edges of the data
      }
      
      const window = priceData.slice(Math.max(0, index - 3), Math.min(priceData.length, index + 4));
      const prices = window.map(d => d.price);
      const max = Math.max(...prices);
      const min = Math.min(...prices);
      
      return data.price === max || data.price === min;
    }
    
    return false;
  });
  
  // Ensure we don't have too many events close to each other
  // Simplify by taking one event per week
  const weeks = {};
  
  significantEvents.forEach(event => {
    const date = new Date(event.date);
    const weekKey = `${date.getFullYear()}-${Math.floor(date.getDate() / 7)}`;
    
    if (!weeks[weekKey] || Math.abs(event.price - idealPeg) > Math.abs(weeks[weekKey].price - idealPeg)) {
      weeks[weekKey] = event;
    }
  });
  
  // Convert back to array and sort by date
  const filteredEvents = Object.values(weeks).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Add descriptions to events
  filteredEvents.forEach(event => {
    const deviation = ((event.price - idealPeg) / idealPeg) * 100;
    let description = 'Normal market fluctuation';
    
    if (Math.abs(deviation) > 5) {
      description = 'Major depeg event';
    } else if (Math.abs(deviation) > 2) {
      description = 'Significant price deviation';
    } else if (Math.abs(deviation) > 1) {
      description = 'Minor price deviation';
    } else if (Math.abs(deviation) < 0.1) {
      description = 'At peg';
    }
    
    pegEvents.push({
      date: event.date,
      price: event.price,
      description
    });
  });
  
  return pegEvents;
}
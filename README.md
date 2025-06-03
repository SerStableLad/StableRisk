# StableRisk

A comprehensive stablecoin risk analysis platform that evaluates stability based on multiple factors:

- Audit history
- Peg stability
- Transparency
- Oracle setup
- Liquidity depth

## Data Sources

This application aggregates data from multiple reliable sources:

- [CoinGecko](https://www.coingecko.com/) - Market data, price history
- [DeFiLlama](https://defillama.com/) - Liquidity data
- [GitHub](https://github.com/) - Code analysis, oracle implementation
- Public audit reports and transparency data

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` files:
   - Copy `server/.env.example` to `server/.env`
   - Add your API keys:
     ```
     COINGECKO_API_KEY=your_key_here
     GITHUB_TOKEN=your_token_here
     ```

## Development

Run the development server:

```bash
npm run dev:full
```

## License

MIT
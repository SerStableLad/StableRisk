import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { LiquidityData } from '../types/RiskReport';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface LiquidityDistributionProps {
  data: LiquidityData[];
}

const LiquidityDistribution: React.FC<LiquidityDistributionProps> = ({ data }) => {
  // Sort by liquidity amount descending
  const sortedData = [...data].sort((a, b) => b.amount - a.amount);
  
  const chartData = {
    labels: sortedData.map(item => item.chain),
    datasets: [
      {
        label: 'Liquidity (USD)',
        data: sortedData.map(item => item.amount),
        backgroundColor: sortedData.map((_, index) => {
          const opacity = 1 - (index / sortedData.length) * 0.7;
          return `rgba(59, 130, 246, ${opacity})`;
        }),
        borderWidth: 1,
      },
    ],
  };
  
  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return 'Liquidity: $' + context.parsed.y.toLocaleString();
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          callback: function(value: any) {
            if (value >= 1e9) {
              return '$' + (value / 1e9).toFixed(1) + 'B';
            } else if (value >= 1e6) {
              return '$' + (value / 1e6).toFixed(1) + 'M';
            } else if (value >= 1e3) {
              return '$' + (value / 1e3).toFixed(1) + 'K';
            }
            return '$' + value;
          }
        }
      },
    },
  };

  // Calculate total liquidity
  const totalLiquidity = data.reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate top chain percentage
  const topChainPercentage = data.length > 0 
    ? (sortedData[0].amount / totalLiquidity) * 100 
    : 0;

  return (
    <div>
      <div className="mb-6">
        <Bar data={chartData} options={options} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Total Liquidity</p>
          <p className="text-xl font-semibold text-gray-900">
            ${totalLiquidity.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Chains</p>
          <p className="text-xl font-semibold text-gray-900">
            {data.length}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Top Chain Concentration</p>
          <p className="text-xl font-semibold text-gray-900">
            {topChainPercentage.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default LiquidityDistribution;
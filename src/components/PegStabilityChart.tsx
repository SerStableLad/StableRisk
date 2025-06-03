import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { PegEvent } from '../types/RiskReport';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PegStabilityChartProps {
  pegEvents: PegEvent[];
  launchDate: string;
}

const PegStabilityChart: React.FC<PegStabilityChartProps> = ({ pegEvents, launchDate }) => {
  const sortedEvents = [...pegEvents].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const data = {
    labels: sortedEvents.map(event => {
      const date = new Date(event.date);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric',
        day: 'numeric' 
      });
    }),
    datasets: [
      {
        label: 'Price (USD)',
        data: sortedEvents.map(event => event.price),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.2,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
      {
        label: 'Ideal Peg',
        data: sortedEvents.map(() => 1.0),
        borderColor: 'rgba(75, 85, 99, 0.6)',
        borderDash: [5, 5],
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const index = context.dataIndex;
            const event = sortedEvents[index];
            
            if (!event || context.dataset.label === 'Ideal Peg') {
              return context.dataset.label + ': $' + context.parsed.y.toFixed(4);
            }
            
            const deviation = ((event.price - 1.0) / 1.0 * 100).toFixed(2);
            return [
              context.dataset.label + ': $' + context.parsed.y.toFixed(4),
              'Deviation: ' + deviation + '%',
              event.description
            ];
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        }
      },
      y: {
        min: Math.max(0, Math.min(...pegEvents.map(e => e.price)) - 0.05),
        max: Math.max(...pegEvents.map(e => e.price)) + 0.05,
        ticks: {
          callback: function(value) {
            return '$' + value.toFixed(3);
          }
        }
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  // Calculate statistics
  const maxDeviation = pegEvents.reduce((max, event) => {
    const deviation = Math.abs((event.price - 1.0) / 1.0 * 100);
    return deviation > max ? deviation : max;
  }, 0);

  const averageDeviation = pegEvents.reduce((sum, event) => {
    return sum + Math.abs((event.price - 1.0) / 1.0 * 100);
  }, 0) / pegEvents.length;

  const daysListed = Math.ceil(
    (new Date().getTime() - new Date(launchDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div>
      <div className="h-[400px] mb-6">
        <Line data={data} options={options} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Maximum Deviation</p>
          <p className="text-xl font-semibold text-gray-900">
            {maxDeviation.toFixed(2)}%
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Average Deviation</p>
          <p className="text-xl font-semibold text-gray-900">
            {averageDeviation.toFixed(2)}%
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Days Since Launch</p>
          <p className="text-xl font-semibold text-gray-900">
            {daysListed}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Depeg Events</p>
          <p className="text-xl font-semibold text-gray-900">
            {pegEvents.filter(e => Math.abs((e.price - 1.0) / 1.0 * 100) > 5).length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PegStabilityChart;
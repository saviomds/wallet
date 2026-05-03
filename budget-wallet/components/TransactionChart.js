'use client';

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function TransactionChart({ summary }) {
  if (summary.income === 0 && summary.expenses === 0) {
    return <div className="text-center text-gray-500 dark:text-gray-400 py-10 text-sm">No data to display yet.</div>;
  }

  const data = {
    labels: ['Income', 'Expenses'],
    datasets: [
      {
        data: [summary.income, summary.expenses],
        backgroundColor: ['#D4AF37', '#333333'], // Gold and Dark Sleek Gray
        hoverBackgroundColor: ['#b5952f', '#1f1f1f'],
        borderWidth: 0, // Looks cleaner without a border in dark mode
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#888' }, // Safe neutral gray for light and dark modes
      },
    },
  };

  return (
    <div className="relative h-64 w-full">
      <Doughnut data={data} options={options} />
    </div>
  );
}
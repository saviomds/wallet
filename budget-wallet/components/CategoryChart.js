'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function CategoryChart({ transactions = [] }) {
  // Filter to only include expenses
  const expenses = transactions.filter((tx) => tx.type === 'expense');

  if (expenses.length === 0) {
    return <div className="text-center text-gray-500 dark:text-gray-400 py-10 text-sm">No expenses to categorize yet.</div>;
  }

  // Aggregate amounts by category
  const categoryTotals = expenses.reduce((acc, tx) => {
    const amount = parseFloat(tx.amount) || 0;
    const category = tx.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + amount;
    return acc;
  }, {});

  // Sort categories by highest spending first
  const sortedCategories = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);

  const data = {
    labels: sortedCategories,
    datasets: [
      {
        label: 'Total Spent',
        data: sortedCategories.map((cat) => categoryTotals[cat]),
        backgroundColor: '#155dfc',
        borderRadius: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } }, // Hide legend since it's self-explanatory
    scales: {
      y: { beginAtZero: true, ticks: { color: '#99a1af' }, grid: { color: 'rgba(54,65,83,.25)' } },
      x: { ticks: { color: '#99a1af' }, grid: { display: false } },
    },
  };

  return <div className="relative h-64 w-full"><Bar data={data} options={options} /></div>;
}
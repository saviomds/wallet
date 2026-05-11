'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function DailySpendingChart({ transactions = [], startDate, endDate }) {
  const { labels, incomeData, expenseData } = useMemo(() => {
    if (!startDate || !endDate) return { labels: [], incomeData: [], expenseData: [] };

    // Build a map for every day in the range
    const start = new Date(startDate);
    const end   = new Date(endDate);
    const days  = {};
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      days[key] = { income: 0, expense: 0 };
    }

    for (const tx of transactions) {
      const key = tx.created_at?.split('T')[0];
      if (key && days[key]) {
        const amt = parseFloat(tx.amount) || 0;
        if (tx.type === 'income')  days[key].income  += amt;
        if (tx.type === 'expense') days[key].expense += amt;
      }
    }

    const sortedKeys = Object.keys(days).sort();
    // Format label as "May 1" style
    const fmt = (k) => {
      const d = new Date(k + 'T00:00:00');
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    return {
      labels:      sortedKeys.map(fmt),
      incomeData:  sortedKeys.map(k => days[k].income),
      expenseData: sortedKeys.map(k => days[k].expense),
    };
  }, [transactions, startDate, endDate]);

  const hasData = expenseData.some(v => v > 0) || incomeData.some(v => v > 0);
  if (!hasData) {
    return <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>No daily data for this period.</div>;
  }

  const data = {
    labels,
    datasets: [
      { label: 'Income',   data: incomeData,  backgroundColor: 'rgba(16,185,129,.6)',  borderRadius: 4 },
      { label: 'Expenses', data: expenseData, backgroundColor: 'rgba(251,113,133,.6)', borderRadius: 4 },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#8a8a8a', boxWidth: 12, padding: 16 } },
    },
    scales: {
      x: { ticks: { color: '#5a5a5a', maxTicksLimit: 14, maxRotation: 45 }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { color: '#5a5a5a' }, grid: { color: 'rgba(255,255,255,.05)' } },
    },
  };

  return (
    <div style={{ position: 'relative', height: 240 }}>
      <Bar data={data} options={options} />
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Returns last N full calendar months as { label, start, end }
function lastNMonths(n = 6) {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    months.push({
      label: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
      start: start.toISOString().split('T')[0],
      end:   end.toISOString().split('T')[0],
    });
  }
  return months;
}

export default function MonthlyComparisonChart({ transactions = [] }) {
  const months = useMemo(() => lastNMonths(6), []);

  const { incomeData, expenseData } = useMemo(() => {
    const income  = months.map(() => 0);
    const expense = months.map(() => 0);

    for (const tx of transactions) {
      const d = tx.created_at?.split('T')[0];
      if (!d) continue;
      const amt = parseFloat(tx.amount) || 0;
      const idx = months.findIndex(m => d >= m.start && d <= m.end);
      if (idx === -1) continue;
      if (tx.type === 'income')  income[idx]  += amt;
      if (tx.type === 'expense') expense[idx] += amt;
    }
    return { incomeData: income, expenseData: expense };
  }, [transactions, months]);

  const hasData = incomeData.some(v => v > 0) || expenseData.some(v => v > 0);
  if (!hasData) {
    return <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>Not enough history for comparison.</div>;
  }

  const data = {
    labels: months.map(m => m.label),
    datasets: [
      { label: 'Income',   data: incomeData,  backgroundColor: 'rgba(0,212,146,.65)',   borderRadius: 4 },
      { label: 'Expenses', data: expenseData, backgroundColor: 'rgba(21,93,252,.65)',   borderRadius: 4 },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#99a1af', boxWidth: 12, padding: 16 } },
    },
    scales: {
      x: { ticks: { color: '#6a7282' }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { color: '#6a7282' }, grid: { color: 'rgba(54,65,83,.25)' } },
    },
  };

  return (
    <div style={{ position: 'relative', height: 240 }}>
      <Bar data={data} options={options} />
    </div>
  );
}

'use client';

import SavingsGoal from '../SavingsGoal';

export default function SavingsPage({ ctx }) {
  const { overallSummary, currency, exchangeRates = { USD: 1 }, settings } = ctx;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 560 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 4 }}>Goals</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.02em' }}>Savings Goal</h1>
      </div>
      <SavingsGoal
        currentBalance={overallSummary.balance}
        currency={currency}
        exchangeRate={exchangeRates[currency] || 1}
        initialGoal={settings.savings_goal}
      />
    </div>
  );
}

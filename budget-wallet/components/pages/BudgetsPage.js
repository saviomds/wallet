'use client';

import BudgetLimits from '../BudgetLimits';

export default function BudgetsPage({ ctx }) {
  const { transactions, currency, exchangeRates, settings } = ctx;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 4 }}>Goals</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.02em' }}>Budget Limits</h1>
      </div>
      <BudgetLimits
        transactions={transactions}
        currency={currency}
        exchangeRate={exchangeRates[currency] || 1}
        initialBudgets={settings.category_budgets}
      />
    </div>
  );
}

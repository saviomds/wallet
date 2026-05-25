import React from 'react';

export const makeCtx = () => ({
  session: { user: { id: 'test-user', email: 'test@example.com' } },
  transactions: [],
  filteredTransactions: [],
  summary: {},
  overallSummary: { balance: 0, income: 0, expenses: 0 },
  settings: { category_budgets: {}, savings_goal: 0, recurring_rules: [] },
  loading: false,
  currency: 'USD',
  CURRENCIES: ['USD'],
});

export default function Dummy() { return null; }

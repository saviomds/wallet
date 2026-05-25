 'use client';

import React from 'react';
import SavingsPage from '../../../components/pages/SavingsPage';
import { makeCtx } from '../mockCtx';

export default function Page() {
  const base = makeCtx();
  const ctx = {
    ...base,
    formatAmount: (a) => `$${Number(a).toFixed(2)}`,
    navigate: () => {},
    onAdded: () => {},
    onDelete: () => {},
    setSettings: () => {},
  };
  return <SavingsPage ctx={ctx} />;
}

 'use client';

import React from 'react';
import LedgerPage from '../../../components/pages/LedgerPage';
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
  return <LedgerPage ctx={ctx} />;
}

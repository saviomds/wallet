 'use client';

import React from 'react';
import PayPage from '../../../components/pages/PayPage';
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
  return <PayPage ctx={ctx} />;
}

 'use client';

import React from 'react';
import SharedPage from '../../../components/pages/SharedPage';
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
  return <SharedPage ctx={ctx} />;
}

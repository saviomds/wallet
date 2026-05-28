import { requireUser } from '../../../../lib/serverSupabase';

const ALLOWED_METHODS = new Set(['card', 'paypal', 'mobile', 'bank']);

export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const { isRateLimited } = await import('../../../../lib/rateLimiter');
    const rl = await isRateLimited(`record:${ip}`, 30, 60_000);
    if (!rl.allowed) return Response.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });

    const body = await request.json();
    const amount = Number(body?.amount);
    const currency = String(body?.currency || 'USD').trim().toUpperCase();
    const recipient = String(body?.recipient || '').trim();
    const description = String(body?.description || '').trim();
    const method = String(body?.method || '').trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      return Response.json({ error: 'Invalid currency' }, { status: 400 });
    }

    if (!recipient) {
      return Response.json({ error: 'Recipient is required' }, { status: 400 });
    }

    if (!description) {
      return Response.json({ error: 'Description is required' }, { status: 400 });
    }

    if (!ALLOWED_METHODS.has(method)) {
      return Response.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    const paymentDescription = `${method} · ${recipient} · ${description}`;

    // Duplicate-check: avoid inserting the same payment twice within a short window
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: existing } = await auth.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', auth.user.id)
      .eq('amount', amount)
      .eq('category', 'Payment')
      .eq('description', paymentDescription)
      .gte('created_at', twoMinutesAgo)
      .limit(1);

    if (existing && existing.length) {
      return Response.json({ transaction: existing[0], invoice: null });
    }

    const { data: transaction, error: transactionError } = await auth.supabase
      .from('transactions')
      .insert([
        {
          user_id: auth.user.id,
          amount,
          type: 'expense',
          category: 'Payment',
          description: paymentDescription,
        },
      ])
      .select()
      .single();

    if (transactionError) {
      return Response.json({ error: transactionError.message || 'Could not save payment' }, { status: 500 });
    }

    const { data: invoice, error: invoiceError } = await auth.supabase
      .from('invoices')
      .insert([
        {
          user_id: auth.user.id,
          transaction_id: transaction.id,
          recipient,
          amount,
          currency,
          description: paymentDescription,
        },
      ])
      .select()
      .single();

    if (invoiceError) {
      return Response.json({ error: invoiceError.message || 'Payment saved, but invoice could not be created' }, { status: 500 });
    }

    return Response.json({ transaction, invoice });
  } catch (error) {
    return Response.json({ error: error.message || 'Could not record payment' }, { status: 500 });
  }
}

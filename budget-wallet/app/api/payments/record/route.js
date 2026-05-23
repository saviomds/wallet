import { requireUser } from '../../../../lib/serverSupabase';

const ALLOWED_METHODS = new Set(['card', 'paypal', 'mobile', 'bank']);

export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
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

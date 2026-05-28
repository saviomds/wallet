import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  const secret = request.headers.get('x-admin-secret') || '';
  if (!process.env.ADMIN_CRON_SECRET || secret !== process.env.ADMIN_CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // delete rate_limits rows older than 7 days to keep table small
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('rate_limits')
      .delete()
      .lt('window_start', cutoff);

    if (error) {
      return Response.json({ error: error.message || 'Delete failed' }, { status: 500 });
    }

    return Response.json({ deleted: data?.length || 0 });
  } catch (err) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

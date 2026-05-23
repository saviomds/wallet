import { createClient } from '@supabase/supabase-js';

function createServerClient(accessToken) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase is not configured');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

export async function requireUser(request) {
  const authHeader = request.headers.get('authorization') || '';
  const accessToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (!accessToken) {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  try {
    const supabase = createServerClient(accessToken);
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data?.user) {
      return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    return { supabase, user: data.user, accessToken };
  } catch {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
}

export function createAuthorizedClient(accessToken) {
  return createServerClient(accessToken);
}

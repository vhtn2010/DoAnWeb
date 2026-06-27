const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

const testSupabaseConnection = async () => {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      status: 'not_configured',
      message: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing',
    };
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    method: 'GET',
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
    },
  });

  return {
    ok: response.ok,
    status: response.status,
    message: response.ok
      ? 'Supabase connection is working'
      : 'Supabase connection failed',
  };
};

module.exports = {
  isSupabaseConfigured,
  testSupabaseConnection,
};

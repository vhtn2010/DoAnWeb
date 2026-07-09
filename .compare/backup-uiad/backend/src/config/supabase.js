const { supabase } = require('./index');
const {
  SUPABASE_CONNECTION_STATUS,
} = require('../constants/domainConstraints');

const isSupabaseConfigured = supabase.isConfigured;

const testSupabaseConnection = async () => {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      status: SUPABASE_CONNECTION_STATUS.NOT_CONFIGURED,
      message: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing',
    };
  }

  const response = await fetch(`${supabase.url}/rest/v1/`, {
    method: 'GET',
    headers: {
      apikey: supabase.serviceRoleKey,
      Authorization: `Bearer ${supabase.serviceRoleKey}`,
    },
  });

  return {
    ok: response.ok,
    status: response.ok
      ? SUPABASE_CONNECTION_STATUS.CONNECTED
      : SUPABASE_CONNECTION_STATUS.CONNECTION_FAILED,
    message: response.ok
      ? 'Supabase connection is working'
      : 'Supabase connection failed',
  };
};

module.exports = {
  isSupabaseConfigured,
  testSupabaseConnection,
};

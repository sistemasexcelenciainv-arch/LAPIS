
const { createClient } = require("@supabase/supabase-js");

let adminClient;

function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error("Falta configurar Supabase en Vercel.");
  }

  adminClient = createClient(url, secret, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });

  return adminClient;
}

module.exports = { getSupabaseAdmin };

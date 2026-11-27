
/**
 * LAPIS - Configuración pública de autenticación.
 * Nunca expone claves secretas.
 */
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      error: "Método no permitido."
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabasePublishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return res.status(503).json({
      error: "La configuración pública de Supabase no está completa en Vercel."
    });
  }

  return res.status(200).json({
    supabaseUrl,
    supabasePublishableKey
  });
};

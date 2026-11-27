
const { createClient } = require("@supabase/supabase-js");
const { getSupabaseAdmin } = require("./_lib/supabase-admin");

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function setSessionCookies(res, session) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  const common = `; HttpOnly; SameSite=Lax; Path=/${secure}`;

  res.setHeader("Set-Cookie", [
    `lapis_access_token=${session.access_token}${common}; Max-Age=${session.expires_in}`,
    `lapis_refresh_token=${session.refresh_token}${common}; Max-Age=${60 * 60 * 24 * 30}`
  ]);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendError(res, 405, "Método no permitido.");
  }

  // Evita solicitudes desde sitios externos.
  const origin = req.headers.origin;
  const host = req.headers.host;

  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return sendError(res, 403, "Origen no autorizado.");
      }
    } catch {
      return sendError(res, 403, "Origen no válido.");
    }
  }

  try {
    const { username, password } = req.body || {};

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      username.length < 3 ||
      username.length > 32 ||
      password.length < 1 ||
      password.length > 256
    ) {
      return sendError(res, 400, "Completa correctamente tus credenciales.");
    }

    const normalizedUsername = username.trim().toLowerCase();

    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalizedUsername)) {
      return sendError(res, 401, "Usuario o contraseña incorrectos.");
    }

    const admin = getSupabaseAdmin();

    // Buscar el funcionario por su nombre de usuario.
    const { data: funcionario, error: lookupError } = await admin
      .from("funcionarios")
      .select("user_id, username, auth_email, rol, activo")
      .eq("username", normalizedUsername)
      .maybeSingle();

    if (lookupError) {
      console.error("Error consultando funcionario:", lookupError.message);
      return sendError(res, 500, "No fue posible validar el acceso.");
    }

    if (!funcionario || !funcionario.activo) {
      return sendError(res, 401, "Usuario o contraseña incorrectos.");
    }

    // Autenticación real mediante Supabase Auth.
    const authUrl = process.env.SUPABASE_URL;
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!authUrl || !publishableKey) {
      return sendError(res, 503, "Servicio de autenticación no configurado.");
    }

    const authClient = createClient(authUrl, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    const { data, error } = await authClient.auth.signInWithPassword({
      email: funcionario.auth_email,
      password
    });

    if (error || !data.session || data.user.id !== funcionario.user_id) {
      return sendError(res, 401, "Usuario o contraseña incorrectos.");
    }

    setSessionCookies(res, data.session);

    return res.status(200).json({
      success: true,
      message: "Inicio de sesión correcto.",
      funcionario: {
        id: funcionario.user_id,
        username: funcionario.username,
        rol: funcionario.rol
      }
    });

  } catch (error) {
    console.error("Error en auth-login:", error.message);
    return sendError(res, 500, "Error interno al iniciar sesión.");
  }
};

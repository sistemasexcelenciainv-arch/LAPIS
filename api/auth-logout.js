
const { getSupabaseAdmin } = require("./_lib/supabase-admin");

function parseCookies(req) {
  const cookies = {};

  (req.headers.cookie || "").split(";").forEach(part => {
    const index = part.indexOf("=");
    if (index < 0) return;

    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();

    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  });

  return cookies;
}

function clearCookies(res) {
  const secure = process.env.NODE_ENV === "production"
    ? "; Secure"
    : "";

  const options = `; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;

  res.setHeader("Set-Cookie", [
    `lapis_access_token=${options}`,
    `lapis_refresh_token=${options}`
  ]);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      error: "Método no permitido."
    });
  }

  const origin = req.headers.origin;
  const host = req.headers.host;

  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return res.status(403).json({
          error: "Origen no autorizado."
        });
      }
    } catch {
      return res.status(403).json({
        error: "Origen no válido."
      });
    }
  }

  const cookies = parseCookies(req);
  const accessToken = cookies.lapis_access_token;

  try {
    if (accessToken) {
      const admin = getSupabaseAdmin();

      // Revocar únicamente la sesión actual.
      const { error } = await admin.auth.admin.signOut(
        accessToken,
        "local"
      );

      if (error) {
        console.error("Error revocando sesión:", error.message);
      }
    }

    // Eliminar las cookies del navegador.
    clearCookies(res);

    return res.status(200).json({
      success: true,
      message: "Sesión cerrada correctamente."
    });

  } catch (error) {
    console.error("Error en auth-logout:", error.message);

    clearCookies(res);

    return res.status(200).json({
      success: true,
      message: "Sesión local cerrada."
    });
  }
};

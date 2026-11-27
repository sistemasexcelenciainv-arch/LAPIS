
const { getSupabaseAdmin } = require("./_lib/supabase-admin");

function parseCookies(req) {
  const header = req.headers.cookie || "";

  return Object.fromEntries(
    header.split(";").map(part => {
      const index = part.indexOf("=");
      if (index < 0) return ["", ""];

      const key = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();

      try {
        return [key, decodeURIComponent(value)];
      } catch {
        return [key, value];
      }
    }).filter(([key]) => key)
  );
}

function cookieOptions(maxAge) {
  const secure = process.env.NODE_ENV === "production"
    ? "; Secure"
    : "";

  return `; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

function clearSessionCookies(res) {
  const expired = cookieOptions(0);

  res.setHeader("Set-Cookie", [
    `lapis_access_token=${expired}`,
    `lapis_refresh_token=${expired}`
  ]);
}

function setSessionCookies(res, session) {
  res.setHeader("Set-Cookie", [
    `lapis_access_token=${session.access_token}${cookieOptions(session.expires_in)}`,
    `lapis_refresh_token=${session.refresh_token}${cookieOptions(60 * 60 * 24 * 30)}`
  ]);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      error: "Método no permitido."
    });
  }

  const cookies = parseCookies(req);
  const accessToken = cookies.lapis_access_token;
  const refreshToken = cookies.lapis_refresh_token;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({
      authenticated: false,
      error: "No hay una sesión activa."
    });
  }

  try {
    const admin = getSupabaseAdmin();

    let access = accessToken;
    let userResult = null;

    // Primero comprobar el token de acceso actual.
    if (access) {
      const result = await admin.auth.getUser(access);

      if (!result.error && result.data.user) {
        userResult = result.data.user;
      }
    }

    // Si el acceso expiró, intentar renovar la sesión.
    if (!userResult && refreshToken) {
      const { data, error } = await admin.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error || !data.session || !data.user) {
        clearSessionCookies(res);

        return res.status(401).json({
          authenticated: false,
          error: "La sesión ha expirado. Inicia sesión nuevamente."
        });
      }

      setSessionCookies(res, data.session);

      access = data.session.access_token;
      userResult = data.user;
    }

    if (!userResult) {
      clearSessionCookies(res);

      return res.status(401).json({
        authenticated: false,
        error: "Sesión no válida."
      });
    }

    // Comprobar que el usuario sigue registrado y autorizado.
    const { data: funcionario, error } = await admin
      .from("funcionarios")
      .select("user_id, username, rol, activo")
      .eq("user_id", userResult.id)
      .maybeSingle();

    if (error) {
      console.error("Error verificando funcionario:", error.message);

      return res.status(500).json({
        authenticated: false,
        error: "No fue posible verificar los permisos."
      });
    }

    if (!funcionario || !funcionario.activo) {
      await admin.auth.admin.signOut(userResult.id, "global");
      clearSessionCookies(res);

      return res.status(403).json({
        authenticated: false,
        error: "El funcionario no está autorizado."
      });
    }

    return res.status(200).json({
      authenticated: true,
      funcionario: {
        id: funcionario.user_id,
        username: funcionario.username,
        rol: funcionario.rol
      }
    });

  } catch (error) {
    console.error("Error en auth-session:", error.message);

    return res.status(500).json({
      authenticated: false,
      error: "Error interno verificando la sesión."
    });
  }
};

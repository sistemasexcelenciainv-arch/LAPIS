
const crypto = require("node:crypto");
const { getSupabaseAdmin } = require("./_lib/supabase-admin");

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    error: message
  });
}

function safeSecretEquals(received, expected) {
  if (
    typeof received !== "string" ||
    typeof expected !== "string"
  ) {
    return false;
  }

  const a = Buffer.from(received, "utf8");
  const b = Buffer.from(expected, "utf8");

  return (
    a.length === b.length &&
    crypto.timingSafeEqual(a, b)
  );
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendError(res, 405, "Método no permitido.");
  }

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

  const configuredSecret = process.env.LAPIS_BOOTSTRAP_SECRET;
  const suppliedSecret = req.headers["x-lapis-bootstrap-key"];

  if (
    typeof configuredSecret !== "string" ||
    configuredSecret.length < 32 ||
    !safeSecretEquals(suppliedSecret, configuredSecret)
  ) {
    return sendError(res, 401, "No autorizado.");
  }

  const body = req.body || {};

  const username = "admin.lapis";

  const email = typeof body.email === "string"
    ? body.email.trim().toLowerCase()
    : "";

  const password = typeof body.password === "string"
    ? body.password
    : "";

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254
  ) {
    return sendError(res, 400, "Correo electrónico no válido.");
  }

  if (password.length < 12 || password.length > 128) {
    return sendError(
      res,
      400,
      "La contraseña debe tener entre 12 y 128 caracteres."
    );
  }

  let admin;
  let createdUserId = null;

  try {
    admin = getSupabaseAdmin();

    // Comprobar que todavía no exista un administrador.
    const { data: existingAdmins, error: lookupError } =
      await admin
        .from("funcionarios")
        .select("user_id")
        .eq("rol", "administrador")
        .limit(1);

    if (lookupError) {
      console.error(lookupError.message);
      return sendError(
        res,
        500,
        "Error verificando administradores."
      );
    }

    if (existingAdmins && existingAdmins.length > 0) {
      return sendError(
        res,
        409,
        "La configuración inicial ya fue completada."
      );
    }

    // Comprobar que el correo no esté registrado en LAPIS.
    const { data: existingFuncionario, error: emailError } =
      await admin
        .from("funcionarios")
        .select("user_id")
        .ilike("auth_email", email)
        .limit(1);

    if (emailError) {
      console.error(emailError.message);
      return sendError(
        res,
        500,
        "Error verificando el correo."
      );
    }

    if (existingFuncionario && existingFuncionario.length > 0) {
      return sendError(
        res,
        409,
        "El correo ya está registrado."
      );
    }

    // Crear identidad en Supabase Auth.
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: {
          role: "administrador",
          app: "LAPIS"
        }
      });

    if (authError || !authData.user) {
      console.error(authError?.message);

      return sendError(
        res,
        400,
        "No fue posible crear el administrador."
      );
    }

    createdUserId = authData.user.id;

    // Registrar al administrador en la tabla de LAPIS.
    const { error: insertError } = await admin
      .from("funcionarios")
      .insert({
        user_id: createdUserId,
        username,
        auth_email: email,
        rol: "administrador",
        activo: true
      });

    if (insertError) {
      console.error(insertError.message);

      // Eliminar la identidad si no se pudo registrar en LAPIS.
      const { error: rollbackError } =
        await admin.auth.admin.deleteUser(createdUserId);

      if (rollbackError) {
        console.error(rollbackError.message);
      }

      createdUserId = null;

      return sendError(
        res,
        409,
        "No se pudo registrar el administrador."
      );
    }

    return res.status(201).json({
      success: true,
      message: "Administrador inicial creado correctamente.",
      funcionario: {
        username,
        rol: "administrador",
        activo: true
      },
      nextStep:
        "Retira LAPIS_BOOTSTRAP_SECRET de Vercel y vuelve a desplegar."
    });

  } catch (error) {
    console.error(
      "Error en auth-bootstrap:",
      error.message
    );

    if (createdUserId && admin) {
      const { error: rollbackError } =
        await admin.auth.admin.deleteUser(createdUserId);

      if (rollbackError) {
        console.error(rollbackError.message);
      }
    }

    return sendError(
      res,
      500,
      "Error interno durante la configuración inicial."
    );
  }
};

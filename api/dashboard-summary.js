
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

function describeError(error) {
    if (!error) return { message: "Error sin información." };

    return {
        name: error.name || null,
        message: error.message || null,
        code: error.code || null,
        details: error.details || null,
        hint: error.hint || null,
        status: error.status || null,
        statusCode: error.statusCode || null,
        stack: error.stack || null
    };
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
    const token = cookies.lapis_access_token;

    if (!token) {
        return res.status(401).json({
            authenticated: false,
            error: "No existe una sesión activa."
        });
    }

    try {
        const admin = getSupabaseAdmin();

        // 1. Validar sesión.
        const { data: auth, error: authError } =
            await admin.auth.getUser(token);

        if (authError || !auth.user) {
            console.error(
                "[LAPIS DASHBOARD] Error de autenticación:",
                JSON.stringify(describeError(authError))
            );

            return res.status(401).json({
                authenticated: false,
                error: "Sesión no válida."
            });
        }

        // 2. Validar funcionario.
        const { data: funcionario, error: funcionarioError } =
            await admin
                .from("funcionarios")
                .select("username, rol, activo")
                .eq("user_id", auth.user.id)
                .maybeSingle();

        if (funcionarioError) {
            console.error(
                "[LAPIS DASHBOARD] Error en funcionarios:",
                JSON.stringify(describeError(funcionarioError))
            );

            return res.status(500).json({
                error: "Error consultando los funcionarios."
            });
        }

        if (!funcionario || !funcionario.activo) {
            return res.status(403).json({
                authenticated: false,
                error: "Funcionario no autorizado."
            });
        }

        // 3. Consultar cada indicador e identificar individualmente
        // cualquier error devuelto por Supabase.
        const queries = [
            {
                name: "cementerios",
                execute: () => admin.from("cementerios")
                    .select("id", { count: "exact", head: true })
            },
            {
                name: "cementerios_activos",
                execute: () => admin.from("cementerios")
                    .select("id", { count: "exact", head: true })
                    .eq("estado", true)
            },
            {
                name: "sepulturas",
                execute: () => admin.from("sepulturas")
                    .select("id", { count: "exact", head: true })
            },
            {
                name: "fallecidos",
                execute: () => admin.from("fallecidos")
                    .select("id", { count: "exact", head: true })
            },
            {
                name: "fotografias",
                execute: () => admin.from("sepultura_fotos")
                    .select("id", { count: "exact", head: true })
            }
        ];

        const results = await Promise.all(
            queries.map(async query => {
                try {
                    const result = await query.execute();

                    return {
                        name: query.name,
                        count: result.count || 0,
                        error: result.error || null
                    };

                } catch (error) {
                    return {
                        name: query.name,
                        count: null,
                        error
                    };
                }
            })
        );

        // 4. Registrar exactamente qué consulta está fallando.
        const failed = results.filter(item => item.error);

        if (failed.length > 0) {
            for (const item of failed) {
                console.error(
                    "[LAPIS DASHBOARD] Consulta fallida:",
                    JSON.stringify({
                        tabla: item.name,
                        error: describeError(item.error)
                    })
                );
            }

            return res.status(500).json({
                error: "No fue posible cargar los indicadores.",
                diagnostico: "Revisar los registros de Vercel."
            });
        }

        // 5. Responder con los datos reales.
        const counts = Object.fromEntries(
            results.map(item => [item.name, item.count])
        );

        return res.status(200).json({
            authenticated: true,

            funcionario: {
                username: funcionario.username,
                rol: funcionario.rol
            },

            resumen: {
                cementerios: counts.cementerios,
                cementerios_activos: counts.cementerios_activos,
                sepulturas: counts.sepulturas,
                fallecidos: counts.fallecidos,
                fotografias: counts.fotografias
            }
        });

    } catch (error) {
        console.error(
            "[LAPIS DASHBOARD] Error general:",
            JSON.stringify(describeError(error))
        );

        return res.status(500).json({
            error: "Error interno cargando el panel principal."
        });
    }
};

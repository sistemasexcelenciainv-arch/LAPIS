
const { getSupabaseAdmin } = require("./_lib/supabase-admin");

// ============================================
// LAPIS - RESUMEN DEL PANEL PRINCIPAL
// ============================================

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

// ============================================
// DIAGNOSTICO COMPLETO DE ERRORES
// ============================================

function describeError(error) {
    if (error === null || error === undefined) {
        return null;
    }

    let properties = [];

    try {
        properties = Object.getOwnPropertyNames(error);
    } catch {}

    let serialized;

    try {
        serialized = JSON.stringify(error);
    } catch {
        serialized = "No se pudo serializar";
    }

    return {
        tipo: typeof error,
        constructor: error.constructor?.name || null,
        texto: String(error),
        mensaje: error.message ?? null,
        codigo: error.code ?? null,
        detalles: error.details ?? null,
        pista: error.hint ?? null,
        status: error.status ?? null,
        statusCode: error.statusCode ?? null,
        propiedades: properties,
        serializado: serialized
    };
}

// ============================================
// CONTROLADOR PRINCIPAL
// ============================================

module.exports = async function handler(req, res) {

    res.setHeader("Cache-Control", "no-store, max-age=0");

    res.setHeader(
        "Content-Type",
        "application/json; charset=utf-8"
    );

    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");

        return res.status(405).json({
            error: "Método no permitido."
        });
    }

    // ========================================
    // 1. VALIDAR SESION
    // ========================================

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

        // ====================================
        // 2. VALIDAR USUARIO EN SUPABASE AUTH
        // ====================================

        const {
            data: auth,
            error: authError
        } = await admin.auth.getUser(token);

        if (authError || !auth?.user) {

            console.error(
                "[LAPIS] ERROR AUTH:",
                JSON.stringify(describeError(authError))
            );

            return res.status(401).json({
                authenticated: false,
                error: "Sesión no válida."
            });
        }

        // ====================================
        // 3. VALIDAR FUNCIONARIO
        // ====================================

        const {
            data: funcionario,
            error: funcionarioError
        } = await admin
            .from("funcionarios")
            .select("username, rol, activo")
            .eq("user_id", auth.user.id)
            .maybeSingle();

        if (funcionarioError) {

            console.error(
                "[LAPIS] ERROR FUNCIONARIO:",
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

        // ====================================
        // 4. CONSULTAR INDICADORES
        // ====================================

        // Se utiliza GET con conteo exacto.
        // limit(1) reduce los datos transferidos,
        // pero conserva el conteo total.

        const queries = [

            {
                name: "cementerios",

                execute: () =>
                    admin
                        .from("cementerios")
                        .select("id", { count: "exact" })
                        .limit(1)
            },

            {
                name: "cementerios_activos",

                execute: () =>
                    admin
                        .from("cementerios")
                        .select("id", { count: "exact" })
                        .eq("estado", true)
                        .limit(1)
            },

            {
                name: "sepulturas",

                execute: () =>
                    admin
                        .from("sepulturas")
                        .select("id", { count: "exact" })
                        .limit(1)
            },

            {
                name: "fallecidos",

                execute: () =>
                    admin
                        .from("fallecidos")
                        .select("id", { count: "exact" })
                        .limit(1)
            },

            {
                name: "fotografias",

                execute: () =>
                    admin
                        .from("sepultura_fotos")
                        .select("id", { count: "exact" })
                        .limit(1)
            }

        ];

        // ====================================
        // 5. EJECUTAR CONSULTAS
        // ====================================

        const results = await Promise.all(

            queries.map(async query => {

                try {

                    const result = await query.execute();

                    return {
                        name: query.name,
                        count: result.count,
                        status: result.status,
                        statusText: result.statusText,
                        error: result.error ?? null
                    };

                } catch (error) {

                    return {
                        name: query.name,
                        count: null,
                        status: null,
                        statusText: null,
                        error
                    };

                }

            })

        );

        // ====================================
        // 6. DETECTAR ERRORES
        // ====================================

        const failed = results.filter(item => {

            return (
                item.error !== null ||
                typeof item.count !== "number"
            );

        });

        if (failed.length > 0) {

            for (const item of failed) {

                console.error(
                    "[LAPIS DASHBOARD] CONSULTA FALLIDA:",
                    JSON.stringify({
                        tabla: item.name,
                        status: item.status,
                        statusText: item.statusText,
                        error: describeError(item.error)
                    })
                );

            }

            return res.status(500).json({
                error: "No fue posible cargar los indicadores.",
                diagnostico: "Consultar los Logs de Vercel."
            });

        }

        // ====================================
        // 7. ORGANIZAR RESULTADOS
        // ====================================

        const counts = Object.fromEntries(

            results.map(item => [
                item.name,
                item.count
            ])

        );

        // ====================================
        // 8. RESPUESTA DEL PANEL PRINCIPAL
        // ====================================

        return res.status(200).json({

            authenticated: true,

            funcionario: {
                username: funcionario.username,
                rol: funcionario.rol
            },

            resumen: {

                cementerios: counts.cementerios,

                cementerios_activos:
                    counts.cementerios_activos,

                sepulturas: counts.sepulturas,

                fallecidos: counts.fallecidos,

                fotografias: counts.fotografias

            }

        });

    } catch (error) {

        console.error(
            "[LAPIS DASHBOARD] ERROR GENERAL:",
            JSON.stringify(describeError(error))
        );

        return res.status(500).json({
            error: "Error interno cargando el panel principal."
        });

    }

};

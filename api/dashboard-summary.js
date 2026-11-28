
const { getSupabaseAdmin } = require("./_lib/supabase-admin");

function parseCookies(req) {
    const header = req.headers.cookie || "";

    return Object.fromEntries(
        header.split(";").map(part => {
            const index = part.indexOf("=");
            if (index < 0) return ["", ""];

            const key = part.slice(0, index).trim();
            const value = part.slice(index + 1).trim();

            return [key, value];
        }).filter(([key]) => key)
    );
}

module.exports = async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store, max-age=0");

    if (req.method !== "GET") {
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

        // Validar identidad de Supabase Auth.
        const { data: auth, error: authError } =
            await admin.auth.getUser(token);

        if (authError || !auth.user) {
            return res.status(401).json({
                authenticated: false,
                error: "Sesión no válida."
            });
        }

        // Comprobar que el funcionario exista y esté activo.
        const { data: funcionario, error: funcionarioError } =
            await admin
                .from("funcionarios")
                .select("username, rol, activo")
                .eq("user_id", auth.user.id)
                .maybeSingle();

        if (funcionarioError) {
            throw funcionarioError;
        }

        if (!funcionario || !funcionario.activo) {
            return res.status(403).json({
                authenticated: false,
                error: "Funcionario no autorizado."
            });
        }

        // Consultar indicadores generales.
        const [
            cementerios,
            activos,
            sepulturas,
            fallecidos,
            fotografias
        ] = await Promise.all([

            admin.from("cementerios")
                .select("id", { count: "exact", head: true }),

            admin.from("cementerios")
                .select("id", { count: "exact", head: true })
                .eq("estado", true),

            admin.from("sepulturas")
                .select("id", { count: "exact", head: true }),

            admin.from("fallecidos")
                .select("id", { count: "exact", head: true }),

            admin.from("sepultura_fotos")
                .select("id", { count: "exact", head: true })
        ]);

        const results = [
            cementerios,
            activos,
            sepulturas,
            fallecidos,
            fotografias
        ];

        const failed = results.find(item => item.error);

        if (failed) {
            throw failed.error;
        }

        return res.status(200).json({
            authenticated: true,

            funcionario: {
                username: funcionario.username,
                rol: funcionario.rol
            },

            resumen: {
                cementerios: cementerios.count || 0,
                cementerios_activos: activos.count || 0,
                sepulturas: sepulturas.count || 0,
                fallecidos: fallecidos.count || 0,
                fotografias: fotografias.count || 0
            }
        });

    } catch (error) {
        console.error(
            "Error en dashboard-summary:",
            error.message
        );

        return res.status(500).json({
            error: "No fue posible cargar el resumen de LAPIS."
        });
    }
};

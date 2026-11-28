
const { getSupabaseAdmin } = require("./_lib/supabase-admin");

function cookies(req) {
    return Object.fromEntries(
        (req.headers.cookie || "").split(";").map(part => {
            const i = part.indexOf("=");
            if (i < 0) return ["", ""];
            const k = part.slice(0, i).trim();
            const v = part.slice(i + 1).trim();
            try { return [k, decodeURIComponent(v)]; }
            catch { return [k, v]; }
        }).filter(([k]) => k)
    );
}

module.exports = async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Método no permitido." });
    }

    const token = cookies(req).lapis_access_token;

    if (!token) {
        return res.status(401).json({
            error: "Sesión no encontrada."
        });
    }

    try {
        const db = getSupabaseAdmin();

        const { data: auth, error: authError } =
            await db.auth.getUser(token);

        if (authError || !auth?.user) {
            return res.status(401).json({
                error: "Sesión no válida."
            });
        }

        const { data: funcionario, error: userError } = await db
            .from("funcionarios")
            .select("username, rol, activo")
            .eq("user_id", auth.user.id)
            .maybeSingle();

        if (userError) throw userError;

        if (!funcionario || !funcionario.activo) {
            return res.status(403).json({
                error: "Usuario no autorizado."
            });
        }

        const [cemResult, vaultResult] = await Promise.all([
            db.from("cementerios")
                .select("id, nombre, estado")
                .order("nombre"),

            db.from("sepulturas")
                .select(`
                    id,
                    serial,
                    cementerio_id,
                    codigo_original,
                    codigo_inventario,
                    pabellon,
                    galeria,
                    fila,
                    estado,
                    observaciones,
                    creado_en,
                    actualizado_en
                `)
                .order("pabellon")
                .order("galeria")
                .order("fila")
                .order("codigo_inventario")
                .limit(2000)
        ]);

        if (cemResult.error) throw cemResult.error;
        if (vaultResult.error) throw vaultResult.error;

        const vaults = vaultResult.data || [];
        const ids = vaults.map(v => v.id);

        let people = [];
        let photos = [];

        if (ids.length) {
            const [peopleResult, photosResult] = await Promise.all([
                db.from("fallecidos")
                    .select(`
                        id,
                        sepultura_id,
                        nombre_completo,
                        fecha_nacimiento,
                        fecha_fallecimiento,
                        edad_inscrita,
                        dedicatoria
                    `)
                    .in("sepultura_id", ids)
                    .order("nombre_completo"),

                db.from("sepultura_fotos")
                    .select(`
                        id,
                        sepultura_id,
                        tipo_fotografia,
                        nombre_original,
                        tipo_archivo,
                        tamano_bytes,
                        creado_en
                    `)
                    .in("sepultura_id", ids)
            ]);

            if (peopleResult.error) throw peopleResult.error;
            if (photosResult.error) throw photosResult.error;

            people = peopleResult.data || [];
            photos = photosResult.data || [];
        }

        return res.status(200).json({
            authenticated: true,
            cementerios: cemResult.data || [],
            sepulturas: vaults,
            fallecidos: people,
            fotografias: photos
        });

    } catch (error) {
        console.error("[LAPIS VAULTS]", {
            message: error.message,
            code: error.code,
            details: error.details
        });

        return res.status(500).json({
            error: "No fue posible cargar el inventario."
        });
    }
};

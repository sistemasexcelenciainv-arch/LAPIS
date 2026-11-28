
const { getSupabaseAdmin } = require("./_lib/supabase-admin");

function getCookies(req) {
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

    if (req.method !== "PATCH") {
        res.setHeader("Allow", "PATCH");
        return res.status(405).json({
            error: "Método no permitido."
        });
    }

    const origin = req.headers.origin;

    if (origin && req.headers.host) {
        try {
            if (new URL(origin).host !== req.headers.host) {
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

    const token = getCookies(req).lapis_access_token;

    if (!token) {
        return res.status(401).json({
            error: "Sesión no encontrada."
        });
    }

    try {
        const db = getSupabaseAdmin();

        // Verificar sesión
        const { data: auth, error: authError } =
            await db.auth.getUser(token);

        if (authError || !auth?.user) {
            return res.status(401).json({
                error: "Sesión no válida."
            });
        }

        // Verificar funcionario activo
        const { data: funcionario, error: userError } = await db
            .from("funcionarios")
            .select("username, rol, activo")
            .eq("user_id", auth.user.id)
            .maybeSingle();

        if (userError) throw userError;

        if (
            !funcionario ||
            !funcionario.activo ||
            !["administrador", "funcionario"].includes(funcionario.rol)
        ) {
            return res.status(403).json({
                error: "No tienes autorización para editar."
            });
        }

        const id = String(body.id || "").trim();

if (!id || id.length > 80) {

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                error: "Identificador no válido."
            });
        }

        // =================================
        // ACTUALIZAR BÓVEDA
        // =================================

        if (body.tipo === "sepultura") {

            const estados = [
                "Pendiente",
                "Legible",
                "Ilegible",
                "Libre"
            ];

            const pabellon = Number(body.pabellon);
            const galeria = Number(body.galeria);
            const fila = Number(body.fila);

            if (
                !Number.isSafeInteger(pabellon) || pabellon <= 0 ||
                !Number.isSafeInteger(galeria) || galeria <= 0 ||
                !Number.isSafeInteger(fila) || fila <= 0
            ) {
                return res.status(400).json({
                    error: "La ubicación debe contener números mayores que cero."
                });
            }

            if (!estados.includes(body.estado)) {
                return res.status(400).json({
                    error: "Estado no válido."
                });
            }

            if (
                typeof body.codigo_original !== "string" ||
                !body.codigo_original.trim() ||
                body.codigo_original.trim().length > 120
            ) {
                return res.status(400).json({
                    error: "El código original es obligatorio."
                });
            }

            const codigoInventario =
                String(body.codigo_inventario || "").trim();

            const observaciones =
                String(body.observaciones || "").trim();

            if (codigoInventario.length > 120 ||
                observaciones.length > 5000) {
                return res.status(400).json({
                    error: "Uno de los campos supera el límite permitido."
                });
            }

            const changes = {
                codigo_original: body.codigo_original.trim(),
                codigo_inventario: codigoInventario || null,
                pabellon,
                galeria,
                fila,
                estado: body.estado,
                observaciones: observaciones || null,
                actualizado_en: new Date().toISOString()
            };

            const { data, error } = await db
                .from("sepulturas")
                .update(changes)
                .eq("id", id)
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
                .maybeSingle();

            if (error) {
                console.error("[LAPIS UPDATE SEPULTURA]", error);

                if (error.code === "23505") {
                    return res.status(409).json({
                        error: "El código ya está asignado a otra bóveda."
                    });
                }

                if (error.code === "42501") {
                    return res.status(403).json({
                        error: "Falta permiso UPDATE en sepulturas."
                    });
                }

                throw error;
            }

            if (!data) {
                return res.status(404).json({
                    error: "No se encontró la bóveda."
                });
            }

            return res.status(200).json({
                success: true,
                message: "Bóveda actualizada correctamente.",
                registro: data
            });
        }

        // =================================
        // ACTUALIZAR FALLECIDO
        // =================================

        if (body.tipo === "fallecido") {

            const nombre = String(
                body.nombre_completo || ""
            ).trim();

            if (!nombre || nombre.length > 250) {
                return res.status(400).json({
                    error: "El nombre completo es obligatorio."
                });
            }

            const fields = [
                "fecha_nacimiento",
                "fecha_fallecimiento",
                "edad_inscrita",
                "dedicatoria"
            ];

            const changes = {
                nombre_completo: nombre,
                actualizado_en: new Date().toISOString()
            };

            for (const field of fields) {
                const value = String(body[field] || "").trim();

                if (value.length > 2000) {
                    return res.status(400).json({
                        error: "Un campo supera el límite permitido."
                    });
                }

                changes[field] = value || null;
            }

            const { data, error } = await db
                .from("fallecidos")
                .update(changes)
                .eq("id", id)
                .select(`
                    id,
                    sepultura_id,
                    nombre_completo,
                    fecha_nacimiento,
                    fecha_fallecimiento,
                    edad_inscrita,
                    dedicatoria
                `)
                .maybeSingle();

            if (error) {
                console.error("[LAPIS UPDATE FALLECIDO]", error);

                if (error.code === "42501") {
                    return res.status(403).json({
                        error: "Falta permiso UPDATE en fallecidos."
                    });
                }

                throw error;
            }

            if (!data) {
                return res.status(404).json({
                    error: "No se encontró el fallecido."
                });
            }

            return res.status(200).json({
                success: true,
                message: "Datos del fallecido actualizados correctamente.",
                registro: data
            });
        }

        return res.status(400).json({
            error: "Tipo de registro no válido."
        });

    } catch (error) {
        console.error("[LAPIS RECORD UPDATE]", {
            message: error.message,
            code: error.code
        });

        return res.status(500).json({
            error: "No fue posible guardar los cambios."
        });
    }
};

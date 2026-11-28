
const { getSupabaseAdmin } = require("./_lib/supabase-admin");

function getCookies(req) {
    return Object.fromEntries(
        (req.headers.cookie || "").split(";").map(part => {
            const i = part.indexOf("=");
            if (i < 0) return ["", ""];

            const key = part.slice(0, i).trim();
            const value = part.slice(i + 1).trim();

            try {
                return [key, decodeURIComponent(value)];
            } catch {
                return [key, value];
            }
        }).filter(([key]) => key)
    );
}

function readBody(req) {
    let body = req.body;

    if (typeof body === "string") {
        try {
            body = JSON.parse(body);
        } catch {
            return null;
        }
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return null;
    }

    return body;
}

function validId(value) {
    const id = String(value ?? "").trim();

    if (!/^\d{1,19}$/.test(id)) return null;

    try {
        const number = BigInt(id);

        if (
            number <= 0n ||
            number > 9223372036854775807n
        ) {
            return null;
        }

        return id;
    } catch {
        return null;
    }
}

function cleanText(value) {
    return typeof value === "string" ? value.trim() : "";
}

module.exports = async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader(
        "Content-Type",
        "application/json; charset=utf-8"
    );

    if (req.method !== "PATCH") {
        res.setHeader("Allow", "PATCH");

        return res.status(405).json({
            error: "Método no permitido."
        });
    }

    // VALIDAR ORIGEN
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

    // VALIDAR SESIÓN
    const token = getCookies(req).lapis_access_token;

    if (!token) {
        return res.status(401).json({
            error: "Sesión no encontrada."
        });
    }

    // LEER CUERPO DE LA SOLICITUD
    const body = readBody(req);

    if (!body) {
        return res.status(400).json({
            error: "El cuerpo de la solicitud no contiene JSON válido."
        });
    }

    const id = validId(body.id);

    if (!id) {
        return res.status(400).json({
            error: "Identificador no válido."
        });
    }

    try {
        const db = getSupabaseAdmin();

        // VERIFICAR USUARIO AUTENTICADO
        const { data: auth, error: authError } =
            await db.auth.getUser(token);

        if (authError || !auth?.user) {
            return res.status(401).json({
                error: "Sesión no válida."
            });
        }

        // VERIFICAR FUNCIONARIO
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

        // =====================================
        // ACTUALIZAR BÓVEDA
        // =====================================

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

            const codigoOriginal = cleanText(body.codigo_original);
            const codigoInventario = cleanText(body.codigo_inventario);
            const observaciones = cleanText(body.observaciones);

            if (
                !Number.isSafeInteger(pabellon) || pabellon <= 0 ||
                !Number.isSafeInteger(galeria) || galeria <= 0 ||
                !Number.isSafeInteger(fila) || fila <= 0
            ) {
                return res.status(400).json({
                    error: "Pabellón, galería y fila deben ser números enteros mayores que cero."
                });
            }

            if (!estados.includes(body.estado)) {
                return res.status(400).json({
                    error: "Estado no válido."
                });
            }

            if (!codigoOriginal || codigoOriginal.length > 120) {
                return res.status(400).json({
                    error: "El código original es obligatorio."
                });
            }

            if (
                codigoInventario.length > 120 ||
                observaciones.length > 5000
            ) {
                return res.status(400).json({
                    error: "Uno de los campos supera el límite permitido."
                });
            }

            const changes = {
                codigo_original: codigoOriginal,
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
                        error: "El código original ya está asignado a otra bóveda."
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

        // =====================================
        // ACTUALIZAR FALLECIDO
        // =====================================

        if (body.tipo === "fallecido") {
            const nombre = cleanText(body.nombre_completo);

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
                const value = cleanText(body[field]);

                if (value.length > 2000) {
                    return res.status(400).json({
                        error: "El campo " + field + " supera el límite permitido."
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
            message: error?.message,
            code: error?.code,
            details: error?.details,
            hint: error?.hint
        });

        return res.status(500).json({
            error: "No fue posible guardar los cambios."
        });
    }
};

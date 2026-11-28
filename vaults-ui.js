
(function () {
    "use strict";

    let data = null;
    let modal = null;
    let selectedCemetery = "";
    let selectedPavilion = "";
    let selectedGallery = "";
    let selectedRow = "";
    let searchTerm = "";

    const esc = value => String(value ?? "").replace(
        /[&<>"']/g,
        c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[c]
    );

    function createModal() {
        if (modal) return;

        const style = document.createElement("style");
        style.textContent = `
            #lapisVaults {
                position: fixed;
                inset: 0;
                z-index: 950000;
                overflow-y: auto;
                background: #f4f7fb;
                color: #172033;
                font-family: Inter, Arial, sans-serif;
            }
            #lapisVaults * { box-sizing: border-box; }
            .lv-wrap {
                width: min(1150px, calc(100% - 30px));
                margin: auto;
                padding: 25px 0 50px;
            }
            .lv-header {
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:12px;
                margin-bottom:25px;
            }
            .lv-header h2 {
                margin:0;
                font-size:24px;
                font-weight:850;
            }
            .lv-muted { color:#7b879b; font-size:12px; }
            .lv-button {
                border:0;
                border-radius:10px;
                padding:11px 15px;
                background:#1d4ed8;
                color:white;
                font-weight:700;
                cursor:pointer;
            }
            .lv-button.secondary {
                background:white;
                color:#334155;
                border:1px solid #dce4ef;
            }
            .lv-panel {
                padding:20px;
                border:1px solid #e2e8f0;
                border-radius:18px;
                background:white;
                margin-bottom:18px;
            }
            .lv-filters {
                display:grid;
                grid-template-columns:repeat(4,1fr);
                gap:12px;
            }
            .lv-field label {
                display:block;
                margin-bottom:7px;
                font-size:11px;
                color:#64748b;
                font-weight:700;
            }
            .lv-field input,.lv-field select {
                width:100%;
                min-width:0;
                padding:12px;
                border:1px solid #dbe3ef;
                border-radius:10px;
                background:white;
                color:#172033;
                outline:none;
            }
            .lv-search { margin-top:15px; }
            .lv-summary {
                display:flex;
                justify-content:space-between;
                gap:10px;
                align-items:center;
                margin:20px 0 12px;
            }
            .lv-grid {
                display:grid;
                grid-template-columns:repeat(2,minmax(0,1fr));
                gap:14px;
            }
            .lv-card {
                padding:18px;
                border:1px solid #e1e8f2;
                border-radius:16px;
                background:white;
            }
            .lv-card-top {
                display:flex;
                justify-content:space-between;
                gap:8px;
                align-items:center;
            }
            .lv-serial {
                font-size:18px;
                font-weight:850;
                color:#17366b;
            }
            .lv-status {
                padding:5px 9px;
                border-radius:20px;
                font-size:10px;
                font-weight:800;
                background:#fef3c7;
                color:#92400e;
            }
            .lv-status.legible {
                background:#dcfce7;
                color:#166534;
            }
            .lv-status.ilegible {
                background:#fee2e2;
                color:#991b1b;
            }
            .lv-status.libre {
                background:#e2e8f0;
                color:#475569;
            }
            .lv-code {
                margin-top:8px;
                color:#64748b;
                font-size:11px;
                overflow-wrap:anywhere;
            }
            .lv-location {
                margin-top:13px;
                padding:10px;
                border-radius:10px;
                background:#f5f7fb;
                color:#475569;
                font-size:12px;
            }
            .lv-details {
                margin-top:14px;
                padding-top:12px;
                border-top:1px solid #edf0f5;
                font-size:12px;
                line-height:1.7;
            }
            .lv-details summary {
                cursor:pointer;
                color:#2453a6;
                font-weight:800;
            }
            .lv-empty {
                padding:35px;
                text-align:center;
                background:white;
                border:1px dashed #cbd5e1;
                border-radius:16px;
                color:#64748b;
            }
            .lv-actions {
                display:flex;
                gap:8px;
                flex-wrap:wrap;
                margin-top:12px;
            }
            .lv-edit-btn {
                border:1px solid #cbd5e1;
                background:#eff6ff;
                color:#1d4ed8;
                border-radius:9px;
                padding:8px 11px;
                font-weight:750;
                cursor:pointer;
            }
            .lv-editor {
                display:none;
                margin:14px 0;
                padding:18px;
                border:1px solid #bfdbfe;
                border-radius:14px;
                background:#eff6ff;
            }
            .lv-editor h3 {
                margin:0 0 14px;
                color:#17366b;
                font-size:16px;
            }
            .lv-form-grid {
                display:grid;
                grid-template-columns:repeat(2,minmax(0,1fr));
                gap:12px;
            }
            .lv-form-field label {
                display:block;
                margin-bottom:6px;
                color:#475569;
                font-size:11px;
                font-weight:800;
            }
            .lv-form-field input,
            .lv-form-field select,
            .lv-form-field textarea {
                width:100%;
                padding:10px 11px;
                border:1px solid #cbd5e1;
                border-radius:9px;
                background:white;
                color:#172033;
                font:inherit;
                font-size:13px;
            }
            .lv-form-field textarea {
                min-height:76px;
                resize:vertical;
            }
            .lv-form-wide { grid-column:1/-1; }
            .lv-editor-actions {
                display:flex;
                gap:9px;
                margin-top:14px;
            }
            .lv-message {
                display:none;
                margin:12px 0;
                padding:11px 13px;
                border-radius:9px;
                font-size:12px;
                font-weight:700;
            }
            .lv-message.success {
                display:block;
                color:#166534;
                background:#dcfce7;
            }
            .lv-message.error {
                display:block;
                color:#991b1b;
                background:#fee2e2;
            }
            .lv-button:disabled,
            .lv-edit-btn:disabled {
                opacity:.6;
                cursor:wait;
            }
            @media(max-width:760px) {
                .lv-filters { grid-template-columns:repeat(2,1fr); }
                .lv-grid { grid-template-columns:1fr; }
                .lv-form-grid { grid-template-columns:1fr; }
                .lv-form-wide { grid-column:auto; }
                .lv-wrap { width:calc(100% - 22px); }
            }
        `;
        document.head.appendChild(style);

        modal = document.createElement("div");
        modal.id = "lapisVaults";
        modal.innerHTML = `
            <div class="lv-wrap">

                <header class="lv-header">
                    <div>
                        <h2>Consulta de bóvedas</h2>
                        <div class="lv-muted">
                            Inventario del cementerio
                        </div>
                    </div>
                    <button class="lv-button secondary"
                        id="lvClose">← Volver</button>
                </header>

                <section class="lv-panel">
                    <div class="lv-filters">

                        <div class="lv-field">
                            <label>CEMENTERIO</label>
                            <select id="lvCemetery"></select>
                        </div>

                        <div class="lv-field">
                            <label>PABELLÓN</label>
                            <select id="lvPavilion"></select>
                        </div>

                        <div class="lv-field">
                            <label>GALERÍA</label>
                            <select id="lvGallery"></select>
                        </div>

                        <div class="lv-field">
                            <label>FILA</label>
                            <select id="lvRow"></select>
                        </div>

                    </div>

                    <div class="lv-field lv-search">
                        <label>BUSCAR POR SERIAL, CÓDIGO O NOMBRE</label>
                        <input id="lvSearch"
                            placeholder="Ej. SEP-000001 o nombre del fallecido">
                    </div>
                </section>

                <div class="lv-summary">
                    <strong>Inventario de bóvedas</strong>
                    <span class="lv-muted" id="lvCount">Cargando...</span>
                </div>

                <div id="lvMessage" class="lv-message"
                    role="status" aria-live="polite"></div>

                <section id="lvEditor" class="lv-editor"></section>

                <div id="lvResults">
                    <div class="lv-empty">Cargando inventario...</div>
                </div>

            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector("#lvClose")
            .addEventListener("click", close);

        modal.querySelector("#lvCemetery")
            .addEventListener("change", e => {
                selectedCemetery = e.target.value;
                selectedPavilion = "";
                selectedGallery = "";
                selectedRow = "";
                updateFilters();
                render();
            });

        modal.querySelector("#lvPavilion")
            .addEventListener("change", e => {
                selectedPavilion = e.target.value;
                selectedGallery = "";
                selectedRow = "";
                updateFilters();
                render();
            });

        modal.querySelector("#lvGallery")
            .addEventListener("change", e => {
                selectedGallery = e.target.value;
                selectedRow = "";
                updateFilters();
                render();
            });

        modal.querySelector("#lvRow")
            .addEventListener("change", e => {
                selectedRow = e.target.value;
                render();
            });

        modal.querySelector("#lvSearch")
            .addEventListener("input", e => {
                searchTerm = e.target.value.trim().toLowerCase();
                render();
            });

        // Delegación de eventos para los botones de edición.
        modal.addEventListener("click", e => {
            const button = e.target.closest("[data-lv-edit]");
            if (!button) return;

            openEditor(
                button.dataset.lvEdit,
                button.dataset.lvId
            );
        });

        modal.addEventListener("submit", async e => {
            const form = e.target.closest("#lvEditForm");
            if (!form) return;

            e.preventDefault();
            await saveEditor(form);
        });
    }

    function locationRows() {
        return (data?.sepulturas || []).filter(v =>
            !selectedCemetery ||
            String(v.cementerio_id) === selectedCemetery
        );
    }

    function fillSelect(id, values, selected, label) {
        const select = modal.querySelector("#" + id);
        const previous = selected;

        select.innerHTML =
            `<option value="">Todos</option>` +
            values.map(v =>
                `<option value="${esc(v)}">${esc(v)}</option>`
            ).join("");

        if (values.some(v => String(v) === previous)) {
            select.value = previous;
        } else {
            select.value = "";
        }

        if (label) {
            select.setAttribute("aria-label", label);
        }
    }

    function updateFilters() {
        const cemeteries = data?.cementerios || [];
        const cemeterySelect = modal.querySelector("#lvCemetery");

        cemeterySelect.innerHTML = cemeteries.map(c =>
            `<option value="${esc(c.id)}">${esc(c.nombre)}</option>`
        ).join("");

        if (!selectedCemetery && cemeteries.length) {
            selectedCemetery = String(cemeteries[0].id);
        }

        cemeterySelect.value = selectedCemetery;

        const rows = locationRows();

        const pavilions = [...new Set(
            rows.map(v => v.pabellon).filter(v => v != null)
        )].sort((a,b) => a-b);

        fillSelect(
            "lvPavilion",
            pavilions,
            selectedPavilion,
            "Pabellón"
        );

        selectedPavilion =
            modal.querySelector("#lvPavilion").value;

        const pavilionRows = rows.filter(v =>
            !selectedPavilion ||
            String(v.pabellon) === selectedPavilion
        );

        const galleries = [...new Set(
            pavilionRows.map(v => v.galeria).filter(v => v != null)
        )].sort((a,b) => a-b);

        fillSelect(
            "lvGallery",
            galleries,
            selectedGallery,
            "Galería"
        );

        selectedGallery =
            modal.querySelector("#lvGallery").value;

        const galleryRows = pavilionRows.filter(v =>
            !selectedGallery ||
            String(v.galeria) === selectedGallery
        );

        const rowNumbers = [...new Set(
            galleryRows.map(v => v.fila).filter(v => v != null)
        )].sort((a,b) => a-b);

        fillSelect(
            "lvRow",
            rowNumbers,
            selectedRow,
            "Fila"
        );

        selectedRow = modal.querySelector("#lvRow").value;
    }

    function render() {
        if (!data) return;

        let records = locationRows();

        if (selectedPavilion) {
            records = records.filter(v =>
                String(v.pabellon) === selectedPavilion
            );
        }

        if (selectedGallery) {
            records = records.filter(v =>
                String(v.galeria) === selectedGallery
            );
        }

        if (selectedRow) {
            records = records.filter(v =>
                String(v.fila) === selectedRow
            );
        }

        const people = data.fallecidos || [];
        const photos = data.fotografias || [];

        if (searchTerm) {
            records = records.filter(v => {
                const associated = people.filter(p =>
                    p.sepultura_id === v.id
                );

                const searchable = [
                    v.serial,
                    v.codigo_original,
                    v.codigo_inventario,
                    ...associated.map(p => p.nombre_completo)
                ].join(" ").toLowerCase();

                return searchable.includes(searchTerm);
            });
        }

        modal.querySelector("#lvCount").textContent =
            records.length + " bóveda(s)";

        if (!records.length) {
            modal.querySelector("#lvResults").innerHTML = `
                <div class="lv-empty">
                    No encontramos bóvedas con esos filtros.
                </div>
            `;
            return;
        }

        modal.querySelector("#lvResults").innerHTML = `
            <div class="lv-grid">
                ${records.map(v => {
                    const associated = people.filter(p =>
                        p.sepultura_id === v.id
                    );

                    const images = photos.filter(p =>
                        p.sepultura_id === v.id
                    );

                    const status = String(v.estado || "")
                        .toLowerCase();

                    const statusClass =
                        status === "legible" ? "legible" :
                        status === "ilegible" ? "ilegible" :
                        status === "libre" ? "libre" : "";

                    return `
                        <article class="lv-card">

                            <div class="lv-card-top">
                                <div class="lv-serial">
                                    ${esc(v.serial)}
                                </div>
                                <span class="lv-status ${statusClass}">
                                    ${esc(v.estado)}
                                </span>
                            </div>

                            <div class="lv-code">
                                Inventario:
                                ${esc(v.codigo_inventario || "Sin código")}
                            </div>

                            <div class="lv-location">
                                Pabellón ${esc(v.pabellon)}
                                · Galería ${esc(v.galeria)}
                                · Fila ${esc(v.fila)}
                            </div>

                            <details class="lv-details">
                                <summary>
                                    Ver ficha y datos asociados
                                </summary>

                                <p>
                                    <strong>Código original:</strong>
                                    ${esc(v.codigo_original || "No registrado")}
                                </p>

                                <p>
                                    <strong>Fallecidos:</strong>
                                    ${associated.length}
                                </p>

                                ${associated.length
                                    ? associated.map(p => `
                                        <div>
                                            <strong>
                                                ${esc(p.nombre_completo)}
                                            </strong>
                                            <br>
                                            Nacimiento:
                                            ${esc(p.fecha_nacimiento || "No registrado")}
                                            <br>
                                            Fallecimiento:
                                            ${esc(p.fecha_fallecimiento || "No registrado")}
                                            <br>
                                            Edad inscrita:
                                            ${esc(p.edad_inscrita || "No registrada")}
                                            ${p.dedicatoria
                                                ? `<br>Dedicatoria: ${esc(p.dedicatoria)}`
                                                : ""}
                                            <div class="lv-actions">
                                                <button type="button"
                                                    class="lv-edit-btn"
                                                    data-lv-edit="fallecido"
                                                    data-lv-id="${esc(p.id)}">
                                                    Editar datos del fallecido
                                                </button>
                                            </div>
                                        </div>
                                        <hr>
                                    `).join("")
                                    : "<p>Sin personas asociadas.</p>"
                                }

                                <p>
                                    <strong>Fotografías registradas:</strong>
                                    ${images.length}
                                </p>

                                ${images.map(photo => `
                                    <p>
                                        ${esc(photo.tipo_fotografia)}
                                        · ${esc(photo.nombre_original || "Fotografía")}
                                    </p>
                                `).join("")}

                                ${v.observaciones
                                    ? `<p><strong>Observaciones:</strong> ${esc(v.observaciones)}</p>`
                                    : ""}

                                <div class="lv-actions">
                                    <button type="button"
                                        class="lv-edit-btn"
                                        data-lv-edit="sepultura"
                                        data-lv-id="${esc(v.id)}">
                                        Editar datos de la bóveda
                                    </button>
                                </div>
                            </details>
                        </article>
                    `;
                }).join("")}
            </div>
        `;
    }

    function showMessage(message, type) {
        const box = modal.querySelector("#lvMessage");
        box.textContent = message;
        box.className = "lv-message " + (type || "success");
        box.style.display = "block";
    }

    function hideEditor() {
        const editor = modal.querySelector("#lvEditor");
        editor.style.display = "none";
        editor.innerHTML = "";
    }

    function openEditor(type, id) {
        const editor = modal.querySelector("#lvEditor");

        const record = type === "sepultura"
            ? (data?.sepulturas || []).find(
                v => String(v.id) === String(id)
            )
            : (data?.fallecidos || []).find(
                p => String(p.id) === String(id)
            );

        if (!record) {
            showMessage(
                "No se encontró el registro que deseas editar.",
                "error"
            );
            return;
        }

        const isVault = type === "sepultura";

        const fields = isVault
            ? `
                <div class="lv-form-field">
                    <label for="lvCodigoOriginal">
                        Código original *
                    </label>
                    <input
                        id="lvCodigoOriginal"
                        name="codigo_original"
                        maxlength="120"
                        required
                        value="${esc(record.codigo_original || "")}">
                </div>

                <div class="lv-form-field">
                    <label for="lvCodigoInventario">
                        Código de inventario
                    </label>
                    <input
                        id="lvCodigoInventario"
                        name="codigo_inventario"
                        maxlength="120"
                        value="${esc(record.codigo_inventario || "")}">
                </div>

                <div class="lv-form-field">
                    <label for="lvPabellonEdit">Pabellón *</label>
                    <input
                        id="lvPabellonEdit"
                        name="pabellon"
                        type="number"
                        min="1"
                        step="1"
                        required
                        value="${esc(record.pabellon)}">
                </div>

                <div class="lv-form-field">
                    <label for="lvGaleriaEdit">Galería *</label>
                    <input
                        id="lvGaleriaEdit"
                        name="galeria"
                        type="number"
                        min="1"
                        step="1"
                        required
                        value="${esc(record.galeria)}">
                </div>

                <div class="lv-form-field">
                    <label for="lvFilaEdit">Fila *</label>
                    <input
                        id="lvFilaEdit"
                        name="fila"
                        type="number"
                        min="1"
                        step="1"
                        required
                        value="${esc(record.fila)}">
                </div>

                <div class="lv-form-field">
                    <label for="lvEstadoEdit">Estado *</label>
                    <select
                        id="lvEstadoEdit"
                        name="estado"
                        required>
                        ${["Pendiente","Legible","Ilegible","Libre"].map(s =>
                            `<option value="${s}" ${record.estado === s ? "selected" : ""}>${s}</option>`
                        ).join("")}
                    </select>
                </div>

                <div class="lv-form-field lv-form-wide">
                    <label for="lvObservacionesEdit">
                        Observaciones
                    </label>
                    <textarea
                        id="lvObservacionesEdit"
                        name="observaciones"
                        maxlength="5000">${esc(record.observaciones || "")}</textarea>
                </div>
            `
            : `
                <div class="lv-form-field lv-form-wide">
                    <label for="lvNombreEdit">Nombre completo *</label>
                    <input
                        id="lvNombreEdit"
                        name="nombre_completo"
                        maxlength="250"
                        required
                        value="${esc(record.nombre_completo || "")}">
                </div>

                <div class="lv-form-field">
                    <label for="lvNacimientoEdit">
                        Fecha de nacimiento
                    </label>
                    <input
                        id="lvNacimientoEdit"
                        name="fecha_nacimiento"
                        maxlength="2000"
                        value="${esc(record.fecha_nacimiento || "")}">
                </div>

                <div class="lv-form-field">
                    <label for="lvFallecimientoEdit">
                        Fecha de fallecimiento
                    </label>
                    <input
                        id="lvFallecimientoEdit"
                        name="fecha_fallecimiento"
                        maxlength="2000"
                        value="${esc(record.fecha_fallecimiento || "")}">
                </div>

                <div class="lv-form-field">
                    <label for="lvEdadEdit">Edad inscrita</label>
                    <input
                        id="lvEdadEdit"
                        name="edad_inscrita"
                        maxlength="2000"
                        value="${esc(record.edad_inscrita || "")}">
                </div>

                <div class="lv-form-field lv-form-wide">
                    <label for="lvDedicatoriaEdit">Dedicatoria</label>
                    <textarea
                        id="lvDedicatoriaEdit"
                        name="dedicatoria"
                        maxlength="2000">${esc(record.dedicatoria || "")}</textarea>
                </div>
            `;

        editor.innerHTML = `
            <h3>
                ${isVault
                    ? "Editar bóveda " + esc(record.serial || "")
                    : "Editar datos del fallecido"}
            </h3>

            <p class="lv-muted">
                Los cambios se guardarán en la base de datos de LAPIS.
            </p>

            <form id="lvEditForm">
                <input type="hidden" name="tipo" value="${type}">
                <input type="hidden" name="id" value="${esc(record.id)}">

                <div class="lv-form-grid">
                    ${fields}
                </div>

                <div class="lv-editor-actions">
                    <button
                        class="lv-button"
                        id="lvSaveButton"
                        type="submit">
                        Guardar cambios
                    </button>

                    <button
                        class="lv-button secondary"
                        type="button"
                        id="lvCancelButton">
                        Cancelar
                    </button>
                </div>
            </form>
        `;

        editor.style.display = "block";

        editor.querySelector("#lvCancelButton")
            .addEventListener("click", hideEditor);

        editor.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        modal.querySelector("#lvMessage").style.display = "none";
    }

    async function saveEditor(form) {
        const saveButton = form.querySelector("#lvSaveButton");
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        if (payload.tipo === "sepultura") {
            payload.pabellon = Number(payload.pabellon);
            payload.galeria = Number(payload.galeria);
            payload.fila = Number(payload.fila);
        }

        saveButton.disabled = true;
        saveButton.textContent = "Guardando...";

        try {
            const response = await fetch("/api/record-update", {
                method: "PATCH",
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json().catch(() => ({}));

            if (
                !response.ok ||
                !result.success ||
                !result.registro
            ) {
                throw new Error(
                    result.error ||
                    "No fue posible guardar los cambios."
                );
            }

            const collection = payload.tipo === "sepultura"
                ? data.sepulturas
                : data.fallecidos;

            const index = collection.findIndex(item =>
                String(item.id) === String(payload.id)
            );

            if (index === -1) {
                throw new Error(
                    "Se guardó en el servidor, pero no se pudo actualizar la ficha visible. Vuelve a abrir la consulta."
                );
            }

            collection[index] = {
                ...collection[index],
                ...result.registro
            };

            hideEditor();
            render();

            showMessage(
                result.message ||
                "Cambios guardados correctamente.",
                "success"
            );

        } catch (error) {
            showMessage(
                error.message ||
                "Error guardando los cambios.",
                "error"
            );

            saveButton.disabled = false;
            saveButton.textContent = "Guardar cambios";
        }
    }

    async function open() {
        createModal();

        modal.style.display = "block";
        hideEditor();

        modal.querySelector("#lvMessage").style.display = "none";

        modal.querySelector("#lvResults").innerHTML =
            '<div class="lv-empty">Cargando inventario...</div>';

        try {
            const response = await fetch("/api/vaults", {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store"
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "Error consultando bóvedas."
                );
            }

            data = result;

            selectedCemetery = "";
            selectedPavilion = "";
            selectedGallery = "";
            selectedRow = "";
            searchTerm = "";

            modal.querySelector("#lvSearch").value = "";

            updateFilters();
            render();

        } catch (error) {
            modal.querySelector("#lvResults").innerHTML =
                `<div class="lv-empty">${esc(error.message)}</div>`;
        }
    }

    function close() {
        if (modal) {
            modal.style.display = "none";
        }

        const dashboard =
            document.getElementById("lapisDashboard");

        const back =
            document.getElementById("lapisBackDashboard");

        if (dashboard) {
            dashboard.style.display = "block";
        }

        if (back) {
            back.style.display = "none";
        }
    }

    window.LAPISVaults = {
        open,
        close
    };

})();

/**
 * Lector de Imágenes y Escáner OCR Dual con Soporte de Lote (10 Lápidas) y PDF Individual
 * Archivo: app.js
 */
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const emptyState = document.getElementById('emptyState');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const scannerLaser = document.getElementById('scannerLaser');

    // Controles de ajuste de imagen
    const imageAdjustmentsBar = document.getElementById('imageAdjustmentsBar');
    const brightnessSlider = document.getElementById('brightnessSlider');
    const contrastSlider = document.getElementById('contrastSlider');
    const brightnessVal = document.getElementById('brightnessVal');
    const contrastVal = document.getElementById('contrastVal');
    const btnRotate90 = document.getElementById('btnRotate90');
    const btnResetAdjustments = document.getElementById('btnResetAdjustments');

    // Selector de Motor Dual
    const btnEngineAI = document.getElementById('btnEngineAI');
    const btnEngineClassic = document.getElementById('btnEngineClassic');

    // Cámara
    const cameraContainer = document.getElementById('cameraContainer');
    const cameraFeed = document.getElementById('cameraFeed');
    const btnStartCamera = document.getElementById('btnStartCamera');
    const btnCapturePhoto = document.getElementById('btnCapturePhoto');
    const btnStopCamera = document.getElementById('btnStopCamera');

    // Botones de ejemplo y API Key
    const btnLoadSample = document.getElementById('btnLoadSample');
    const btnLoadTechSample = document.getElementById('btnLoadTechSample');
    const btnOpenApiKeyModal = document.getElementById('btnOpenApiKeyModal');
    const apiKeyBtnLabel = document.getElementById('apiKeyBtnLabel');
    const apiKeyModal = document.getElementById('apiKeyModal');
    const btnCloseApiKeyModal = document.getElementById('btnCloseApiKeyModal');
    const btnCancelApiKey = document.getElementById('btnCancelApiKey');
    const btnSaveApiKey = document.getElementById('btnSaveApiKey');
    const btnRemoveApiKey = document.getElementById('btnRemoveApiKey');
    const personalApiKeyInput = document.getElementById('personalApiKeyInput');

    // Progreso y resultado OCR
    const btnScanNow = document.getElementById('btnScanNow');
    const progressWrapper = document.getElementById('progressWrapper');
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');
    const statusText = document.getElementById('statusText');

    const extractedText = document.getElementById('extractedText');
    const wordCountBadge = document.getElementById('wordCountBadge');
    const liveBadge = document.getElementById('liveBadge');
    const languageSelect = document.getElementById('languageSelect');

    const btnCopy = document.getElementById('btnCopy');
    const copyLabel = document.getElementById('copyLabel');
    const btnDownload = document.getElementById('btnDownload');
    const btnClearAll = document.getElementById('btnClearAll');

    // Lectura en voz alta
    const btnSpeakToggle = document.getElementById('btnSpeakToggle');
    const btnStopSpeech = document.getElementById('btnStopSpeech');
    const speakLabel = document.getElementById('speakLabel');
    const iconPlay = document.getElementById('iconPlay');
    const iconPause = document.getElementById('iconPause');

    // Ficha Individual (Datos para Excel y PDF)
    const fichaSubtitleLabel = document.getElementById('fichaSubtitleLabel');
    const fichaStatusBadge = document.getElementById('fichaStatusBadge');
    const btnAutoFillFromText = document.getElementById('btnAutoFillFromText');
    const btnCopyExcelRow = document.getElementById('btnCopyExcelRow');
    const btnExportCsv = document.getElementById('btnExportCsv');
    const btnExportPdf = document.getElementById('btnExportPdf');
    const bovedaFileInput = document.getElementById('bovedaFileInput');
    const bovedaUploadLabel = document.getElementById('bovedaUploadLabel');
    const btnClearBoveda = document.getElementById('btnClearBoveda');
    const bovedaPreviewBox = document.getElementById('bovedaPreviewBox');
    const bovedaImagePreview = document.getElementById('bovedaImagePreview');

    const fieldCodigoOriginal = document.getElementById('fieldCodigoOriginal');
    const fieldSerialManual = document.getElementById('fieldSerialManual');
    const fieldEstado = document.getElementById('fieldEstado');
    const personSelector = document.getElementById('personSelector');
    const btnAddPerson = document.getElementById('btnAddPerson');
    const btnRemovePerson = document.getElementById('btnRemovePerson');
    const fieldNombreInscrito = document.getElementById('fieldNombreInscrito');
    const fieldNacimiento = document.getElementById('fieldNacimiento');
    const fieldFallecimiento = document.getElementById('fieldFallecimiento');
    const fieldEdadInscrita = document.getElementById('fieldEdadInscrita');
    const fieldDedicatoria = document.getElementById('fieldDedicatoria');
    const fieldInscripcionCompleta = document.getElementById('fieldInscripcionCompleta');

    const helperCanvas = document.getElementById('helperCanvas');

    // Estado de la aplicación
    let currentImageSource = null;
    let bovedaImageSource = null;
    let mediaStream = null;
    let isScanning = false;
    let isSpeaking = false;
    let isPaused = false;
    let activeEngine = 'gemini';

    // Estado de Lote (Hasta 10 imágenes de lápidas independientes)
    const MAX_LAPIDAS = 10;
    let lapidasBatch = [];
    let activeLapidaIndex = -1;

    const batchTrayWrapper = document.getElementById('batchTrayWrapper');
    const batchCounterLabel = document.getElementById('batchCounterLabel');
    const batchThumbnailsGrid = document.getElementById('batchThumbnailsGrid');
    const btnScanAllBatch = document.getElementById('btnScanAllBatch');
    const btnAddMoreLapidas = document.getElementById('btnAddMoreLapidas');

    // Estado de ajustes visuales de imagen
    let imgBrightness = 100;
    let imgContrast = 100;
    let imgRotation = 0;

    // Estado estructurado de la Ficha Individual (soporta múltiples personas)
    let peopleRecords = [
        { nombre: '', nacimiento: '', fallecimiento: '', edad: '', dedicatoria: '' }
    ];
    let activePersonIndex = 0;

    // --- GESTIÓN DE CLAVE API PERSONAL DE GEMINI ---
    const API_KEY_STORAGE = 'gemini_personal_api_key';
    function getGeminiApiKey() {
        return (localStorage.getItem(API_KEY_STORAGE) || '').trim();
    }

    function refreshApiKeyButtonUI() {
        const saved = getGeminiApiKey();
        if (saved) {
            apiKeyBtnLabel.textContent = 'API Gemini Activa';
            btnOpenApiKeyModal.className = 'inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200/80 border border-emerald-300 px-3.5 py-2 rounded-xl transition-all active:scale-95 cursor-pointer';
        } else {
            apiKeyBtnLabel.textContent = 'Clave API Gemini';
            btnOpenApiKeyModal.className = 'inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100/90 hover:bg-emerald-50 border border-slate-200/80 px-3.5 py-2 rounded-xl transition-all active:scale-95 cursor-pointer';
        }
    }

    btnOpenApiKeyModal.addEventListener('click', () => {
        personalApiKeyInput.value = getGeminiApiKey();
        apiKeyModal.classList.remove('hidden');
    });
    [btnCloseApiKeyModal, btnCancelApiKey].forEach(el => {
        el.addEventListener('click', () => apiKeyModal.classList.add('hidden'));
    });
    btnSaveApiKey.addEventListener('click', () => {
        const val = personalApiKeyInput.value.trim();
        if (!val) {
            showToast('Ingresa una clave API válida o pulsa "Borrar clave".', 'error');
            return;
        }
        localStorage.setItem(API_KEY_STORAGE, val);
        refreshApiKeyButtonUI();
        apiKeyModal.classList.add('hidden');
        showToast('Clave API personal guardada correctamente.', 'success');
    });
    btnRemoveApiKey.addEventListener('click', () => {
        localStorage.removeItem(API_KEY_STORAGE);
        personalApiKeyInput.value = '';
        refreshApiKeyButtonUI();
        apiKeyModal.classList.add('hidden');
        showToast('Clave API personal eliminada.', 'info');
    });
    refreshApiKeyButtonUI();

    // --- FUNCIONES AUXILIARES DE UI ---
    function showToast(message, type = 'info') {
        const toast = document.getElementById('toastNotification');
        const toastMsg = document.getElementById('toastMessage');
        const toastIcon = document.getElementById('toastIcon');
        if (!toast || !toastMsg) return;

        toastMsg.textContent = message;
        if (toastIcon) {
            toastIcon.className = 'w-2 h-2 rounded-full ' + (
                type === 'error' ? 'bg-rose-400' :
                type === 'success' ? 'bg-emerald-400' : 'bg-sky-400'
            );
        }
        toast.classList.remove('translate-y-20', 'opacity-0');
        clearTimeout(window.__toastTimer);
        window.__toastTimer = setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
        }, 3200);
    }

    function updateWordCount() {
        const text = (extractedText.value || '').trim();
        const words = text ? text.split(/\s+/).length : 0;
        if (words > 0) {
            wordCountBadge.textContent = `${words} palabra${words === 1 ? '' : 's'}`;
            wordCountBadge.classList.remove('hidden');
        } else {
            wordCountBadge.classList.add('hidden');
        }
    }

    function updatePreviewTransformAndFilters() {
        brightnessVal.textContent = `${imgBrightness}%`;
        contrastVal.textContent = `${imgContrast}%`;
        imagePreview.style.filter = `brightness(${imgBrightness}%) contrast(${imgContrast}%)`;
        imagePreview.style.transform = `rotate(${imgRotation}deg)`;
    }

    brightnessSlider.addEventListener('input', (e) => {
        imgBrightness = Number(e.target.value);
        updatePreviewTransformAndFilters();
    });

    contrastSlider.addEventListener('input', (e) => {
        imgContrast = Number(e.target.value);
        updatePreviewTransformAndFilters();
    });

    // --- GESTIÓN DEL LOTE DE HASTA 10 LÁPIDAS INDEPENDIENTES ---
    function createEmptyFichaState() {
        return {
            codigoOriginal: '#FILA/0 #P0 G0',
            serialManual: '',
            estado: 'Legible',
            peopleRecords: [{ nombre: '', nacimiento: '', fallecimiento: '', edad: '', dedicatoria: '' }],
            activePersonIndex: 0,
            inscripcionCompleta: '',
            extractedText: '',
            isCompleted: false
        };
    }

    function saveActiveLapidaState() {
        if (activeLapidaIndex < 0 || !lapidasBatch[activeLapidaIndex]) return;
        saveCurrentPersonFromInputs();
        const item = lapidasBatch[activeLapidaIndex];
        item.brightness = imgBrightness;
        item.contrast = imgContrast;
        item.rotation = imgRotation;
        item.ficha = {
            codigoOriginal: fieldCodigoOriginal.value.trim() || '#FILA/0 #P0 G0',
            serialManual: fieldSerialManual.value.trim(),
            estado: fieldEstado.value,
            peopleRecords: JSON.parse(JSON.stringify(peopleRecords)),
            activePersonIndex: activePersonIndex,
            inscripcionCompleta: fieldInscripcionCompleta.value,
            extractedText: extractedText.value,
            isCompleted: fichaStatusBadge.textContent === 'Autocompletado'
        };
    }

    function renderBatchTray() {
        if (lapidasBatch.length === 0) {
            batchTrayWrapper.classList.add('hidden');
            fichaSubtitleLabel.textContent = 'FICHA INDIVIDUAL';
            return;
        }
        batchTrayWrapper.classList.remove('hidden');
        batchCounterLabel.textContent = `Lote: ${lapidasBatch.length} / ${MAX_LAPIDAS} lápidas (Viendo #${activeLapidaIndex + 1})`;
        fichaSubtitleLabel.textContent = `FICHA INDIVIDUAL — LÁPIDA #${activeLapidaIndex + 1} DE ${lapidasBatch.length}`;
        btnAddMoreLapidas.disabled = lapidasBatch.length >= MAX_LAPIDAS;
        btnAddMoreLapidas.classList.toggle('opacity-50', lapidasBatch.length >= MAX_LAPIDAS);

        batchThumbnailsGrid.innerHTML = '';
        lapidasBatch.forEach((item, idx) => {
            const isActive = idx === activeLapidaIndex;
            const cell = document.createElement('div');
            cell.className = `relative group aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                isActive ? 'border-brand-600 ring-2 ring-brand-500/30 scale-[1.03]' : 'border-slate-300/80 hover:border-brand-400 opacity-85 hover:opacity-100'
            }`;
            cell.title = `Lápida ${idx + 1}${item.ficha?.isCompleted ? ' (Escaneada)' : ' (Pendiente)'}`;

            const img = document.createElement('img');
            img.src = item.dataUrl;
            img.alt = `Lápida ${idx + 1}`;
            img.className = 'w-full h-full object-cover bg-slate-900';
            cell.appendChild(img);

            const numBadge = document.createElement('span');
            numBadge.className = `absolute bottom-0.5 left-0.5 text-[9px] font-extrabold px-1 rounded ${
                item.ficha?.isCompleted ? 'bg-emerald-600 text-white' : 'bg-slate-900/80 text-white'
            }`;
            numBadge.textContent = `${idx + 1}`;
            cell.appendChild(numBadge);

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.innerHTML = '&times;';
            delBtn.title = 'Quitar del lote';
            delBtn.className = 'hidden group-hover:flex absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold items-center justify-center leading-none shadow';
            delBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                removeLapidaFromBatch(idx);
            });
            cell.appendChild(delBtn);

            cell.addEventListener('click', () => {
                if (isScanning || idx === activeLapidaIndex) return;
                selectLapidaFromBatch(idx, false);
            });

            batchThumbnailsGrid.appendChild(cell);
        });
    }

    function selectLapidaFromBatch(index, autoScan = false) {
        if (index < 0 || index >= lapidasBatch.length) return;
        if (activeLapidaIndex >= 0 && activeLapidaIndex !== index && lapidasBatch[activeLapidaIndex]) {
            saveActiveLapidaState();
        }

        activeLapidaIndex = index;
        const item = lapidasBatch[index];

        stopCameraStream();
        currentImageSource = item.dataUrl;
        imagePreview.src = item.dataUrl;
        emptyState.classList.add('hidden');
        previewContainer.classList.remove('hidden');
        imageAdjustmentsBar.classList.remove('hidden');
        btnScanNow.disabled = false;

        imgBrightness = item.brightness ?? 100;
        imgContrast = item.contrast ?? 100;
        imgRotation = item.rotation ?? 0;
        brightnessSlider.value = imgBrightness;
        contrastSlider.value = imgContrast;
        updatePreviewTransformAndFilters();

        const f = item.ficha || createEmptyFichaState();
        fieldCodigoOriginal.value = f.codigoOriginal || '#FILA/0 #P0 G0';
        fieldSerialManual.value = f.serialManual || '';
        fieldEstado.value = f.estado || 'Legible';
        peopleRecords = JSON.parse(JSON.stringify(f.peopleRecords || [{ nombre: '', nacimiento: '', fallecimiento: '', edad: '', dedicatoria: '' }]));
        loadPersonIntoInputs(f.activePersonIndex || 0);
        fieldInscripcionCompleta.value = f.inscripcionCompleta || '';
        extractedText.value = f.extractedText || '';
        updateWordCount();
        updateFichaStatusBadge(Boolean(f.isCompleted));

        renderBatchTray();

        if (autoScan) {
            runOCRProcess();
        }
    }

    function removeLapidaFromBatch(index) {
        lapidasBatch.splice(index, 1);
        if (lapidasBatch.length === 0) {
            activeLapidaIndex = -1;
            currentImageSource = null;
            imagePreview.src = '';
            extractedText.value = '';
            updateWordCount();
            previewContainer.classList.add('hidden');
            imageAdjustmentsBar.classList.add('hidden');
            emptyState.classList.remove('hidden');
            btnScanNow.disabled = true;
            fieldCodigoOriginal.value = '#FILA/0 #P0 G0';
            fieldSerialManual.value = '';
            fieldEstado.value = 'Legible';
            peopleRecords = [{ nombre: '', nacimiento: '', fallecimiento: '', edad: '', dedicatoria: '' }];
            loadPersonIntoInputs(0);
            fieldInscripcionCompleta.value = '';
            updateFichaStatusBadge(false);
            renderBatchTray();
            return;
        }
        const nextIndex = Math.min(index, lapidasBatch.length - 1);
        activeLapidaIndex = -1;
        selectLapidaFromBatch(nextIndex, false);
    }

    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function addFilesToBatch(fileList, autoScanFirst = true) {
        const validImages = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
        if (validImages.length === 0) {
            showToast('Selecciona archivos de imagen válidos.', 'error');
            return;
        }

        const availableSlots = MAX_LAPIDAS - lapidasBatch.length;
        if (availableSlots <= 0) {
            showToast(`Ya alcanzaste el máximo de ${MAX_LAPIDAS} imágenes de lápidas.`, 'info');
            return;
        }

        const filesToLoad = validImages.slice(0, availableSlots);
        if (validImages.length > availableSlots) {
            showToast(`Solo se agregaron ${availableSlots} imágenes (máximo ${MAX_LAPIDAS} por lote).`, 'info');
        }

        if (activeLapidaIndex >= 0) {
            saveActiveLapidaState();
        }

        const startIdx = lapidasBatch.length;
        for (const file of filesToLoad) {
            const dataUrl = await readFileAsDataUrl(file);
            lapidasBatch.push({
                name: file.name,
                dataUrl,
                brightness: 100,
                contrast: 100,
                rotation: 0,
                ficha: createEmptyFichaState()
            });
        }

        selectLapidaFromBatch(startIdx, autoScanFirst);
        if (filesToLoad.length > 1) {
            showToast(`${filesToLoad.length} lápidas cargadas. Usa "Escanear Todas" para procesar cada una.`, 'success');
        }
    }

    // --- CARGA DE IMÁGENES ---
    function loadImageIntoPreview(dataUrl, autoScan = false) {
        if (activeLapidaIndex >= 0) {
            saveActiveLapidaState();
        }
        if (lapidasBatch.length >= MAX_LAPIDAS) {
            lapidasBatch[activeLapidaIndex] = {
                name: `Lapida_${activeLapidaIndex + 1}`,
                dataUrl,
                brightness: 100,
                contrast: 100,
                rotation: 0,
                ficha: createEmptyFichaState()
            };
            selectLapidaFromBatch(activeLapidaIndex, autoScan);
            return;
        }
        lapidasBatch.push({
            name: `Lapida_${lapidasBatch.length + 1}`,
            dataUrl,
            brightness: 100,
            contrast: 100,
            rotation: 0,
            ficha: createEmptyFichaState()
        });
        selectLapidaFromBatch(lapidasBatch.length - 1, autoScan);
    }

    btnAddMoreLapidas.addEventListener('click', () => {
        fileInput.value = '';
        fileInput.click();
    });

    btnScanAllBatch.addEventListener('click', async () => {
        if (isScanning || lapidasBatch.length === 0) return;
        saveActiveLapidaState();
        showToast(`Escaneando individualmente ${lapidasBatch.length} lápidas...`, 'info');
        for (let i = 0; i < lapidasBatch.length; i++) {
            selectLapidaFromBatch(i, false);
            await runOCRProcess();
        }
        showToast(`¡Listo! Las ${lapidasBatch.length} fichas individuales fueron rellenadas.`, 'success');
    });

    fileInput.addEventListener('change', (e) => {
        if (!e.target.files || e.target.files.length === 0) return;
        addFilesToBatch(e.target.files, true);
    });

    // Descargar archivo CSV compatible con Excel (UTF-8 con BOM)
    btnExportCsv.addEventListener('click', () => {
        saveActiveLapidaState();
        const escapeCsv = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
        const headers = [
            'Lapida #',
            'Codigo original',
            'Serial manual',
            'Estado',
            'Persona inscrita',
            'Nombre inscrito',
            'Nacimiento',
            'Fallecimiento',
            'Edad inscrita',
            'Dedicatoria',
            'Inscripcion completa'
        ];
        const csvLines = [headers.map(escapeCsv).join(',')];

        const itemsToExport = lapidasBatch.length > 0
            ? lapidasBatch
            : [{
                ficha: {
                    codigoOriginal: fieldCodigoOriginal.value.trim(),
                    serialManual: fieldSerialManual.value.trim(),
                    estado: fieldEstado.value,
                    peopleRecords,
                    inscripcionCompleta: fieldInscripcionCompleta.value
                }
            }];

        itemsToExport.forEach((item, lapidaIdx) => {
            const f = item.ficha || createEmptyFichaState();
            const personas = (f.peopleRecords && f.peopleRecords.length > 0)
                ? f.peopleRecords
                : [{ nombre: '', nacimiento: '', fallecimiento: '', edad: '', dedicatoria: '' }];
            personas.forEach((p, idx) => {
                csvLines.push([
                    `Lápida ${lapidaIdx + 1}`,
                    f.codigoOriginal || '#FILA/0 #P0 G0',
                    f.serialManual || '',
                    f.estado || 'Legible',
                    `Persona ${idx + 1}`,
                    p.nombre,
                    p.nacimiento,
                    p.fallecimiento,
                    p.edad,
                    p.dedicatoria,
                    (f.inscripcionCompleta || '').replace(/\s+/g, ' ').trim()
                ].map(escapeCsv).join(','));
            });
        });

        const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fichas_excel_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Archivo .CSV descargado con ${itemsToExport.length} ficha(s).`, 'success');
    });

    btnRotate90.addEventListener('click', () => {
        imgRotation = (imgRotation + 90) % 360;
        updatePreviewTransformAndFilters();
    });

    btnResetAdjustments.addEventListener('click', () => {
        imgBrightness = 100;
        imgContrast = 100;
        imgRotation = 0;
        brightnessSlider.value = 100;
        contrastSlider.value = 100;
        updatePreviewTransformAndFilters();
    });

    dropZone.addEventListener('click', (e) => {
        if (!cameraContainer.classList.contains('hidden')) return;
        if (e.target.closest('button')) return;
        fileInput.value = '';
        fileInput.click();
    });

    ['dragenter', 'dragover'].forEach(evtName => {
        dropZone.addEventListener(evtName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('border-brand-500', 'bg-brand-50/40');
        });
    });

    // --- SELECTOR DE MOTOR DUAL Y TAMAÑO DE FUENTE ---
    function setEngine(engine) {
        activeEngine = engine;
        if (engine === 'gemini') {
            btnEngineAI.className = 'engine-tab py-2 px-3 rounded-xl text-xs font-semibold bg-white text-brand-700 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer';
            btnEngineClassic.className = 'engine-tab py-2 px-3 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer';
            liveBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-brand-600"></span> Motor IA Multimodal Listo (Soporte Cursiva)';
        } else {
            btnEngineClassic.className = 'engine-tab py-2 px-3 rounded-xl text-xs font-semibold bg-white text-brand-700 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer';
            btnEngineAI.className = 'engine-tab py-2 px-3 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer';
            liveBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-sky-600"></span> OCR Clásico con Filtro Adaptativo Listo';
        }
    }

    document.querySelectorAll('.font-size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sizeClass = btn.getAttribute('data-font-size') || 'text-base';
            extractedText.classList.remove('text-sm', 'text-base', 'text-lg');
            extractedText.classList.add(sizeClass);

            document.querySelectorAll('.font-size-btn').forEach(b => {
                b.className = 'font-size-btn px-2 py-1 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer';
            });
            btn.className = 'font-size-btn px-2 py-1 text-xs font-bold rounded-lg bg-white text-brand-700 shadow-2xs cursor-pointer';
        });
    });

    btnEngineAI.addEventListener('click', () => setEngine('gemini'));
    btnEngineClassic.addEventListener('click', () => setEngine('tesseract'));
    extractedText.addEventListener('input', updateWordCount);

    // --- GESTIÓN DE LA FICHA INDIVIDUAL (DATOS PARA EXCEL) ---
    function saveCurrentPersonFromInputs() {
        if (!peopleRecords[activePersonIndex]) return;
        peopleRecords[activePersonIndex] = {
            nombre: fieldNombreInscrito.value.trim(),
            nacimiento: fieldNacimiento.value.trim(),
            fallecimiento: fieldFallecimiento.value.trim(),
            edad: fieldEdadInscrita.value.trim(),
            dedicatoria: fieldDedicatoria.value.trim()
        };
    }

    function renderPersonSelector() {
        personSelector.innerHTML = '';
        peopleRecords.forEach((p, idx) => {
            const opt = document.createElement('option');
            opt.value = String(idx);
            opt.textContent = p.nombre ? `Persona ${idx + 1} (${p.nombre})` : `Persona ${idx + 1}`;
            if (idx === activePersonIndex) opt.selected = true;
            personSelector.appendChild(opt);
        });
        btnRemovePerson.disabled = peopleRecords.length <= 1;
    }

    function loadPersonIntoInputs(index) {
        activePersonIndex = index;
        const p = peopleRecords[index] || { nombre: '', nacimiento: '', fallecimiento: '', edad: '', dedicatoria: '' };
        fieldNombreInscrito.value = p.nombre || '';
        fieldNacimiento.value = p.nacimiento || '';
        fieldFallecimiento.value = p.fallecimiento || '';
        fieldEdadInscrita.value = p.edad || '';
        fieldDedicatoria.value = p.dedicatoria || '';
        renderPersonSelector();
    }

    function updateFichaStatusBadge(isCompleted) {
        if (isCompleted) {
            fichaStatusBadge.textContent = 'Autocompletado';
            fichaStatusBadge.className = 'inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200/80';
        } else {
            fichaStatusBadge.textContent = 'Pendiente';
            fichaStatusBadge.className = 'inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200/80';
        }
    }

    [fieldNombreInscrito, fieldNacimiento, fieldFallecimiento, fieldEdadInscrita, fieldDedicatoria].forEach(el => {
        el.addEventListener('input', () => {
            saveCurrentPersonFromInputs();
            renderPersonSelector();
        });
    });

    personSelector.addEventListener('change', (e) => {
        saveCurrentPersonFromInputs();
        loadPersonIntoInputs(Number(e.target.value));
    });

    btnAddPerson.addEventListener('click', () => {
        saveCurrentPersonFromInputs();
        peopleRecords.push({ nombre: '', nacimiento: '', fallecimiento: '', edad: '', dedicatoria: '' });
        loadPersonIntoInputs(peopleRecords.length - 1);
        showToast(`Persona ${peopleRecords.length} añadida a la ficha.`, 'info');
    });

    btnRemovePerson.addEventListener('click', () => {
        if (peopleRecords.length <= 1) return;
        peopleRecords.splice(activePersonIndex, 1);
        const nextIdx = Math.max(0, activePersonIndex - 1);
        loadPersonIntoInputs(nextIdx);
        showToast('Persona eliminada de la ficha.', 'info');
    });

    // Extractor inteligente local (funciona offline y como respaldo inmediato)
    function parseTextToFichaLocal(rawText) {
        const text = (rawText || '').trim();
        if (!text) return;

        const codeMatch = text.match(/#FILA\/[^\s\n]+(?:\s+#P[^\s\n]+)?(?:\s+G\d+)?/i);
        if (codeMatch) {
            fieldCodigoOriginal.value = codeMatch[0].trim();
        }

        const serialMatch = text.match(/(?:Serial|N[°ºo]\.?|Ref\.?)\s*:?\s*([A-Z0-9\-\/]+)/i);
        if (serialMatch) {
            fieldSerialManual.value = serialMatch[1].trim();
        }

        let nacimiento = '';
        let fallecimiento = '';
        const nacMatch = text.match(/(?:N\.|Nac\.?|Nacimiento|\*)\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4})/i);
        const falMatch = text.match(/(?:F\.|Fall\.?|Fallecimiento|\+|†|Q\.E\.P\.D\.?)\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4})/i);

        if (nacMatch) nacimiento = nacMatch[1];
        if (falMatch) fallecimiento = falMatch[1];

        if (!nacimiento && !fallecimiento) {
            const rangeMatch = text.match(/\b(1[89]\d{2}|20[0-2]\d)\s*[-–—]\s*(1[89]\d{2}|20[0-2]\d)\b/);
            if (rangeMatch) {
                nacimiento = rangeMatch[1];
                fallecimiento = rangeMatch[2];
            }
        }

        let edad = '';
        const edadMatch = text.match(/(?:Edad\s*:?\s*)?(\d{1,3}\s*a[ñn]os)/i);
        if (edadMatch) edad = edadMatch[1];

        let dedicatoria = '';
        const dedMatch = text.match(/(Recuerdo de[^\n]+|En memoria de[^\n]+|Descansa en paz[^\n]*|Siempre te recordaremos[^\n]*|Con amor[^\n]*)/i);
        if (dedMatch) dedicatoria = dedMatch[1].trim();

        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        let nombre = '';
        for (const line of lines) {
            if (/^#FILA/i.test(line)) continue;
            if (/^(Serial|N[°º]|Nac|Fall|Edad|Recuerdo|En memoria|Q\.E\.P\.D)/i.test(line)) continue;
            if (/^\d{1,4}[\-\/\.]/.test(line)) continue;
            if (line.length >= 4 && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(line)) {
                nombre = line;
                break;
            }
        }

        peopleRecords = [{
            nombre,
            nacimiento,
            fallecimiento,
            edad,
            dedicatoria
        }];
        loadPersonIntoInputs(0);
        fieldEstado.value = 'Legible';
        fieldInscripcionCompleta.value = text;
        updateFichaStatusBadge(true);
    }

    // Extractor estructurado con IA Multimodal Gemini
    async function autoFillFichaWithGemini(rawText) {
        const text = (rawText || '').trim();
        if (!text) return;

        parseTextToFichaLocal(text);

        try {
            const apiKey = getGeminiApiKey();
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
            const payload = {
                contents: [{
                    role: "user",
                    parts: [{
                        text: `Analiza la siguiente transcripción de una lápida, placa o ficha y extrae los datos estructurados para llenar un formulario de Excel:\n\n${text}`
                    }]
                }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            codigoOriginal: { type: "STRING" },
                            serialManual: { type: "STRING" },
                            estado: { type: "STRING" },
                            personas: {
                                type: "ARRAY",
                                items: {
                                    type: "OBJECT",
                                    properties: {
                                        nombre: { type: "STRING" },
                                        nacimiento: { type: "STRING" },
                                        fallecimiento: { type: "STRING" },
                                        edad: { type: "STRING" },
                                        dedicatoria: { type: "STRING" }
                                    },
                                    required: ["nombre", "nacimiento", "fallecimiento", "edad", "dedicatoria"]
                                }
                            },
                            inscripcionCompleta: { type: "STRING" }
                        },
                        required: ["codigoOriginal", "serialManual", "estado", "personas", "inscripcionCompleta"]
                    }
                }
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) return;
            const result = await response.json();
            const jsonStr = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!jsonStr) return;

            const parsed = JSON.parse(jsonStr);
            if (parsed.codigoOriginal && parsed.codigoOriginal.trim()) {
                fieldCodigoOriginal.value = parsed.codigoOriginal.trim();
            }
            if (parsed.serialManual) {
                fieldSerialManual.value = parsed.serialManual.trim();
            }
            if (Array.isArray(parsed.personas) && parsed.personas.length > 0) {
                peopleRecords = parsed.personas.map(p => ({
                    nombre: p.nombre || '',
                    nacimiento: p.nacimiento || '',
                    fallecimiento: p.fallecimiento || '',
                    edad: p.edad || '',
                    dedicatoria: p.dedicatoria || ''
                }));
                loadPersonIntoInputs(0);
            }
            if (parsed.inscripcionCompleta) {
                fieldInscripcionCompleta.value = parsed.inscripcionCompleta.trim();
            }
            updateFichaStatusBadge(true);
        } catch (e) {
            // Respaldo local ya aplicado
        }
    }

    btnAutoFillFromText.addEventListener('click', async () => {
        const txt = extractedText.value.trim();
        if (!txt) {
            showToast('No hay texto transcrito para rellenar la ficha.', 'info');
            return;
        }
        await autoFillFichaWithGemini(txt);
        saveActiveLapidaState();
        renderBatchTray();
        showToast('Ficha rellenada desde el texto actual.', 'success');
    });

    btnCopyExcelRow.addEventListener('click', () => {
        saveActiveLapidaState();
        const codigo = fieldCodigoOriginal.value.trim() || '#FILA/0 #P0 G0';
        const serial = fieldSerialManual.value.trim();
        const estado = fieldEstado.value;
        const inscripcion = (fieldInscripcionCompleta.value || '').replace(/\s+/g, ' ').trim();

        const rows = peopleRecords.map((p, idx) => [
            codigo,
            serial,
            estado,
            `Persona ${idx + 1}`,
            p.nombre,
            p.nacimiento,
            p.fallecimiento,
            p.edad,
            p.dedicatoria,
            inscripcion
        ].join('\t'));

        const textToCopy = rows.join('\n');
        const tempTa = document.createElement('textarea');
        tempTa.value = textToCopy;
        document.body.appendChild(tempTa);
        tempTa.select();
        try {
            document.execCommand('copy');
            showToast('Fila(s) copiadas para pegar directo en Excel (Ctrl+V).', 'success');
        } catch (err) {
            showToast('No se pudo copiar la fila.', 'error');
        }
        document.body.removeChild(tempTa);
    });

    // --- GESTIÓN DE IMAGEN DE LA BÓVEDA (PARA HOJA 2 DEL PDF INDIVIDUAL) ---
    bovedaFileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            bovedaImageSource = ev.target.result;
            bovedaImagePreview.src = bovedaImageSource;
            bovedaPreviewBox.classList.remove('hidden');
            btnClearBoveda.classList.remove('hidden');
            bovedaUploadLabel.textContent = 'Cambiar Foto Bóveda';
            showToast('Imagen de la bóveda cargada para la hoja 2 del PDF.', 'success');
        };
        reader.readAsDataURL(file);
    });

    btnClearBoveda.addEventListener('click', () => {
        bovedaImageSource = null;
        bovedaFileInput.value = '';
        bovedaImagePreview.src = '';
        bovedaPreviewBox.classList.add('hidden');
        btnClearBoveda.classList.add('hidden');
        bovedaUploadLabel.textContent = 'Subir Foto Bóveda';
    });

    function normalizeImageForPdf(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || 800;
                canvas.height = img.naturalHeight || 600;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve({
                    pngDataUrl: canvas.toDataURL('image/png'),
                    width: canvas.width,
                    height: canvas.height
                });
            };
            img.onerror = reject;
            img.src = dataUrl;
        });
    }

    // --- GENERACIÓN DE PDF INDIVIDUAL DE 2 HOJAS ---
    btnExportPdf.addEventListener('click', async () => {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            showToast('La librería PDF aún está cargando, intenta en un segundo.', 'error');
            return;
        }

        saveActiveLapidaState();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 14;
        const contentW = pageW - margin * 2;

        const activeItem = (activeLapidaIndex >= 0 && lapidasBatch[activeLapidaIndex])
            ? lapidasBatch[activeLapidaIndex]
            : {
                dataUrl: currentImageSource,
                ficha: {
                    codigoOriginal: fieldCodigoOriginal.value.trim() || '#FILA/0 #P0 G0',
                    serialManual: fieldSerialManual.value.trim(),
                    estado: fieldEstado.value,
                    peopleRecords,
                    inscripcionCompleta: fieldInscripcionCompleta.value.trim() || extractedText.value.trim()
                }
            };

        const f = activeItem.ficha || createEmptyFichaState();
        const codigoActual = f.codigoOriginal || '#FILA/0 #P0 G0';
        const lapidaLabel = activeLapidaIndex >= 0 ? `Lápida #${activeLapidaIndex + 1}` : 'Ficha Individual';

        try {
            // HOJA 1: PLACA INDIVIDUAL + DATOS
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, pageW, 24, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text(`FICHA INDIVIDUAL — ${lapidaLabel.toUpperCase()}`, margin, 11);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`Código: ${codigoActual}   |   Serial: ${f.serialManual || 'N/A'}   |   Estado: ${f.estado || 'Legible'}`, margin, 18);

            let cursorY = 30;

            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('1. FOTOGRAFÍA DE LA PLACA', margin, cursorY);
            cursorY += 3;

            const placaBoxH = 74;
            doc.setDrawColor(203, 213, 225);
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(margin, cursorY, contentW, placaBoxH, 2, 2, 'FD');

            if (activeItem.dataUrl) {
                const placaNorm = await normalizeImageForPdf(activeItem.dataUrl);
                const ratio = Math.min((contentW - 6) / placaNorm.width, (placaBoxH - 6) / placaNorm.height);
                const drawW = placaNorm.width * ratio;
                const drawH = placaNorm.height * ratio;
                const offsetX = margin + (contentW - drawW) / 2;
                const offsetY = cursorY + (placaBoxH - drawH) / 2;
                doc.addImage(placaNorm.pngDataUrl, 'PNG', offsetX, offsetY, drawW, drawH);
            } else {
                doc.setTextColor(148, 163, 184);
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(10);
                doc.text('Sin imagen de placa cargada', pageW / 2, cursorY + placaBoxH / 2, { align: 'center' });
            }

            cursorY += placaBoxH + 8;

            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('2. INFORMACIÓN TRANSCRITA Y DATOS PARA EXCEL', margin, cursorY);
            cursorY += 4;

            doc.setFillColor(241, 245, 249);
            doc.roundedRect(margin, cursorY, contentW, 14, 2, 2, 'F');
            doc.setFontSize(9);
            doc.setTextColor(51, 65, 85);
            doc.setFont('helvetica', 'bold');
            doc.text('Código original:', margin + 3, cursorY + 5.5);
            doc.setFont('helvetica', 'normal');
            doc.text(codigoActual, margin + 32, cursorY + 5.5);

            doc.setFont('helvetica', 'bold');
            doc.text('Serial manual:', margin + 3, cursorY + 11);
            doc.setFont('helvetica', 'normal');
            doc.text(f.serialManual || '—', margin + 32, cursorY + 11);

            doc.setFont('helvetica', 'bold');
            doc.text('Estado:', margin + 105, cursorY + 5.5);
            doc.setFont('helvetica', 'normal');
            doc.text(f.estado || 'Legible', margin + 120, cursorY + 5.5);
            cursorY += 18;

            const personasList = f.peopleRecords || [];
            personasList.forEach((p, pIdx) => {
                if (cursorY > pageH - 55) return;
                doc.setDrawColor(203, 213, 225);
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(margin, cursorY, contentW, 29, 2, 2, 'FD');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9.5);
                doc.setTextColor(6, 95, 70);
                doc.text(`Persona ${pIdx + 1}: ${p.nombre || '(Sin nombre registrado)'}`, margin + 3, cursorY + 6);

                doc.setFontSize(8.8);
                doc.setTextColor(51, 65, 85);
                doc.setFont('helvetica', 'bold');
                doc.text('Nacimiento:', margin + 3, cursorY + 12.5);
                doc.setFont('helvetica', 'normal');
                doc.text(p.nacimiento || '—', margin + 24, cursorY + 12.5);

                doc.setFont('helvetica', 'bold');
                doc.text('Fallecimiento:', margin + 65, cursorY + 12.5);
                doc.setFont('helvetica', 'normal');
                doc.text(p.fallecimiento || '—', margin + 89, cursorY + 12.5);

                doc.setFont('helvetica', 'bold');
                doc.text('Edad:', margin + 132, cursorY + 12.5);
                doc.setFont('helvetica', 'normal');
                doc.text(p.edad || '—', margin + 143, cursorY + 12.5);

                doc.setFont('helvetica', 'bold');
                doc.text('Dedicatoria:', margin + 3, cursorY + 19);
                doc.setFont('helvetica', 'normal');
                const dedLines = doc.splitTextToSize(p.dedicatoria || '—', contentW - 28);
                doc.text(dedLines.slice(0, 2), margin + 24, cursorY + 19);

                cursorY += 32;
            });

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.setTextColor(30, 41, 59);
            doc.text('Inscripción completa:', margin, cursorY + 2);
            cursorY += 5;

            const inscText = (f.inscripcionCompleta || f.extractedText || '').trim() || 'Sin texto transcrito.';
            const inscLines = doc.splitTextToSize(inscText, contentW - 6);
            const boxHeight = Math.min(pageH - cursorY - 16, Math.max(24, inscLines.length * 4.5 + 8));

            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(203, 213, 225);
            doc.roundedRect(margin, cursorY, contentW, boxHeight, 2, 2, 'FD');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(30, 41, 59);
            doc.text(inscLines, margin + 3, cursorY + 6);

            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(`Página 1 de 2 — ${lapidaLabel} (${codigoActual})`, margin, pageH - 8);

            // HOJA 2: FOTOGRAFÍA DE LA BÓVEDA
            doc.addPage();
            const titular = personasList[0]?.nombre || 'Sin titular registrado';

            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, pageW, 24, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('REGISTRO FOTOGRÁFICO DE LA BÓVEDA', margin, 11);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`Ubicación: ${codigoActual}   |   Titular: ${titular}`, margin, 18);

            const bovedaTop = 32;
            const bovedaBoxH = pageH - bovedaTop - 18;
            doc.setDrawColor(203, 213, 225);
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(margin, bovedaTop, contentW, bovedaBoxH, 3, 3, 'FD');

            if (bovedaImageSource) {
                const bovedaNorm = await normalizeImageForPdf(bovedaImageSource);
                const ratio2 = Math.min((contentW - 8) / bovedaNorm.width, (bovedaBoxH - 8) / bovedaNorm.height);
                const drawW2 = bovedaNorm.width * ratio2;
                const drawH2 = bovedaNorm.height * ratio2;
                const offsetX2 = margin + (contentW - drawW2) / 2;
                const offsetY2 = bovedaTop + (bovedaBoxH - drawH2) / 2;
                doc.addImage(bovedaNorm.pngDataUrl, 'PNG', offsetX2, offsetY2, drawW2, drawH2);
            } else {
                doc.setTextColor(100, 116, 139);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.text('No se adjuntó fotografía de la bóveda.', pageW / 2, bovedaTop + bovedaBoxH / 2 - 4, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9.5);
                doc.text('Usa el botón "Subir Foto Bóveda" en la ficha antes de generar el PDF.', pageW / 2, bovedaTop + bovedaBoxH / 2 + 4, { align: 'center' });
            }

            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(`Página 2 de 2 — Vista General de la Bóveda (${codigoActual})`, margin, pageH - 8);

            const safeCode = codigoActual.replace(/[^a-zA-Z0-9_-]/g, '_');
            const lapidaNumSuffix = activeLapidaIndex >= 0 ? `_lapida${activeLapidaIndex + 1}` : '';
            doc.save(`ficha_individual_${safeCode || 'registro'}${lapidaNumSuffix}.pdf`);
            showToast(`PDF individual descargado (${lapidaLabel} + Bóveda).`, 'success');
        } catch (pdfErr) {
            console.error('Error al generar PDF:', pdfErr);
            showToast('Hubo un problema al generar el archivo PDF.', 'error');
        }
    });

    ['dragleave', 'drop'].forEach(evtName => {
        dropZone.addEventListener(evtName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('border-brand-500', 'bg-brand-50/40');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) {
            showToast('Por favor suelta archivos de imagen válidos.', 'error');
            return;
        }
        addFilesToBatch(e.dataTransfer.files, true);
    });

    // --- GESTIÓN DE CÁMARA EN VIVO ---
    function stopCameraStream() {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }
        cameraFeed.srcObject = null;
        cameraContainer.classList.add('hidden');
    }

    btnStartCamera.addEventListener('click', async () => {
        try {
            stopCameraStream();
            mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            cameraFeed.srcObject = mediaStream;
            emptyState.classList.add('hidden');
            previewContainer.classList.add('hidden');
            imageAdjustmentsBar.classList.add('hidden');
            cameraContainer.classList.remove('hidden');
        } catch (err) {
            console.error('Error al acceder a la cámara:', err);
            showToast('No se pudo acceder a la cámara. Verifica los permisos.', 'error');
        }
    });

    btnStopCamera.addEventListener('click', () => {
        stopCameraStream();
        if (currentImageSource) {
            previewContainer.classList.remove('hidden');
            imageAdjustmentsBar.classList.remove('hidden');
        } else {
            emptyState.classList.remove('hidden');
        }
    });

    btnCapturePhoto.addEventListener('click', () => {
        if (!cameraFeed.videoWidth) return;
        helperCanvas.width = cameraFeed.videoWidth;
        helperCanvas.height = cameraFeed.videoHeight;
        const ctx = helperCanvas.getContext('2d');
        ctx.drawImage(cameraFeed, 0, 0, helperCanvas.width, helperCanvas.height);
        const capturedDataUrl = helperCanvas.toDataURL('image/png');
        loadImageIntoPreview(capturedDataUrl, true);
        showToast('Foto capturada y escaneando...', 'success');
    });

    // --- GENERADOR DE IMAGEN DE EJEMPLO EN TIPOGRAFÍA CURSIVA ---
    btnLoadSample.addEventListener('click', async () => {
        stopSpeech();
        languageSelect.value = 'spa';

        try {
            await document.fonts.ready;
        } catch (e) {}

        const width = 920;
        const height = 620;
        helperCanvas.width = width;
        helperCanvas.height = height;
        const ctx = helperCanvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#fdfaf3');
        gradient.addColorStop(1, '#f4ede0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = 1;
        for (let lineY = 165; lineY <= 530; lineY += 58) {
            ctx.beginPath();
            ctx.moveTo(65, lineY);
            ctx.lineTo(width - 65, lineY);
            ctx.stroke();
        }

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.strokeRect(28, 28, width - 56, height - 56);

        ctx.fillStyle = '#1e293b';
        ctx.font = "600 44px 'Dancing Script', cursive";
        ctx.fillText('Crónicas del Tiempo y la Memoria', 68, 98);

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(68, 114);
        ctx.lineTo(540, 114);
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = "600 34px 'Dancing Script', cursive";
        const cursiveLines = [
            'En las antiguas bibliotecas de los Andes, cada manuscrito',
            'guardaba secretos escritos con tinta ferrogálica y pluma.',
            'La caligrafía inclinada requería paciencia, pulso firme',
            'y un profundo amor por las palabras que perduran.',
            'Hoy, la inteligencia artificial permite descifrar cada trazo',
            'con absoluta claridad y devolverle su voz a la historia.'
        ];

        let y = 162;
        cursiveLines.forEach(line => {
            ctx.fillText(line, 68, y);
            y += 58;
        });

        const sampleDataUrl = helperCanvas.toDataURL('image/png');
        loadImageIntoPreview(sampleDataUrl, true);
        showToast('Ejemplo en tipografía cursiva generado y escaneando...', 'info');
    });

    // --- GENERADOR DE IMAGEN DE EJEMPLO CON ETIQUETAS TÉCNICAS (#FILA/0 #P0 G0) ---
    btnLoadTechSample.addEventListener('click', () => {
        stopSpeech();
        languageSelect.value = 'spa';

        const width = 860;
        const height = 480;
        helperCanvas.width = width;
        helperCanvas.height = height;
        const ctx = helperCanvas.getContext('2d');

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 4;
        ctx.strokeRect(24, 24, width - 48, height - 48);

        ctx.fillStyle = '#0f172a';
        ctx.font = "700 32px 'Inter', monospace";
        ctx.fillText('#FILA/0 #P0 G0', 54, 82);

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(54, 102);
        ctx.lineTo(width - 54, 102);
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = "700 38px 'Inter', sans-serif";
        ctx.fillText('MARÍA ELENA MENDOZA DE ROJAS', 54, 165);

        ctx.fillStyle = '#334155';
        ctx.font = "600 26px 'Inter', sans-serif";
        ctx.fillText('Nac. 14/05/1942  —  Fall. 22/09/2021', 54, 222);
        ctx.fillText('Edad: 79 años', 54, 268);

        ctx.fillStyle = '#475569';
        ctx.font = "italic 600 28px 'Dancing Script', cursive";
        ctx.fillText('Recuerdo de sus hijos y nietos que nunca te olvidan.', 54, 338);
        ctx.fillText('Descansa en paz.', 54, 382);

        const techDataUrl = helperCanvas.toDataURL('image/png');
        loadImageIntoPreview(techDataUrl, true);
        showToast('Ficha de ejemplo #FILA/0 #P0 G0 generada y escaneando...', 'info');
    });

    // --- PIPELINE DE PREPROCESAMIENTO DE IMAGEN EN CANVAS ---
    function buildProcessedCanvasDataUrl(applyAdaptivePreprocess = false) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const isRotated = (imgRotation % 180 !== 0);
                const targetW = isRotated ? img.naturalHeight : img.naturalWidth;
                const targetH = isRotated ? img.naturalWidth : img.naturalHeight;

                const scaleFactor = targetW < 1000 ? 1.5 : 1;
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(targetW * scaleFactor);
                canvas.height = Math.round(targetH * scaleFactor);
                const ctx = canvas.getContext('2d');

                ctx.save();
                ctx.filter = `brightness(${imgBrightness}%) contrast(${imgContrast}%)`;
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate((imgRotation * Math.PI) / 180);
                ctx.drawImage(
                    img,
                    (-img.naturalWidth * scaleFactor) / 2,
                    (-img.naturalHeight * scaleFactor) / 2,
                    img.naturalWidth * scaleFactor,
                    img.naturalHeight * scaleFactor
                );
                ctx.restore();

                if (applyAdaptivePreprocess) {
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;
                    const w = canvas.width;
                    const h = canvas.height;

                    const gray = new Uint8ClampedArray(w * h);
                    let sum = 0;
                    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
                        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                        gray[p] = lum;
                        sum += lum;
                    }
                    const meanLum = sum / (w * h);

                    const sharpened = new Uint8ClampedArray(w * h);
                    for (let y = 1; y < h - 1; y++) {
                        for (let x = 1; x < w - 1; x++) {
                            const idx = y * w + x;
                            const val =
                                5 * gray[idx] -
                                gray[idx - 1] -
                                gray[idx + 1] -
                                gray[idx - w] -
                                gray[idx + w];
                            sharpened[idx] = Math.max(0, Math.min(255, val));
                        }
                    }

                    const threshold = meanLum * 0.88;
                    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
                        const v = sharpened[p] || gray[p];
                        let enhanced;
                        if (v < threshold - 25) {
                            enhanced = 0;
                        } else if (v > threshold + 20) {
                            enhanced = 255;
                        } else {
                            enhanced = Math.round(((v - (threshold - 25)) / 45) * 255);
                        }
                        data[i] = enhanced;
                        data[i + 1] = enhanced;
                        data[i + 2] = enhanced;
                    }
                    ctx.putImageData(imageData, 0, 0);
                }

                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = reject;
            img.src = currentImageSource;
        });
    }

    // --- MOTOR 1: IA MULTIMODAL CON GEMINI API ---
    async function recognizeWithGeminiAI(processedDataUrl, langCode) {
        const langMap = {
            spa: 'español',
            eng: 'inglés',
            fra: 'francés',
            por: 'portugués'
        };
        const targetLanguage = langMap[langCode] || 'español';
        const base64Data = processedDataUrl.split(',')[1];

        const apiKey = getGeminiApiKey();
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
        const systemPrompt = `Eres un experto paleógrafo y motor OCR multimodal de altísima precisión especializado en tipografía cursiva, caligrafía inclinada, letra manuscrita y códigos técnicos/alfanuméricos.
Tu única tarea es transcribir fielmente todo el texto visible en la imagen en ${targetLanguage}.
Reglas estrictas:
- Devuelve ÚNICAMENTE el texto transcrito, respetando párrafos, signos de puntuación, acentos y símbolos exactos (#, /, -, _, números y ceros como 0 vs O).
- Conserva códigos técnicos o etiquetas exactamente como aparecen (por ejemplo: #FILA/0 #P0 G0) sin autocorregirlos ni alterarlos.
- No agregues introducciones, comentarios, comillas envolventes ni explicaciones.
- Si una palabra en cursiva está parcialmente ligada, infiere con precisión contextual su ortografía exacta.
- Si no hay ningún texto legible en la imagen, responde exactamente: [SIN_TEXTO]`;

        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: `Transcribe con máxima exactitud el texto (incluyendo letra cursiva o manuscrita) de esta imagen en ${targetLanguage}:` },
                        {
                            inlineData: {
                                mimeType: "image/png",
                                data: base64Data
                            }
                        }
                    ]
                }
            ],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            }
        };

        const delays = [1000, 2000, 4000];
        for (let attempt = 0; attempt <= delays.length; attempt++) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const result = await response.json();
                const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                return text.trim() === '[SIN_TEXTO]' ? '' : text.trim();
            } catch (err) {
                if (attempt === delays.length) throw err;
                await new Promise(res => setTimeout(res, delays[attempt]));
            }
        }
        return '';
    }

    // --- MOTOR 2: OCR CLÁSICO CON TESSERACT.JS OPTIMIZADO ---
    async function recognizeWithTesseract(processedDataUrl, langCode) {
        const worker = await Tesseract.createWorker(langCode, 1, {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    const pct = Math.min(98, Math.round(25 + m.progress * 73));
                    progressBar.style.width = `${pct}%`;
                    progressPercent.textContent = `${pct}%`;
                    statusText.lastChild.textContent = ' Analizando trazos cursivos...';
                } else if (m.status === 'loading language traineddata') {
                    statusText.lastChild.textContent = ' Cargando diccionario de idioma...';
                    progressBar.style.width = '20%';
                    progressPercent.textContent = '20%';
                }
            }
        });

        await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
            preserve_interword_spaces: '1'
        });

        const { data: { text } } = await worker.recognize(processedDataUrl);
        await worker.terminate();
        return text.trim();
    }

    // --- ORQUESTADOR DE RECONOCIMIENTO ÓPTICO ---
    async function runOCRProcess() {
        if (!currentImageSource || isScanning) return;

        isScanning = true;
        stopSpeech();
        const selectedLang = languageSelect.value;

        btnScanNow.disabled = true;
        scannerLaser.classList.remove('hidden');
        progressWrapper.classList.remove('hidden');
        progressBar.style.width = '12%';
        progressPercent.textContent = '12%';
        statusText.lastChild.textContent = ' Aplicando ajustes de imagen...';
        liveBadge.textContent = activeEngine === 'gemini'
            ? 'IA Multimodal analizando caligrafía...'
            : 'OCR Clásico procesando imagen...';

        try {
            let finalExtracted = '';

            if (activeEngine === 'gemini') {
                const userAdjustedDataUrl = await buildProcessedCanvasDataUrl(false);
                progressBar.style.width = '45%';
                progressPercent.textContent = '45%';
                statusText.lastChild.textContent = ' Leyendo cursiva con IA Multimodal...';

                try {
                    finalExtracted = await recognizeWithGeminiAI(userAdjustedDataUrl, selectedLang);
                    progressBar.style.width = '100%';
                    progressPercent.textContent = '100%';
                } catch (aiErr) {
                    statusText.lastChild.textContent = ' Cambiando a OCR Clásico adaptativo...';
                    const adaptiveDataUrl = await buildProcessedCanvasDataUrl(true);
                    finalExtracted = await recognizeWithTesseract(adaptiveDataUrl, selectedLang);
                }
            } else {
                statusText.lastChild.textContent = ' Aplicando filtro adaptativo para cursiva...';
                const adaptiveDataUrl = await buildProcessedCanvasDataUrl(true);
                progressBar.style.width = '25%';
                progressPercent.textContent = '25%';
                finalExtracted = await recognizeWithTesseract(adaptiveDataUrl, selectedLang);
                progressBar.style.width = '100%';
                progressPercent.textContent = '100%';
            }

            if (finalExtracted) {
                extractedText.value = finalExtracted;
                updateWordCount();
                await autoFillFichaWithGemini(finalExtracted);
                saveActiveLapidaState();
                renderBatchTray();
                showToast('¡Texto transcrito y ficha rellenada automáticamente!', 'success');
                liveBadge.textContent = 'Transcripción y Ficha completadas';
            } else {
                extractedText.value = '';
                updateWordCount();
                showToast('No se detectó texto legible. Prueba ajustar brillo/contraste.', 'error');
                liveBadge.textContent = 'Sin texto detectado';
            }

        } catch (error) {
            console.error('Error en el proceso OCR:', error);
            showToast('Ocurrió un error al procesar la imagen.', 'error');
            liveBadge.textContent = 'Error en el escaneo';
        } finally {
            isScanning = false;
            btnScanNow.disabled = false;
            scannerLaser.classList.add('hidden');
            setTimeout(() => {
                progressWrapper.classList.add('hidden');
            }, 900);
        }
    }

    btnScanNow.addEventListener('click', runOCRProcess);

    languageSelect.addEventListener('change', () => {
        stopSpeech();
        if (currentImageSource && !isScanning) {
            runOCRProcess();
        }
    });

    // --- LECTURA EN VOZ ALTA (TEXT-TO-SPEECH) ---
    function updateSpeechUI(state) {
        if (state === 'playing') {
            iconPlay.classList.add('hidden');
            iconPause.classList.remove('hidden');
            speakLabel.textContent = 'Pausar';
            btnStopSpeech.classList.remove('hidden');
        } else if (state === 'paused') {
            iconPlay.classList.remove('hidden');
            iconPause.classList.add('hidden');
            speakLabel.textContent = 'Reanudar';
            btnStopSpeech.classList.remove('hidden');
        } else {
            iconPlay.classList.remove('hidden');
            iconPause.classList.add('hidden');
            speakLabel.textContent = 'Escuchar';
            btnStopSpeech.classList.add('hidden');
        }
    }

    function stopSpeech() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        isSpeaking = false;
        isPaused = false;
        updateSpeechUI('stopped');
    }

    btnSpeakToggle.addEventListener('click', () => {
        if (!('speechSynthesis' in window)) {
            showToast('Tu navegador no soporta lectura en voz alta.', 'error');
            return;
        }

        const textToRead = extractedText.value.trim();
        if (!textToRead) {
            showToast('No hay texto para leer. Escanea o escribe algo primero.', 'info');
            return;
        }

        if (isSpeaking && !isPaused) {
            window.speechSynthesis.pause();
            isPaused = true;
            updateSpeechUI('paused');
            return;
        }

        if (isSpeaking && isPaused) {
            window.speechSynthesis.resume();
            isPaused = false;
            updateSpeechUI('playing');
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToRead);
        const selectedOption = languageSelect.options[languageSelect.selectedIndex];
        utterance.lang = selectedOption.getAttribute('data-tts') || 'es-ES';
        utterance.rate = 1.0;

        utterance.onstart = () => {
            isSpeaking = true;
            isPaused = false;
            updateSpeechUI('playing');
        };

        utterance.onend = () => {
            isSpeaking = false;
            isPaused = false;
            updateSpeechUI('stopped');
        };

        utterance.onerror = () => {
            isSpeaking = false;
            isPaused = false;
            updateSpeechUI('stopped');
        };

        window.speechSynthesis.speak(utterance);
    });

    btnStopSpeech.addEventListener('click', stopSpeech);

    // --- COPIAR Y DESCARGAR TEXTO ---
    btnCopy.addEventListener('click', () => {
        const text = extractedText.value;
        if (!text.trim()) {
            showToast('No hay texto para copiar.', 'info');
            return;
        }

        extractedText.select();
        extractedText.setSelectionRange(0, 99999);
        try {
            document.execCommand('copy');
            copyLabel.textContent = '¡Copiado!';
            showToast('Texto copiado al portapapeles.', 'success');
            setTimeout(() => {
                copyLabel.textContent = 'Copiar';
            }, 2000);
        } catch (err) {
            showToast('No se pudo copiar el texto.', 'error');
        }
        window.getSelection().removeAllRanges();
    });

    btnDownload.addEventListener('click', () => {
        const text = extractedText.value.trim();
        if (!text) {
            showToast('No hay texto para descargar.', 'info');
            return;
        }

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lectura_ocr_${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Archivo .TXT descargado.', 'success');
    });

    // --- LIMPIAR TODO ---
    btnClearAll.addEventListener('click', () => {
        stopSpeech();
        stopCameraStream();
        lapidasBatch = [];
        activeLapidaIndex = -1;
        renderBatchTray();
        currentImageSource = null;
        fileInput.value = '';
        imagePreview.src = '';
        extractedText.value = '';
        updateWordCount();

        imgBrightness = 100;
        imgContrast = 100;
        imgRotation = 0;
        brightnessSlider.value = 100;
        contrastSlider.value = 100;
        updatePreviewTransformAndFilters();

        previewContainer.classList.add('hidden');
        imageAdjustmentsBar.classList.add('hidden');
        emptyState.classList.remove('hidden');
        btnScanNow.disabled = true;

        fieldCodigoOriginal.value = '#FILA/0 #P0 G0';
        fieldSerialManual.value = '';
        fieldEstado.value = 'Legible';
        peopleRecords = [{ nombre: '', nacimiento: '', fallecimiento: '', edad: '', dedicatoria: '' }];
        loadPersonIntoInputs(0);
        fieldInscripcionCompleta.value = '';
        updateFichaStatusBadge(false);

        bovedaImageSource = null;
        bovedaFileInput.value = '';
        bovedaImagePreview.src = '';
        bovedaPreviewBox.classList.add('hidden');
        btnClearBoveda.classList.add('hidden');
        bovedaUploadLabel.textContent = 'Subir Foto Bóveda';

        liveBadge.textContent = activeEngine === 'gemini'
            ? 'Motor IA Multimodal Listo (Soporte Cursiva)'
            : 'OCR Clásico con Filtro Adaptativo Listo';
        showToast('Área de trabajo y ficha limpias.', 'info');
    });
});
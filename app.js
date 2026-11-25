/**
 * Lector de Imágenes con OCR Gemini, Tesseract y PaddleOCR
 * - Lectura y relleno de ficha en 1 sola llamada (máxima velocidad)
 * - Escaneo paralelo del lote de hasta 10 lápidas
 * - Detección automática de placas con marca "L" como Bóveda Libre
 * - Exportación a Excel (.CSV) y PDF Individual de 2 Hojas
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

    // Selector de motores OCR
    const btnEngineAI = document.getElementById('btnEngineAI');
    const btnEngineClassic = document.getElementById('btnEngineClassic');
    const btnEngineHandwriting = document.getElementById('btnEngineHandwriting');
    const engineHint = document.getElementById('engineHint');

    const cameraContainer = document.getElementById('cameraContainer');
    const cameraFeed = document.getElementById('cameraFeed');
    const btnStartCamera = document.getElementById('btnStartCamera');
    const btnCapturePhoto = document.getElementById('btnCapturePhoto');
    const btnStopCamera = document.getElementById('btnStopCamera');

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

    const btnSpeakToggle = document.getElementById('btnSpeakToggle');
    const btnStopSpeech = document.getElementById('btnStopSpeech');
    const speakLabel = document.getElementById('speakLabel');
    const iconPlay = document.getElementById('iconPlay');
    const iconPause = document.getElementById('iconPause');

    // Referencias de la Ficha Individual (Datos para Excel)
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
    let activeEngine = 'paddleocr';

    // Worker persistente de Tesseract para evitar recargar diccionario en cada foto
    let cachedTesseractWorker = null;
    let cachedTesseractLang = null;
    const cachedPaddleOcrPromises = new Map();

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

    // Estado estructurado de la Ficha Individual
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
            btnOpenApiKeyModal.className = 'inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-amber-900 bg-amber-100/90 hover:bg-amber-200/80 border border-amber-300 px-3.5 py-2 rounded-xl transition-all active:scale-95 cursor-pointer';
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
        showToast('Clave API personal guardada. Escaneo rápido activado.', 'success');
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
        }, 3500);
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
            isCompleted: fichaStatusBadge.textContent !== 'Pendiente'
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
            const isFreeVault = item.ficha?.estado === 'Libre';
            cell.title = `Lápida ${idx + 1}${isFreeVault ? ' (Libre - L)' : item.ficha?.isCompleted ? ' (Escaneada)' : ' (Pendiente)'}`;

            const img = document.createElement('img');
            img.src = item.dataUrl;
            img.alt = `Lápida ${idx + 1}`;
            img.className = 'w-full h-full object-cover bg-slate-900';
            cell.appendChild(img);

            const numBadge = document.createElement('span');
            numBadge.className = `absolute bottom-0.5 left-0.5 text-[9px] font-extrabold px-1 rounded ${
                isFreeVault ? 'bg-sky-600 text-white' :
                item.ficha?.isCompleted ? 'bg-emerald-600 text-white' : 'bg-slate-900/80 text-white'
            }`;
            numBadge.textContent = isFreeVault ? `${idx + 1}·L` : `${idx + 1}`;
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
        updateFichaStatusBadge(Boolean(f.isCompleted), f.estado);

        renderBatchTray();

        if (autoScan) {
            runOCRProcess();
        }
    }

    function removeLapidaFromBatch(index) {
        if (isScanning) {
            showToast('Espera a que termine el escaneo para quitar una imagen.', 'info');
            return;
        }

        if (index < 0 || index >= lapidasBatch.length) return;

        const removingActive = index === activeLapidaIndex;
        if (activeLapidaIndex >= 0 && !removingActive) {
            saveActiveLapidaState();
        }

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

        if (removingActive) {
            const nextIndex = Math.min(index, lapidasBatch.length - 1);
            activeLapidaIndex = -1;
            selectLapidaFromBatch(nextIndex, false);
        } else {
            if (index < activeLapidaIndex) activeLapidaIndex -= 1;
            renderBatchTray();
        }
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
        if (isScanning) {
            showToast('Espera a que termine el escaneo para añadir imágenes.', 'info');
            return;
        }

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
            showToast(`${filesToLoad.length} lápidas cargadas. Usa "Escanear Todas" para procesarlas en paralelo.`, 'success');
        }
    }

    // --- CARGA DE IMÁGENES ---
    function loadImageIntoPreview(dataUrl, autoScan = false) {
        if (isScanning) {
            showToast('Espera a que termine el escaneo para cambiar la imagen.', 'info');
            return;
        }

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

    // --- ESCANEO PARALELO DE TODAS LAS LÁPIDAS DEL LOTE ---
    btnScanAllBatch.addEventListener('click', async () => {
        if (isScanning || lapidasBatch.length === 0) return;

        const apiKey = activeEngine === 'gemini' ? getGeminiApiKey() : '';
        if (activeEngine === 'gemini' && !apiKey) {
            showToast('Configura primero tu "Clave API Gemini" arriba para escanear el lote.', 'error');
            apiKeyModal.classList.remove('hidden');
            return;
        }

        saveActiveLapidaState();
        isScanning = true;
        btnScanNow.disabled = true;
        btnScanAllBatch.disabled = true;
        scannerLaser.classList.remove('hidden');
        progressWrapper.classList.remove('hidden');

        const total = lapidasBatch.length;
        let completedCount = 0;
        let failedHandwritingCount = 0;
        const selectedLang = languageSelect.value;

        progressBar.style.width = '8%';
        progressPercent.textContent = '8%';
        statusText.lastChild.textContent = ` Escaneando ${total} lápidas...`;

        try {
            // Concurrencia de 2 para evitar bloqueos por límite de peticiones (429) en cuentas gratuitas
            const concurrency = activeEngine === 'gemini' ? 2 : 1;
            let cursor = 0;

            async function workerLoop() {
                while (cursor < total) {
                    const idx = cursor++;
                    const item = lapidasBatch[idx];
                    try {
                        const result = await processSingleLapidaItem(item, selectedLang);
                        item.ficha = result.ficha;
                    } catch (itemErr) {
                        console.warn(`No se pudo completar el OCR de la lápida #${idx + 1}:`, itemErr);
                        if (activeEngine === 'paddleocr') {
                            failedHandwritingCount++;
                            const previousFicha = item.ficha || createEmptyFichaState();
                            item.ficha = { ...previousFicha, extractedText: '', inscripcionCompleta: '', isCompleted: false };
                        } else {
                            const fallbackText = await recognizeWithTesseractFast(item.dataUrl, selectedLang, false).catch(() => '');
                            item.ficha = buildFichaFromLocalText(fallbackText);
                        }
                    }
                    completedCount++;

                    const pct = Math.round((completedCount / total) * 100);
                    progressBar.style.width = `${pct}%`;
                    progressPercent.textContent = `${pct}%`;
                    statusText.lastChild.textContent = ` Completadas ${completedCount} de ${total} lápidas...`;
                    renderBatchTray();
                }
            }

            const workers = Array.from({ length: Math.min(concurrency, total) }, () => workerLoop());
            await Promise.all(workers);

            selectLapidaFromBatch(activeLapidaIndex >= 0 ? activeLapidaIndex : 0, false);
            if (failedHandwritingCount > 0) {
                showToast(`${failedHandwritingCount} imagen(es) no se pudieron leer con OCR local. Revisa la conexión e inténtalo de nuevo.`, 'error');
                liveBadge.textContent = `${total - failedHandwritingCount} de ${total} imágenes leídas localmente`;
            } else {
                showToast(`¡Listo! ${total} lápidas procesadas y rellenadas.`, 'success');
                liveBadge.textContent = `Lote de ${total} lápidas completado`;
            }
        } catch (err) {
            console.error('Error escaneando lote:', err);
            showToast('Ocurrió un error al procesar algunas lápidas del lote.', 'error');
        } finally {
            isScanning = false;
            btnScanNow.disabled = false;
            btnScanAllBatch.disabled = false;
            scannerLaser.classList.add('hidden');
            setTimeout(() => progressWrapper.classList.add('hidden'), 800);
        }
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

    // --- SELECTOR DE MOTORES OCR Y TAMAÑO DE FUENTE ---
    function setEngine(engine) {
        activeEngine = engine;
        const selectedClass = 'engine-tab py-2 px-3 rounded-xl text-xs font-semibold bg-white text-brand-700 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer';
        const idleClass = 'engine-tab py-2 px-3 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer';

        [
            [btnEngineAI, 'gemini'],
            [btnEngineClassic, 'tesseract'],
            [btnEngineHandwriting, 'paddleocr']
        ].forEach(([button, engineName]) => {
            button.className = engine === engineName ? selectedClass : idleClass;
        });

        const readyMessages = {
            gemini: 'Gemini multimodal listo. La imagen se envía a Gemini para su lectura.',
            tesseract: 'OCR clásico local listo.',
            paddleocr: 'OCR español para cursiva listo. La lectura se procesa en este navegador.'
        };
        const helpMessages = {
            gemini: 'Gemini necesita una clave API y recibe la imagen para analizarla.',
            tesseract: 'Procesamiento local; funciona mejor con texto impreso.',
            paddleocr: 'La primera vez descarga el modelo. La imagen se procesa en este navegador y no requiere clave de Gemini.'
        };
        liveBadge.textContent = readyMessages[engine] || readyMessages.paddleocr;
        engineHint.textContent = helpMessages[engine] || helpMessages.paddleocr;
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
    btnEngineHandwriting.addEventListener('click', () => setEngine('paddleocr'));
    setEngine('paddleocr');
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

    function updateFichaStatusBadge(isCompleted, customEstado = null) {
        const currentEstado = customEstado || fieldEstado.value;
        if (isCompleted && currentEstado === 'Libre') {
            fichaStatusBadge.textContent = 'Bóveda Libre (L)';
            fichaStatusBadge.className = 'inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-900 border border-sky-200/80';
        } else if (isCompleted) {
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

    // Parse the watermark separately from the engraved inscription.
    const WATERMARK_TOKEN_PATTERN = /#{0,2}\s*(?:FILA?|GAL|PA)\s*(?:[=/:]\s*)?\d+|#{0,2}\s*[PG]\s*\d+/gi;

    function extractWatermarkCode(rawText) {
        const tokens = [];
        const seen = new Set();
        for (const match of String(rawText || '').matchAll(WATERMARK_TOKEN_PATTERN)) {
            const token = match[0].trim().replace(/\s*([=/:])\s*/g, '$1').replace(/\s+/g, '').toUpperCase();
            if (token && !seen.has(token)) {
                seen.add(token);
                tokens.push(token);
            }
        }

        const hasFila = tokens.some(token => /^#{0,2}FILA?\s*[=/:]?\s*\d+$/i.test(token));
        const hasPositionAndGallery = tokens.some(token => /^#{0,2}P\d+$/i.test(token))
            && tokens.some(token => /^#{0,2}G\d+$/i.test(token));
        return hasFila || hasPositionAndGallery ? tokens.join(' ') : '';
    }

    function removePhotoWatermarkArtifacts(rawText) {
        return String(rawText || '').split(/\r?\n/).map(line => {
            if (/\b(?:Bogot[a\u00e1]|Calle|Carrera|Sur|Norte|Antonio\s+Nari[n\u00f1]o|D\.\s*C\.)/i.test(line)) return '';
            if (/\b\d{1,2}\s+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|apr|aug|dec)\.?\s+\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?/i.test(line)) return '';
            return line.replace(WATERMARK_TOKEN_PATTERN, ' ').trim();
        }).filter(Boolean).join('\n').trim();
    }

    // Ignore the photo watermark, camera address/date, and a niche's numeric label.
    function isFreeVaultMarker(rawText) {
        const body = removePhotoWatermarkArtifacts(rawText)
            .split(/\r?\n/)
            .filter(line => !/^\s*\d{1,5}\s*$/.test(line))
            .join(' ')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^A-Za-z]/g, '')
            .toUpperCase();
        return body === 'L' || body === 'LIBRE';
    }

    // Extractor inteligente local (devuelve objeto estructurado sin tocar el DOM directamente)
    function buildFichaFromLocalText(rawText) {
        const text = (rawText || '').trim();
        const ficha = createEmptyFichaState();
        if (!text) return ficha;

        const watermarkCode = extractWatermarkCode(text);
        if (watermarkCode) ficha.codigoOriginal = watermarkCode;
        const inscriptionText = removePhotoWatermarkArtifacts(text);

        if (isFreeVaultMarker(text)) {
            ficha.estado = 'Libre';
            ficha.peopleRecords = [{ nombre: 'LIBRE (B\u00f3veda disponible)', nacimiento: '', fallecimiento: '', edad: '', dedicatoria: '' }];
            ficha.inscripcionCompleta = inscriptionText || 'L';
            ficha.extractedText = text;
            ficha.isCompleted = true;
            return ficha;
        }

        const serialMatch = inscriptionText.match(/(?:\bSerial\b|\bRef\.?)\s*:?\s*([A-Z0-9\-\/]+)|\bN(?:[\u00b0\u00ba]|o)\.?(?=\s|[:#]|\d)\s*[:#]?\s*([A-Z0-9\-\/]+)|\bN\.(?=\s|[:#]|\d)\s*[:#]?\s*([A-Z0-9\-\/]+)/i);
        if (serialMatch) ficha.serialManual = (serialMatch[1] || serialMatch[2] || serialMatch[3]).trim();

        let nacimiento = '';
        let fallecimiento = '';
        const nacMatch = inscriptionText.match(/(?:N\.|Nac\.?|Nacimiento|\*)\s*:?\s*(\d{1,2}\s*[-\u2013\u2014\/.]\s*[A-Za-z\u00c0-\u024f0-9]+\.?\s*[-\u2013\u2014\/.]\s*\d{2,4}|\d{4})/i);
        const falMatch = inscriptionText.match(/(?:F\.|Fall\.?|Fallecimiento|\+|\u2020|Q\.E\.P\.D\.?)\s*:?\s*(\d{1,2}\s*[-\u2013\u2014\/.]\s*[A-Za-z\u00c0-\u024f0-9]+\.?\s*[-\u2013\u2014\/.]\s*\d{2,4}|\d{4})/i);
        if (nacMatch) nacimiento = nacMatch[1].trim();
        if (falMatch) fallecimiento = falMatch[1].trim();

        if (!nacimiento && !fallecimiento) {
            const rangeMatch = inscriptionText.match(/\b(1[89]\d{2}|20[0-2]\d)\s*[-\u2013\u2014]\s*(1[89]\d{2}|20[0-2]\d)\b/);
            if (rangeMatch) {
                nacimiento = rangeMatch[1];
                fallecimiento = rangeMatch[2];
            }
        }

        if (!nacimiento && !fallecimiento) {
            const dateMatches = inscriptionText.match(/\b\d{1,2}\s*[-\u2013\u2014/.]\s*(?:\d{1,2}|[A-Za-z\u00c0-\u024f]+\.?)\s*[-\u2013\u2014/.]\s*\d{2,4}\b|\b\d{1,2}\s+[A-Za-z\u00c0-\u024f]+\.?\s+\d{2,4}\b|\b\d{4}\b/gi) || [];
            if (dateMatches.length === 2) {
                nacimiento = dateMatches[0].trim();
                fallecimiento = dateMatches[1].trim();
            }
        }

        const edadMatch = inscriptionText.match(/(?:Edad\s*:?\s*)?(\d{1,3}\s*a[\u00f1n]os)/i);
        const dedMatch = inscriptionText.match(/(Recuerdo de[^\n]+|En memoria de[^\n]+|Descansa en paz[^\n]*|Siempre te recordaremos[^\n]*|Con amor[^\n]*)/i);
        const lines = inscriptionText.split('\n').map(line => line.trim()).filter(Boolean);
        const fieldLines = lines.map(line => line
            .replace(/(?:Nacimiento|Nac\.?|Fallecimiento|Fall\.?|Edad)\s*:?\s*/gi, ' ')
            .replace(/[\*+\u2020]/g, ' ')
            .replace(/\b\d{1,2}\s*[-\u2013\u2014/.]\s*(?:\d{1,2}|[A-Za-z\u00c0-\u024f]+\.?)\s*[-\u2013\u2014/.]\s*\d{2,4}\b|\b\d{1,2}\s+[A-Za-z\u00c0-\u024f]+\.?\s+\d{2,4}\b|\b\d{4}\b/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim()).filter(Boolean);
        let nombre = '';
        const nameSkipPattern = /^(Serial\b|Ref\b|Nac\b|Fall\b|Nacimiento\b|Fallecimiento\b|Edad\b|Recuerdo\b|En memoria\b|Descansa en paz\b|Siempre te recordaremos\b|Con amor\b|Padre y abuelo\b)/i;
        for (const line of fieldLines) {
            if (nameSkipPattern.test(line)) continue;
            if (/^[\*+\u2020\d]/.test(line)) continue;
            if (line.length >= 4 && /[A-Za-z\u00c0-\u024f]{3,}/.test(line)) {
                nombre = line;
                break;
            }
        }

        const dedicationLines = fieldLines.filter(line => line !== nombre
            && !/^(?:Serial\b|Ref\b|N[\u00b0\u00ba o]?\s*[:.]?\s*\d|Nac\b|Fall\b|Nacimiento\b|Fallecimiento\b|Edad\b)/i.test(line)
            && !/^\d+$/.test(line)
            && /[A-Za-z\u00c0-\u024f]{3,}/.test(line));
        const dedicatoria = dedicationLines.join(' ').trim() || (dedMatch ? dedMatch[1].trim() : '');
        ficha.peopleRecords = [{
            nombre,
            nacimiento,
            fallecimiento,
            edad: edadMatch ? edadMatch[1] : '',
            dedicatoria
        }];
        ficha.estado = 'Legible';
        ficha.inscripcionCompleta = inscriptionText;
        ficha.extractedText = text;
        ficha.isCompleted = true;
        return ficha;
    }

    function buildFichaFromGeminiObject(parsed, fallbackText) {
        const base = buildFichaFromLocalText(fallbackText);
        if (!parsed || typeof parsed !== 'object') return base;

        if (parsed.codigoOriginal && parsed.codigoOriginal.trim()) {
            base.codigoOriginal = extractWatermarkCode(parsed.codigoOriginal) || parsed.codigoOriginal.trim();
        }
        if (parsed.serialManual) base.serialManual = parsed.serialManual.trim();

        const aiEstado = (parsed.estado || '').trim();
        const firstNombre = Array.isArray(parsed.personas) && parsed.personas[0]
            ? (parsed.personas[0].nombre || '').trim()
            : '';
        if (/^libre$/i.test(aiEstado) || /^l$/i.test(firstNombre) || isFreeVaultMarker(fallbackText)) {
            base.estado = 'Libre';
            base.peopleRecords = [{ nombre: 'LIBRE (B\u00f3veda disponible)', nacimiento: '', fallecimiento: '', edad: '', dedicatoria: '' }];
            const freeText = parsed.inscripcionCompleta || fallbackText || 'L - B\u00f3veda Libre';
            base.inscripcionCompleta = removePhotoWatermarkArtifacts(freeText) || 'L';
            base.isCompleted = true;
            return base;
        }

        if (Array.isArray(parsed.personas) && parsed.personas.length > 0) {
            base.peopleRecords = parsed.personas.map(person => ({
                nombre: person.nombre || '',
                nacimiento: person.nacimiento || '',
                fallecimiento: person.fallecimiento || '',
                edad: person.edad || '',
                dedicatoria: person.dedicatoria || ''
            }));
        }
        if (parsed.inscripcionCompleta) {
            base.inscripcionCompleta = removePhotoWatermarkArtifacts(parsed.inscripcionCompleta) || parsed.inscripcionCompleta.trim();
        }
        base.isCompleted = true;
        return base;
    }

    function applyFichaObjectToDOM(ficha) {
        fieldCodigoOriginal.value = ficha.codigoOriginal || '#FILA/0 #P0 G0';
        fieldSerialManual.value = ficha.serialManual || '';
        fieldEstado.value = ficha.estado || 'Legible';
        peopleRecords = JSON.parse(JSON.stringify(ficha.peopleRecords || [{ nombre: '', nacimiento: '', fallecimiento: '', edad: '', dedicatoria: '' }]));
        loadPersonIntoInputs(0);
        fieldInscripcionCompleta.value = ficha.inscripcionCompleta || '';
        updateFichaStatusBadge(Boolean(ficha.isCompleted), ficha.estado);
    }

    btnAutoFillFromText.addEventListener('click', () => {
        const txt = extractedText.value.trim();
        if (!txt) {
            showToast('No hay texto transcrito para rellenar la ficha.', 'info');
            return;
        }
        const ficha = buildFichaFromLocalText(txt);
        applyFichaObjectToDOM(ficha);
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
            // ================= HOJA 1: PLACA INDIVIDUAL + DATOS =================
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

            // ================= HOJA 2: FOTOGRAFÍA DE LA BÓVEDA =================
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

    // --- PIPELINE RÁPIDO DE OPTIMIZACIÓN DE IMAGEN EN CANVAS ---
    function prepareFastImageDataUrl(imageSrc, options = {}) {
        const {
            brightness = 100,
            contrast = 100,
            rotation = 0,
            maxDimension = 1280,
            applyAdaptivePreprocess = false
        } = options;

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const isRotated = (rotation % 180 !== 0);
                const rawW = isRotated ? img.naturalHeight : img.naturalWidth;
                const rawH = isRotated ? img.naturalWidth : img.naturalHeight;

                const longestSide = Math.max(rawW, rawH);
                const scaleFactor = longestSide > maxDimension ? (maxDimension / longestSide) : 1;

                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(rawW * scaleFactor));
                canvas.height = Math.max(1, Math.round(rawH * scaleFactor));
                const ctx = canvas.getContext('2d');

                ctx.save();
                ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate((rotation * Math.PI) / 180);
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
                    const threshold = (sum / (w * h)) * 0.86;
                    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
                        const v = gray[p];
                        const enhanced = v < threshold - 22 ? 0 : v > threshold + 18 ? 255 : Math.round(((v - (threshold - 22)) / 40) * 255);
                        data[i] = enhanced;
                        data[i + 1] = enhanced;
                        data[i + 2] = enhanced;
                    }
                    ctx.putImageData(imageData, 0, 0);
                    resolve({ dataUrl: canvas.toDataURL('image/png'), mimeType: 'image/png' });
                } else {
                    resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.80), mimeType: 'image/jpeg' });
                }
            };
            img.onerror = reject;
            img.src = imageSrc;
        });
    }

    // --- MOTOR 1 ULTRARRÁPIDO: LECTURA + ESTRUCTURACIÓN CON TIMEOUT DE 18S ---
    async function extractAndFillWithGeminiSingleCall(fastImgObj, langCode, apiKey) {
        const langMap = {
            spa: 'español',
            eng: 'inglés',
            fra: 'francés',
            por: 'portugués'
        };
        const targetLanguage = langMap[langCode] || 'español';
        const base64Data = fastImgObj.dataUrl.split(',')[1];

        // Modelos vigentes recomendados por Google AI Studio con respaldo automático
        const candidateModels = ['gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-2.5-pro'];
        const prompt = `Lee el texto visible de la lapida en ${targetLanguage}, incluyendo letra cursiva, fechas, dedicatorias y marcas de agua como #FILA/0 #P0 G0 o ##FIL=2 #GAL=1 #PA=29. Guarda los codigos de marca de agua en codigoOriginal; excluye fecha y direccion superpuestas de inscripcionCompleta. Si, despues de separar marca de agua, fecha y direccion, solo queda una L independiente (aunque haya un numero de lapida), usa estado="Libre". No marques como libre una letra L que aparezca dentro de un nombre o dedicatoria. Devuelve JSON con la transcripcion completa y los campos estructurados para Excel.`;

        const payload = {
            contents: [{
                role: "user",
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: fastImgObj.mimeType,
                            data: base64Data
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        textoTranscrito: { type: "STRING" },
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
                    required: ["textoTranscrito", "codigoOriginal", "serialManual", "estado", "personas", "inscripcionCompleta"]
                }
            }
        };

        let response = null;
        let lastApiError = '';

        for (const modelName of candidateModels) {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 18000);

            try {
                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                if (res.ok) {
                    response = res;
                    break;
                }

                const errData = await res.json().catch(() => ({}));
                lastApiError = errData?.error?.message || `HTTP ${res.status}`;
                // Si el modelo devuelve 404 (no disponible), intenta el siguiente modelo automáticamente
                if (res.status !== 404) {
                    throw new Error(lastApiError);
                }
            } catch (fetchErr) {
                if (fetchErr.name === 'AbortError') {
                    throw new Error('Tiempo de espera agotado (18s). Revisa tu conexión.');
                }
                if (!lastApiError.includes('404') && !fetchErr.message.includes('no longer available')) {
                    throw fetchErr;
                }
            } finally {
                clearTimeout(timeoutId);
            }
        }

        if (!response || !response.ok) {
            throw new Error(lastApiError || 'No se pudo conectar con los modelos de Gemini.');
        }

        const result = await response.json();
        const jsonStr = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(jsonStr);
        const text = (parsed.textoTranscrito || '').trim();
        const ficha = buildFichaFromGeminiObject(parsed, text);
        ficha.extractedText = text;
        return { text, ficha };
    }

    // --- MOTOR 2: OCR CLÁSICO CON TESSERACT.JS CON WORKER EN CACHÉ ---
    async function recognizeWithTesseractFast(processedDataUrl, langCode, updateProgress = true) {
        if (!cachedTesseractWorker || cachedTesseractLang !== langCode) {
            if (cachedTesseractWorker) {
                await cachedTesseractWorker.terminate().catch(() => {});
            }
            cachedTesseractWorker = await Tesseract.createWorker(langCode, 1, {
                logger: (m) => {
                    if (!updateProgress) return;
                    if (m.status === 'recognizing text') {
                        const pct = Math.min(98, Math.round(25 + m.progress * 73));
                        progressBar.style.width = `${pct}%`;
                        progressPercent.textContent = `${pct}%`;
                        statusText.lastChild.textContent = ' Analizando trazos...';
                    }
                }
            });
            await cachedTesseractWorker.setParameters({
                tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                preserve_interword_spaces: '1'
            });
            cachedTesseractLang = langCode;
        }

        const { data: { text } } = await cachedTesseractWorker.recognize(processedDataUrl);
        return text.trim();
    }

    // OCR de escritura a mano en español. El modelo se descarga una vez y procesa la imagen en el navegador.
    async function getPaddleOcrEngine(langCode = 'spa') {
        const langMap = { spa: 'es', eng: 'en', fra: 'fr', por: 'pt' };
        const modelLanguage = langMap[langCode] || 'es';
        if (!cachedPaddleOcrPromises.has(modelLanguage)) {
            const enginePromise = import('https://cdn.jsdelivr.net/npm/@paddleocr/paddleocr-js@0.4.2/+esm')
                .then(({ PaddleOCR }) => {
                    if (!PaddleOCR) throw new Error('No se encontró el motor PaddleOCR.');
                    return PaddleOCR.create({
                        lang: modelLanguage,
                        ocrVersion: 'PP-OCRv6',
                        ortOptions: {
                            backend: 'wasm',
                            wasmPaths: 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/',
                            numThreads: 1,
                            simd: true
                        }
                    });
                })
                .catch((error) => {
                    cachedPaddleOcrPromises.delete(modelLanguage);
                    throw new Error(`No se pudo cargar el OCR local. Revisa tu conexión e inténtalo de nuevo. ${error.message}`);
                });
            cachedPaddleOcrPromises.set(modelLanguage, enginePromise);
        }
        return cachedPaddleOcrPromises.get(modelLanguage);
    }

    async function recognizeWithPaddleOcr(imageDataUrl, langCode = 'spa', updateProgress = false) {
        if (updateProgress) statusText.lastChild.textContent = ' Cargando OCR local para cursiva...';
        const ocr = await getPaddleOcrEngine(langCode);
        const image = await new Promise((resolve, reject) => {
            const element = new Image();
            element.onload = () => resolve(element);
            element.onerror = () => reject(new Error('No se pudo preparar la imagen para el OCR local.'));
            element.src = imageDataUrl;
        });

        if (updateProgress) statusText.lastChild.textContent = ' Leyendo las líneas visibles de la imagen...';
        const [result] = await ocr.predict(image);
        const items = Array.isArray(result?.items) ? result.items : [];
        const lines = items
            .map(item => ({
                text: String(item?.text || '').trim(),
                top: Math.min(...(item?.poly || []).map(point => Array.isArray(point) ? Number(point[1]) : Number(point?.y)).filter(Number.isFinite))
            }))
            .filter(item => item.text)
            .sort((a, b) => (Number.isFinite(a.top) ? a.top : 0) - (Number.isFinite(b.top) ? b.top : 0));

        return lines.map(item => item.text).join('\n').trim();
    }

    // Procesa un elemento individual del lote (usado tanto por individual como por lote paralelo)
    async function processSingleLapidaItem(item, selectedLang) {
        const apiKey = activeEngine === 'gemini' ? getGeminiApiKey() : '';
        if (activeEngine === 'gemini' && apiKey) {
            const fastImg = await prepareFastImageDataUrl(item.dataUrl, {
                brightness: item.brightness ?? 100,
                contrast: item.contrast ?? 100,
                rotation: item.rotation ?? 0,
                maxDimension: 960,
                applyAdaptivePreprocess: false
            });
            return await extractAndFillWithGeminiSingleCall(fastImg, selectedLang, apiKey);
        } else if (activeEngine === 'paddleocr') {
            const handwritingImage = await prepareFastImageDataUrl(item.dataUrl, {
                brightness: item.brightness ?? 100,
                contrast: item.contrast ?? 100,
                rotation: item.rotation ?? 0,
                maxDimension: 2200,
                applyAdaptivePreprocess: false
            });
            const text = await recognizeWithPaddleOcr(handwritingImage.dataUrl, selectedLang);
            return { text, ficha: buildFichaFromLocalText(text) };
        } else {
            const adaptiveImg = await prepareFastImageDataUrl(item.dataUrl, {
                brightness: item.brightness ?? 100,
                contrast: item.contrast ?? 100,
                rotation: item.rotation ?? 0,
                maxDimension: 1280,
                applyAdaptivePreprocess: true
            });
            const text = await recognizeWithTesseractFast(adaptiveImg.dataUrl, selectedLang, false);
            const ficha = buildFichaFromLocalText(text);
            return { text, ficha };
        }
    }

    // --- ORQUESTADOR DE RECONOCIMIENTO ÓPTICO INDIVIDUAL ---
    async function runOCRProcess() {
        if (!currentImageSource || isScanning) return;

        const apiKey = activeEngine === 'gemini' ? getGeminiApiKey() : '';
        if (activeEngine === 'gemini' && !apiKey) {
            showToast('Falta tu Clave API de Gemini: pégala en el botón verde superior para leer cursiva.', 'error');
            liveBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Configura tu Clave API Gemini arriba para activar IA';
            apiKeyModal.classList.remove('hidden');
            return;
        }

        isScanning = true;
        stopSpeech();
        const selectedLang = languageSelect.value;

        btnScanNow.disabled = true;
        scannerLaser.classList.remove('hidden');
        progressWrapper.classList.remove('hidden');
        progressBar.style.width = '20%';
        progressPercent.textContent = '20%';
        statusText.lastChild.textContent = ' Optimizando imagen...';
        liveBadge.textContent = activeEngine === 'gemini'
            ? 'Gemini multimodal analizando la imagen...'
            : activeEngine === 'paddleocr'
                ? 'OCR español local leyendo la imagen...'
                : 'OCR clásico local procesando la imagen...';

        try {
            let finalExtracted = '';
            let finalFicha = null;

            if (activeEngine === 'gemini') {
                const fastImgObj = await prepareFastImageDataUrl(currentImageSource, {
                    brightness: imgBrightness,
                    contrast: imgContrast,
                    rotation: imgRotation,
                    maxDimension: 960,
                    applyAdaptivePreprocess: false
                });
                progressBar.style.width = '55%';
                progressPercent.textContent = '55%';
                statusText.lastChild.textContent = ' Transcribiendo y rellenando ficha...';

                try {
                    const res = await extractAndFillWithGeminiSingleCall(fastImgObj, selectedLang, apiKey);
                    finalExtracted = res.text;
                    finalFicha = res.ficha;
                    progressBar.style.width = '100%';
                    progressPercent.textContent = '100%';
                } catch (aiErr) {
                    console.error('Error con Gemini API:', aiErr);
                    showToast(`Aviso IA: ${aiErr.message}`, 'error');
                    liveBadge.textContent = `Error API: ${aiErr.message.slice(0, 48)}`;
                    return;
                }
            } else if (activeEngine === 'paddleocr') {
                const handwritingImage = await prepareFastImageDataUrl(currentImageSource, {
                    brightness: imgBrightness,
                    contrast: imgContrast,
                    rotation: imgRotation,
                    maxDimension: 2200,
                    applyAdaptivePreprocess: false
                });
                progressBar.style.width = '40%';
                progressPercent.textContent = '40%';
                finalExtracted = await recognizeWithPaddleOcr(handwritingImage.dataUrl, selectedLang, true);
                finalFicha = buildFichaFromLocalText(finalExtracted);
                progressBar.style.width = '100%';
                progressPercent.textContent = '100%';
            } else {
                const adaptiveImgObj = await prepareFastImageDataUrl(currentImageSource, {
                    brightness: imgBrightness,
                    contrast: imgContrast,
                    rotation: imgRotation,
                    maxDimension: 1400,
                    applyAdaptivePreprocess: true
                });
                progressBar.style.width = '30%';
                progressPercent.textContent = '30%';
                finalExtracted = await recognizeWithTesseractFast(adaptiveImgObj.dataUrl, selectedLang, true);
                finalFicha = buildFichaFromLocalText(finalExtracted);
                progressBar.style.width = '100%';
                progressPercent.textContent = '100%';
            }

            if (finalExtracted) {
                extractedText.value = finalExtracted;
                updateWordCount();
                if (finalFicha) {
                    applyFichaObjectToDOM(finalFicha);
                }
                saveActiveLapidaState();
                renderBatchTray();
                if (finalFicha?.estado === 'Libre') {
                    showToast('Placa con "L" detectada: marcada automáticamente como Bóveda Libre.', 'info');
                    liveBadge.textContent = 'Bóveda Libre (L) detectada';
                } else if (activeEngine === 'paddleocr') {
                    showToast('OCR local completado. Revisa nombres y fechas antes de exportar.', 'success');
                    liveBadge.textContent = 'OCR español local completado';
                } else {
                    showToast('¡Texto transcrito y ficha rellenada al instante!', 'success');
                    liveBadge.textContent = 'Transcripción y Ficha completadas';
                }
            } else {
                extractedText.value = '';
                updateWordCount();
                showToast('No se detectó texto legible. Prueba ajustar brillo/contraste.', 'error');
                liveBadge.textContent = 'Sin texto detectado';
            }

        } catch (error) {
            console.error('Error en el proceso OCR:', error);
            const errorMessage = error?.message || 'No se pudo procesar la imagen.';
            showToast(errorMessage.length > 120 ? `${errorMessage.slice(0, 117)}...` : errorMessage, 'error');
            liveBadge.textContent = 'Error en el escaneo';
        } finally {
            isScanning = false;
            btnScanNow.disabled = false;
            scannerLaser.classList.add('hidden');
            setTimeout(() => {
                progressWrapper.classList.add('hidden');
            }, 600);
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

        setEngine(activeEngine);
        showToast('Área de trabajo y ficha limpias.', 'info');
    });
});

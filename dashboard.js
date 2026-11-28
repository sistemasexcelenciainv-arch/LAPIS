
/**
 * LAPIS - PANEL PRINCIPAL
 * Se activa después del inicio de sesión.
 * Conserva intacto el escáner OCR existente.
 */

(function () {
    "use strict";

    let dashboard = null;
    let backButton = null;
    let observer = null;

    const styles = `
        #lapisDashboard {
            position: fixed;
            inset: 0;
            z-index: 900000;
            overflow-y: auto;
            background: #f4f7fb;
            color: #172033;
            font-family: Inter, Arial, sans-serif;
        }

        #lapisDashboard * {
            box-sizing: border-box;
        }

        .lapis-container {
            width: min(1120px, calc(100% - 36px));
            margin: auto;
            padding: 28px 0 45px;
        }

        .lapis-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 30px;
        }

        .lapis-brand {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .lapis-logo {
            width: 47px;
            height: 47px;
            display: grid;
            place-items: center;
            border-radius: 15px;
            color: white;
            font-size: 22px;
            font-weight: 900;
            background: linear-gradient(135deg,#1d4ed8,#6366f1);
        }

        .lapis-brand h1 {
            margin: 0;
            font-size: 21px;
            font-weight: 850;
        }

        .lapis-brand p {
            margin: 3px 0 0;
            color: #8290a5;
            font-size: 11px;
        }

        .lapis-user {
            padding: 10px 14px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            background: white;
            color: #475569;
            font-size: 12px;
        }

        .lapis-welcome {
            padding: 36px;
            border-radius: 24px;
            color: white;
            background: linear-gradient(
                115deg,#142b59,#1d4e89,#315ec2
            );
            box-shadow: 0 18px 45px #1e3a8a20;
        }

        .lapis-welcome small {
            color: #bfdbfe;
            font-weight: 800;
            letter-spacing: 1.5px;
            text-transform: uppercase;
        }

        .lapis-welcome h2 {
            margin: 12px 0 8px;
            font-size: clamp(26px,4vw,36px);
            font-weight: 850;
        }

        .lapis-welcome p {
            margin: 0;
            max-width: 650px;
            color: #dbeafe;
            font-size: 14px;
            line-height: 1.7;
        }

        .lapis-section-title {
            margin: 30px 0 15px;
            font-size: 16px;
            font-weight: 800;
        }

        .lapis-stats {
            display: grid;
            grid-template-columns: repeat(4,1fr);
            gap: 14px;
        }

        .lapis-stat {
            padding: 20px;
            min-height: 125px;
            border: 1px solid #e5eaf2;
            border-radius: 18px;
            background: white;
        }

        .lapis-stat-icon {
            font-size: 21px;
            margin-bottom: 12px;
        }

        .lapis-stat strong {
            display: block;
            font-size: 29px;
            color: #172b50;
        }

        .lapis-stat span {
            display: block;
            margin-top: 4px;
            color: #8290a5;
            font-size: 11px;
        }

        .lapis-modules {
            display: grid;
            grid-template-columns: repeat(2,1fr);
            gap: 16px;
        }

        .lapis-module {
            display: flex;
            align-items: center;
            gap: 17px;
            min-height: 125px;
            padding: 22px;
            border: 1px solid #e1e8f2;
            border-radius: 20px;
            background: white;
            text-align: left;
            cursor: pointer;
            transition: .2s;
        }

        .lapis-module:hover {
            transform: translateY(-3px);
            border-color: #9db9ef;
            box-shadow: 0 12px 28px #1e40af12;
        }

        .lapis-module-icon {
            width: 54px;
            height: 54px;
            flex-shrink: 0;
            display: grid;
            place-items: center;
            border-radius: 16px;
            color: #2857b8;
            background: #edf3ff;
            font-size: 25px;
        }

        .lapis-module strong {
            display: block;
            color: #1b2942;
            font-size: 15px;
        }

        .lapis-module span {
            display: block;
            margin-top: 6px;
            color: #77839a;
            font-size: 12px;
            line-height: 1.5;
        }

        .lapis-arrow {
            margin-left: auto;
            color: #91a0b8;
            font-size: 24px;
        }

        .lapis-error {
            margin-top: 15px;
            padding: 12px;
            border-radius: 12px;
            background: #fff1f2;
            color: #991b1b;
            font-size: 12px;
        }

        .lapis-footer {
            margin-top: 28px;
            color: #9aa5b7;
            text-align: center;
            font-size: 11px;
        }

        #lapisBackDashboard {
            display: none;
            position: fixed;
            z-index: 899999;
            right: 20px;
            bottom: 20px;
            padding: 13px 17px;
            border: none;
            border-radius: 12px;
            color: white;
            background: #1d4ed8;
            font-size: 12px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 8px 25px #1e40af40;
        }

        @media(max-width:760px) {
            .lapis-container {
                width: calc(100% - 26px);
                padding-top: 18px;
            }

            .lapis-welcome {
                padding: 26px 22px;
            }

            .lapis-stats {
                grid-template-columns: repeat(2,1fr);
                gap: 10px;
            }

            .lapis-modules {
                grid-template-columns: 1fr;
            }

            .lapis-user {
                font-size: 10px;
                padding: 8px;
            }
        }
    `;

    function createDashboard() {
        if (dashboard) return dashboard;

        const style = document.createElement("style");
        style.textContent = styles;
        document.head.appendChild(style);

        dashboard = document.createElement("div");
        dashboard.id = "lapisDashboard";

        dashboard.innerHTML = `
            <div class="lapis-container">

                <header class="lapis-top">
                    <div class="lapis-brand">
                        <div class="lapis-logo">L</div>
                        <div>
                            <h1>LAPIS</h1>
                            <p>Gestión e inventario funerario</p>
                        </div>
                    </div>

                    <div class="lapis-user" id="lapisDashboardUser">
                        Sesión activa
                    </div>
                </header>

                <section class="lapis-welcome">
                    <small>Panel principal</small>
                    <h2 id="lapisWelcomeTitle">
                        ¡Bienvenido a LAPIS!
                    </h2>
                    <p>
                        Sistema de gestión e inventario de bóvedas
                        funerarias. Administra la información,
                        consulta registros y digitaliza inscripciones
                        desde un solo lugar.
                    </p>
                </section>

                <h3 class="lapis-section-title">
                    Resumen general
                </h3>

                <section class="lapis-stats">

                    <article class="lapis-stat">
                        <div class="lapis-stat-icon">🏛️</div>
                        <strong id="statCementerios">—</strong>
                        <span>Cementerios registrados</span>
                    </article>

                    <article class="lapis-stat">
                        <div class="lapis-stat-icon">🟢</div>
                        <strong id="statActivos">—</strong>
                        <span>Cementerios activos</span>
                    </article>

                    <article class="lapis-stat">
                        <div class="lapis-stat-icon">⚰️</div>
                        <strong id="statSepulturas">—</strong>
                        <span>Bóvedas registradas</span>
                    </article>

                    <article class="lapis-stat">
                        <div class="lapis-stat-icon">👥</div>
                        <strong id="statFallecidos">—</strong>
                        <span>Personas registradas</span>
                    </article>

                </section>

                <h3 class="lapis-section-title">
                    Módulos de trabajo
                </h3>

                <section class="lapis-modules">

                    <button
                        class="lapis-module"
                        id="lapisOpenScanner"
                        type="button"
                    >
                        <div class="lapis-module-icon">▧</div>

                        <div>
                            <strong>Escáner OCR</strong>
                            <span>
                                Digitalización y reconocimiento
                                de inscripciones en lápidas.
                            </span>
                        </div>

                        <div class="lapis-arrow">›</div>
                    </button>

                    <button
                        class="lapis-module"
                        id="lapisOpenVaults"
                        type="button"
                    >
                        <div class="lapis-module-icon">⌕</div>

                        <div>
                            <strong>Consulta de bóvedas</strong>
                            <span>
                                Cementerios, ubicaciones,
                                fallecidos y fotografías.
                            </span>
                        </div>

                        <div class="lapis-arrow">›</div>
                    </button>

                </section>

                <p id="lapisDashboardError"
                   class="lapis-error"
                   hidden></p>

                <footer class="lapis-footer">
                    LAPIS · Sistema de información y consulta
                </footer>

            </div>
        `;

        document.body.appendChild(dashboard);

        dashboard.querySelector("#lapisOpenVaults")
    .addEventListener("click", () => {
        if (window.LAPISVaults) {
            window.LAPISVaults.open();
        } else {
            alert("No se pudo cargar el módulo de consulta.");
        }
    });

        backButton = document.createElement("button");
        backButton.id = "lapisBackDashboard";
        backButton.type = "button";
        backButton.textContent = "← Volver al panel principal";
        backButton.addEventListener("click", openDashboard);

        document.body.appendChild(backButton);

        return dashboard;
    }

    async function loadSummary() {
        const errorBox =
            dashboard.querySelector("#lapisDashboardError");

        errorBox.hidden = true;

        try {
            // Validar y renovar la sesión si es necesario.
            const sessionResponse = await fetch(
                "/api/auth-session",
                {
                    credentials: "same-origin",
                    cache: "no-store"
                }
            );

            const session = await sessionResponse.json();

            if (!sessionResponse.ok || !session.authenticated) {
                throw new Error(
                    session.error || "Sesión no válida."
                );
            }

            const funcionario = session.funcionario;

            dashboard.querySelector("#lapisDashboardUser")
                .textContent =
                funcionario.username + " · " + funcionario.rol;

            dashboard.querySelector("#lapisWelcomeTitle")
                .textContent =
                "¡Bienvenido, " + funcionario.username + "!";

            // Consultar indicadores protegidos en el servidor.
            const response = await fetch(
                "/api/dashboard-summary",
                {
                    credentials: "same-origin",
                    cache: "no-store"
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Error cargando indicadores."
                );
            }

            const data = result.resumen;

            const number = value =>
                new Intl.NumberFormat("es-CO").format(value || 0);

            dashboard.querySelector("#statCementerios")
                .textContent = number(data.cementerios);

            dashboard.querySelector("#statActivos")
                .textContent = number(data.cementerios_activos);

            dashboard.querySelector("#statSepulturas")
                .textContent = number(data.sepulturas);

            dashboard.querySelector("#statFallecidos")
                .textContent = number(data.fallecidos);

        } catch (error) {
            errorBox.textContent = error.message;
            errorBox.hidden = false;
        }
    }

    function openDashboard() {
        createDashboard();

        dashboard.style.display = "block";
        backButton.style.display = "none";

        loadSummary();
    }

    function openScanner() {
        dashboard.style.display = "none";
        backButton.style.display = "block";

        const scanner = document.querySelector(
            "body > div.max-w-6xl"
        );

        if (scanner) {
            scanner.scrollIntoView({ block: "start" });
        }
    }
// Escuchar la autenticación confirmada por auth-ui.js.
document.addEventListener("lapis:authenticated", function(event) {

    if (event.detail && dashboard) {
        dashboard.querySelector("#lapisDashboardUser").textContent =
            event.detail.username + " · " + event.detail.rol;
    }

    openDashboard();
});
    function checkAuthentication() {
        const authenticated =
            !document.body.classList.contains("lapis-auth-locked") &&
            document.getElementById("lapisUserBar");

        if (authenticated && !dashboard) {
            openDashboard();
        }
    }

    // Detectar tanto un login nuevo como una sesión restaurada.
    observer = new MutationObserver(checkAuthentication);

    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
        childList: true,
        subtree: true
    });

    checkAuthentication();

    document.addEventListener("lapis:logout", () => {
        if (dashboard) dashboard.style.display = "none";
        if (backButton) backButton.style.display = "none";
    });

})();

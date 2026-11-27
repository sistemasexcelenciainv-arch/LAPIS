
/**
 * LAPIS - Interfaz de autenticación
 * Controla el acceso visual al escáner mediante el backend.
 * No almacena tokens ni contraseñas en el navegador.
 */

(function () {
    "use strict";

    document.body.classList.add("lapis-auth-locked");

    const styles = `
        body.lapis-auth-locked > :not(#lapisAuthRoot):not(script) {
            display: none !important;
        }

        #lapisAuthRoot {
            position: fixed;
            inset: 0;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            overflow-y: auto;
            background:
                radial-gradient(circle at 10% 10%, #dbeafe 0, transparent 35%),
                radial-gradient(circle at 90% 90%, #e0e7ff 0, transparent 35%),
                #f8fafc;
            font-family: Inter, Arial, sans-serif;
        }

        #lapisAuthRoot * {
            box-sizing: border-box;
        }

        .lapis-login-card {
            width: 100%;
            max-width: 430px;
            padding: 38px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 25px;
            box-shadow: 0 24px 70px rgba(15, 23, 42, .12);
        }

        .lapis-logo {
            width: 62px;
            height: 62px;
            margin: 0 auto 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 19px;
            color: white;
            font-size: 23px;
            font-weight: 800;
            letter-spacing: -1px;
            background: linear-gradient(135deg, #1d4ed8, #6366f1);
            box-shadow: 0 10px 25px rgba(79, 70, 229, .25);
        }

        .lapis-login-title {
            text-align: center;
            color: #0f172a;
            font-size: 29px;
            font-weight: 800;
            letter-spacing: -1px;
        }

        .lapis-login-subtitle {
            margin: 8px 0 30px;
            text-align: center;
            color: #64748b;
            font-size: 13px;
            line-height: 1.6;
        }

        .lapis-field {
            margin-bottom: 19px;
        }

        .lapis-field label {
            display: block;
            margin-bottom: 8px;
            color: #334155;
            font-size: 13px;
            font-weight: 700;
        }

        .lapis-field input {
            width: 100%;
            height: 49px;
            padding: 0 14px;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            outline: none;
            color: #0f172a;
            background: white;
            font-size: 14px;
        }

        .lapis-field input:focus {
            border-color: #4f46e5;
            box-shadow: 0 0 0 4px rgba(79, 70, 229, .10);
        }

        .lapis-password-wrap {
            display: flex;
            gap: 8px;
        }

        .lapis-password-wrap input {
            flex: 1;
            min-width: 0;
        }

        .lapis-show-password {
            padding: 0 12px;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            color: #475569;
            background: #f8fafc;
            cursor: pointer;
            font-size: 12px;
            font-weight: 700;
        }

        .lapis-submit {
            width: 100%;
            height: 50px;
            margin-top: 8px;
            border: 0;
            border-radius: 13px;
            color: white;
            background: linear-gradient(135deg, #1d4ed8, #4f46e5);
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
            transition: opacity .2s, transform .2s;
        }

        .lapis-submit:hover {
            transform: translateY(-1px);
        }

        .lapis-submit:disabled {
            cursor: wait;
            opacity: .65;
        }

        .lapis-error {
            display: none;
            margin-bottom: 16px;
            padding: 12px;
            border: 1px solid #fecaca;
            border-radius: 11px;
            color: #b91c1c;
            background: #fef2f2;
            font-size: 12px;
            line-height: 1.5;
        }

        .lapis-login-footer {
            margin-top: 25px;
            padding-top: 19px;
            border-top: 1px solid #f1f5f9;
            text-align: center;
            color: #94a3b8;
            font-size: 11px;
        }

        #lapisUserBar {
            display: none;
            align-items: center;
            gap: 12px;
            padding: 9px 12px;
            margin-bottom: 15px;
            border: 1px solid #e2e8f0;
            border-radius: 13px;
            background: white;
        }

        #lapisUserBar .lapis-user-info {
            flex: 1;
            color: #334155;
            font-size: 12px;
        }

        #lapisLogout {
            padding: 8px 12px;
            border: 1px solid #fecaca;
            border-radius: 9px;
            color: #b91c1c;
            background: #fff;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
        }

        @media (max-width: 480px) {
            .lapis-login-card {
                padding: 27px 21px;
            }
        }
    `;

    function unlockApplication(funcionario) {
        document.body.classList.remove("lapis-auth-locked");

        const root = document.getElementById("lapisAuthRoot");
        if (root) root.remove();

        let userBar = document.getElementById("lapisUserBar");

        if (!userBar) {
            userBar = document.createElement("div");
            userBar.id = "lapisUserBar";

            const mainHeader = document.querySelector("header");

            if (mainHeader) {
                mainHeader.insertAdjacentElement("afterend", userBar);
            } else {
                document.body.prepend(userBar);
            }
        }

        userBar.style.display = "flex";

        userBar.innerHTML = `
            <div class="lapis-user-info">
                <strong>Sesión:</strong>
                <span></span>
            </div>
            <button id="lapisLogout" type="button">
                Cerrar sesión
            </button>
        `;

        userBar.querySelector("span").textContent =
            funcionario.username + " · " + funcionario.rol;

        document.getElementById("lapisLogout")
            .addEventListener("click", logout);
    }

    function showLogin(errorMessage) {
        let root = document.getElementById("lapisAuthRoot");

        if (!root) {
            root = document.createElement("div");
            root.id = "lapisAuthRoot";
            document.body.appendChild(root);
        }

        root.innerHTML = `
            <section class="lapis-login-card">
                <div class="lapis-logo">L</div>

                <div class="lapis-login-title">LAPIS</div>

                <p class="lapis-login-subtitle">
                    Sistema de inventario de bóvedas.<br>
                    Acceso exclusivo para funcionarios autorizados.
                </p>

                <div id="lapisLoginError" class="lapis-error"
                     role="alert"></div>

                <form id="lapisLoginForm">
                    <div class="lapis-field">
                        <label for="lapisUsername">
                            Nombre de usuario
                        </label>
                        <input
                            id="lapisUsername"
                            name="username"
                            type="text"
                            placeholder="Ingresa tu usuario"
                            autocomplete="username"
                            minlength="3"
                            maxlength="32"
                            required
                        >
                    </div>

                    <div class="lapis-field">
                        <label for="lapisPassword">
                            Contraseña
                        </label>

                        <div class="lapis-password-wrap">
                            <input
                                id="lapisPassword"
                                name="password"
                                type="password"
                                placeholder="Ingresa tu contraseña"
                                autocomplete="current-password"
                                required
                            >

                            <button
                                id="lapisShowPassword"
                                class="lapis-show-password"
                                type="button"
                            >
                                Ver
                            </button>
                        </div>
                    </div>

                    <button
                        id="lapisLoginButton"
                        class="lapis-submit"
                        type="submit"
                    >
                        Iniciar sesión
                    </button>
                </form>

                <div class="lapis-login-footer">
                    LAPIS · Acceso privado y autorizado
                </div>
            </section>
        `;

        if (errorMessage) {
            const error = root.querySelector("#lapisLoginError");
            error.textContent = errorMessage;
            error.style.display = "block";
        }

        const form = root.querySelector("#lapisLoginForm");
        const password = root.querySelector("#lapisPassword");
        const showPassword = root.querySelector("#lapisShowPassword");
        const button = root.querySelector("#lapisLoginButton");

        showPassword.addEventListener("click", () => {
            const visible = password.type === "text";
            password.type = visible ? "password" : "text";
            showPassword.textContent = visible ? "Ver" : "Ocultar";
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            button.disabled = true;
            button.textContent = "Verificando acceso...";

            const username = root.querySelector("#lapisUsername")
                .value.trim();

            const passwordValue = password.value;

            try {
                const response = await fetch("/api/auth-login", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        username,
                        password: passwordValue
                    })
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.error || "No fue posible iniciar sesión."
                    );
                }

                const sessionResponse = await fetch("/api/auth-session", {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store"
                });

                const session = await sessionResponse.json();

                if (!sessionResponse.ok || !session.authenticated) {
                    throw new Error(
                        "No se pudo validar la sesión. Intenta nuevamente."
                    );
                }

                unlockApplication(session.funcionario);

            } catch (error) {
                password.value = "";
                password.focus();

                const message = error.message === "Failed to fetch"
                    ? "No se pudo conectar con el servidor."
                    : error.message;

                showLogin(message);

            } finally {
                const currentButton =
                    document.getElementById("lapisLoginButton");

                if (currentButton) {
                    currentButton.disabled = false;
                    currentButton.textContent = "Iniciar sesión";
                }
            }
        });
    }

    async function logout() {
        try {
            await fetch("/api/auth-logout", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({})
            });
        } catch (error) {
            console.error("Error cerrando sesión:", error);
        }

        document.body.classList.add("lapis-auth-locked");

        const userBar = document.getElementById("lapisUserBar");
        if (userBar) userBar.remove();

        showLogin("Has cerrado tu sesión.");
    }

    async function initialize() {
        const style = document.createElement("style");
        style.textContent = styles;
        document.head.appendChild(style);

        showLogin();

        try {
            const response = await fetch("/api/auth-session", {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store"
            });

            const result = await response.json();

            if (response.ok && result.authenticated) {
                unlockApplication(result.funcionario);
            }
        } catch (error) {
            console.error("No se pudo comprobar la sesión:", error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();

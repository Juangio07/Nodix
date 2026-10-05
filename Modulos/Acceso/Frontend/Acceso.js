/* ============================================================
   Nodix
   INTERFAZ DE ACCESO
   ============================================================ */


/* ============================================================
   CONFIGURACIÓN
   ============================================================ */

const STORAGE_KEY =
    "Nodix_configuracion_empresa_v1";


/* ============================================================
   ELEMENTOS
   ============================================================ */

const formulario =
    document.getElementById("loginForm");

const usuario =
    document.getElementById("usuario");

const password =
    document.getElementById("password");

const mensaje =
    document.getElementById("mensaje");

const mostrarPassword =
    document.getElementById("mostrarPassword");

const iconoPassword =
    mostrarPassword
        ? mostrarPassword.querySelector("i")
        : null;


/* ============================================================
   COLOR DE CONTRASTE
   ============================================================ */

function obtenerColorContraste(hex) {

    if (!hex) {

        return "#080C0A";

    }


    const color =
        hex
            .replace("#", "")
            .trim();


    if (
        !/^[0-9A-Fa-f]{6}$/.test(color)
    ) {

        return "#080C0A";

    }


    const r =
        parseInt(
            color.substring(0, 2),
            16
        );

    const g =
        parseInt(
            color.substring(2, 4),
            16
        );

    const b =
        parseInt(
            color.substring(4, 6),
            16
        );


    const luminancia =
        (
            0.299 * r +
            0.587 * g +
            0.114 * b
        );


    return luminancia > 155
        ? "#080C0A"
        : "#FFFFFF";

}


/* ============================================================
   APLICAR TEMA DEL NEGOCIO
   ============================================================ */

function aplicarTemaNegocio(tema) {
    if (!tema || !tema.primary) return;


    const root =
        document.documentElement;


    const colorPrincipal =
        tema.primary;


    const colorHover =
        tema.hover ||
        tema.primaryHover ||
        colorPrincipal;


    const colorClaro =
        tema.light ||
        tema.primaryLight ||
        colorPrincipal;


    const colorSuave =
        tema.soft ||
        tema.primarySoft ||
        "#DBF7FF";


    const colorTexto =
        tema.onPrimary ||
        obtenerColorContraste(
            colorPrincipal
        );


    /* ========================================================
       COLOR PRINCIPAL
       ======================================================== */

    root.style.setProperty(
        "--brand-primary",
        colorPrincipal
    );


    /* ========================================================
       COLOR HOVER
       ======================================================== */

    root.style.setProperty(
        "--brand-primary-hover",
        colorHover
    );


    /* ========================================================
       COLOR CLARO
       ======================================================== */

    root.style.setProperty(
        "--brand-primary-light",
        colorClaro
    );


    /* ========================================================
       COLOR SUAVE
       ======================================================== */

    root.style.setProperty(
        "--brand-primary-soft",
        colorSuave
    );


    /* ========================================================
       COLOR DE TEXTO SOBRE EL COLOR PRINCIPAL
       ======================================================== */

    root.style.setProperty(
        "--brand-on-primary",
        colorTexto
    );

}


/* ============================================================
   CARGAR PERSONALIZACIÓN
   ============================================================ */

function cargarPersonalizacion() {

    const configuracionGuardada =
        localStorage.getItem(
            STORAGE_KEY
        );


    /*
       Si todavía no existe personalización,
       Variables.css mantiene los colores
       originales de Nodix.
    */

    let configuracion = {};
    if (configuracionGuardada) {
        try {
            configuracion = JSON.parse(configuracionGuardada);
        } catch (error) {
            console.error("Error cargando la personalización en Acceso:", error);
        }
    }

    const temaPersonalizado = configuracion.tema || configuracion.theme;
    if (temaPersonalizado) aplicarTemaNegocio(temaPersonalizado);

    const aplicarTemaBase = () => {
        if (!temaPersonalizado && window.FIXELAR_APP?.theme) aplicarTemaNegocio(window.FIXELAR_APP.theme);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", aplicarTemaBase, { once: true });
    else aplicarTemaBase();

}


/* ============================================================
   MOSTRAR / OCULTAR CONTRASEÑA
   ============================================================ */

if (
    mostrarPassword &&
    password &&
    iconoPassword
) {

    mostrarPassword.addEventListener(
        "click",
        () => {

            const esPassword =
                password.type ===
                "password";


            /* =================================================
               MOSTRAR CONTRASEÑA
               ================================================= */

            if (esPassword) {

                password.type =
                    "text";


                iconoPassword.classList.remove(
                    "fa-toggle-off"
                );


                iconoPassword.classList.add(
                    "fa-toggle-on"
                );


                mostrarPassword.setAttribute(
                    "aria-label",
                    "Ocultar contraseña"
                );


                mostrarPassword.setAttribute(
                    "title",
                    "Ocultar contraseña"
                );

            }


            /* =================================================
               OCULTAR CONTRASEÑA
               ================================================= */

            else {

                password.type =
                    "password";


                iconoPassword.classList.remove(
                    "fa-toggle-on"
                );


                iconoPassword.classList.add(
                    "fa-toggle-off"
                );


                mostrarPassword.setAttribute(
                    "aria-label",
                    "Mostrar contraseña"
                );


                mostrarPassword.setAttribute(
                    "title",
                    "Mostrar contraseña"
                );

            }

        }
    );

}


/* ============================================================
   FORMULARIO
   ============================================================ */

if (formulario) {

    formulario.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            const usuarioIngresado =
                usuario
                    ? usuario.value.trim()
                    : "";


            const passwordIngresado =
                password
                    ? password.value.trim()
                    : "";


            if (mensaje) {

                mensaje.textContent =
                    "";

            }


            /* =================================================
               VALIDAR CAMPOS
               ================================================= */

            if (
                usuarioIngresado === "" ||
                passwordIngresado === ""
            ) {

                if (mensaje) {

                    mensaje.textContent =
                        "Debes completar todos los campos.";

                }


                return;

            }


            /* =================================================
               MENSAJE DE ACCESO
               ================================================= */

            if (mensaje) {

                mensaje.textContent =
                    "Iniciando sesión...";

            }


            /* =================================================
               IR AL PANEL PRINCIPAL
               ================================================= */

            window.location.replace(
                "../../Menu/Frontend/Menu.html"
            );

        }
    );

}


/* ============================================================
   INICIALIZAR ACCESO
   ============================================================ */

function iniciarAcceso() {

    /*
       Primero cargamos la personalización.

       Esto cambia:
       - K de Nodix
       - Botón
       - Focus de inputs
       - Toggle
       - Bordes
       - Resplandores
       - Texto Nodix inferior
    */

    cargarPersonalizacion();

}


/* ============================================================
   EJECUTAR
   ============================================================ */

iniciarAcceso();

/* ============================================================
   Nodix
   DASHBOARD / MENÚ PRINCIPAL
   ============================================================ */


/* ============================================================
   CONFIGURACIÓN
   ============================================================ */

const STORAGE_KEY =
    "Nodix_configuracion_empresa_v1";


/* ============================================================
   ELEMENTOS
   ============================================================ */

const sidebar =
    document.getElementById("sidebar");

const btnSidebar =
    document.getElementById("btnSidebar");

const navItems =
    document.querySelectorAll(".nav-item");

const buscador =
    document.getElementById("buscador");

const elementosBuscables =
    document.querySelectorAll(".searchable");

const toast =
    document.getElementById("toast");

const fechaActual =
    document.getElementById("fechaActual");

const saludo =
    document.getElementById("saludo");

const quickActions =
    document.querySelectorAll("[data-action]");

const dashboard =
    document.querySelector(".dashboard");

const moduleFrame =
    document.getElementById("moduleFrame");

const topbarTitle =
    document.querySelector(".topbar-left h1");

const btnUsuario =
    document.getElementById("btnUsuario");

const menuUsuario =
    document.getElementById("menuUsuario");

const btnCerrarSesion =
    document.getElementById("btnCerrarSesion");

const confirmacionCerrarSesion =
    document.getElementById("confirmacionCerrarSesion");

const cancelarCerrarSesion =
    document.getElementById("cancelarCerrarSesion");

const confirmarCerrarSesion =
    document.getElementById("confirmarCerrarSesion");

const confirmacionModulo = document.getElementById("confirmacionModulo");
const textoConfirmacionModulo = document.getElementById("textoConfirmacionModulo");
let origenConfirmacionModulo = null;


/* ============================================================
   ELEMENTOS DE EMPRESA
   ============================================================ */

const nombreNegocioMenu =
    document.getElementById("nombreNegocioMenu");

const logoNegocioMenu =
    document.getElementById("logoNegocioMenu");

const inicialNegocioMenu =
    document.getElementById("inicialNegocioMenu");


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
   OBTENER INICIAL DEL NEGOCIO
   ============================================================ */

function obtenerInicialNegocio(
    nombreEmpresa
) {

    const nombre =
        (
            nombreEmpresa ||
            ""
        ).trim();


    if (!nombre) {

        return "N";

    }


    return nombre
        .charAt(0)
        .toUpperCase();

}


/* ============================================================
   MOSTRAR INICIAL DEL NEGOCIO
   ============================================================ */

function mostrarInicialNegocio(
    nombreEmpresa
) {

    if (logoNegocioMenu) {

        logoNegocioMenu.hidden =
            true;

        logoNegocioMenu.removeAttribute(
            "src"
        );

    }


    if (inicialNegocioMenu) {

        inicialNegocioMenu.textContent =
            obtenerInicialNegocio(
                nombreEmpresa
            );

        inicialNegocioMenu.style.display =
            "flex";

    }

}


/* ============================================================
   MOSTRAR LOGO DEL NEGOCIO
   ============================================================ */

function cargarLogoNegocio(
    logo,
    nombreEmpresa
) {

    /*
       Si no existen los elementos HTML,
       no hacemos nada.
    */

    if (
        !logoNegocioMenu ||
        !inicialNegocioMenu
    ) {

        return;

    }


    /*
       Siempre iniciamos mostrando la inicial.
       Así evitamos cualquier imagen rota.
    */

    mostrarInicialNegocio(
        nombreEmpresa
    );


    /*
       Si no existe logo guardado,
       dejamos solamente la inicial.
    */

    if (
        !logo ||
        typeof logo !== "string" ||
        logo.trim() === ""
    ) {

        return;

    }


    /*
       Creamos una imagen temporal para comprobar
       que el logo realmente pueda cargarse.
    */

    const imagenPrueba =
        new Image();


    imagenPrueba.onload =
        () => {

            logoNegocioMenu.src =
                logo;

            logoNegocioMenu.hidden =
                false;


            inicialNegocioMenu.style.display =
                "none";

        };


    imagenPrueba.onerror =
        () => {

            /*
               Si el archivo está dañado,
               no existe o no puede cargarse,
               regresamos automáticamente
               a la inicial.
            */

            mostrarInicialNegocio(
                nombreEmpresa
            );

        };


    imagenPrueba.src =
        logo;

}


/* ============================================================
   APLICAR TEMA DEL NEGOCIO
   ============================================================ */

function aplicarTemaNegocio(
    tema
) {
    if (!tema || !tema.primary) return;


    const root =
        document.documentElement;


    const colorPrincipal =
        tema.primary;


    const colorHover =
        tema.hover ||
        colorPrincipal;


    const colorClaro =
        tema.light ||
        colorPrincipal;


    const colorSuave =
        tema.soft ||
        "#DBF7FF";


    const colorTexto =
        tema.onPrimary ||
        obtenerColorContraste(
            colorPrincipal
        );


    root.style.setProperty(
        "--brand-primary",
        colorPrincipal
    );


    root.style.setProperty(
        "--brand-primary-hover",
        colorHover
    );


    root.style.setProperty(
        "--brand-primary-light",
        colorClaro
    );


    root.style.setProperty(
        "--brand-primary-soft",
        colorSuave
    );


    root.style.setProperty(
        "--brand-on-primary",
        colorTexto
    );

}


/* ============================================================
   CARGAR PERSONALIZACIÓN GUARDADA
   ============================================================ */

function cargarPersonalizacion() {

    /*
       Antes de leer localStorage dejamos
       el avatar en un estado seguro.
    */

    mostrarInicialNegocio(
        "Negocio Demo"
    );


    const configuracionGuardada =
        localStorage.getItem(
            STORAGE_KEY
        );


    /*
       Si todavía no existe configuración,
       Nodix conserva sus valores predeterminados.
    */

    if (!configuracionGuardada) {

        if (nombreNegocioMenu) {

            nombreNegocioMenu.textContent =
                "Negocio Demo";

        }

        return;

    }


    try {

        const configuracion =
            JSON.parse(
                configuracionGuardada
            );


        /* ====================================================
           NOMBRE DEL NEGOCIO
           ==================================================== */

        const nombreEmpresa =
            (
                configuracion.nombreEmpresa ||
                ""
            ).trim();


        if (nombreNegocioMenu) {

            nombreNegocioMenu.textContent =
                nombreEmpresa ||
                "Negocio Demo";

        }


        /* ====================================================
           LOGO O INICIAL
           ==================================================== */

        cargarLogoNegocio(
            configuracion.logo,
            nombreEmpresa ||
            "Negocio Demo"
        );

    }

    catch (error) {

        console.error(
            "Error cargando la personalización:",
            error
        );


        /*
           Si los datos guardados están dañados,
           dejamos el Dashboard funcionando
           con sus valores por defecto.
        */

        if (nombreNegocioMenu) {

            nombreNegocioMenu.textContent =
                "Negocio Demo";

        }


        mostrarInicialNegocio(
            "Negocio Demo"
        );

    }

}


/* ============================================================
   FECHA ACTUAL
   ============================================================ */

function mostrarFecha() {

    if (!fechaActual) {

        return;

    }


    const fecha =
        new Date();


    const opciones = {

        weekday:
            "long",

        year:
            "numeric",

        month:
            "long",

        day:
            "numeric"

    };


    let textoFecha =
        fecha.toLocaleDateString(
            "es-CO",
            opciones
        );


    textoFecha =
        textoFecha
            .charAt(0)
            .toUpperCase() +
        textoFecha.slice(1);


    fechaActual.textContent =
        textoFecha;

}


/* ============================================================
   SALUDO SEGÚN LA HORA
   ============================================================ */

function actualizarSaludo() {

    if (!saludo) {

        return;

    }


    const hora =
        new Date()
            .getHours();


    if (hora < 12) {

        saludo.textContent =
            "Buenos días";

    }

    else if (hora < 18) {

        saludo.textContent =
            "Buenas tardes";

    }

    else {

        saludo.textContent =
            "Buenas noches";

    }

}


/* ============================================================
   CONTRAER SIDEBAR
   ============================================================ */

if (
    btnSidebar &&
    sidebar
) {

    btnSidebar.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle(
                "collapsed"
            );

        }
    );

}


/* ============================================================
   NORMALIZAR NOMBRE DE MÓDULO
   ============================================================ */

function normalizarModulo(texto) {

    return (
        texto ||
        ""
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim()
        .toLowerCase();

}


/* ============================================================
   NAVEGACIÓN
   ============================================================ */

navItems.forEach(
    item => {

        item.addEventListener(
            "click",
            () => {

                const modulo =
                    item.dataset.section ||
                    "";


                const moduloNormalizado =
                    normalizarModulo(
                        modulo
                    );


                /* ============================================
                   RESTO DEL MENÚ
                   ============================================ */

                navItems.forEach(
                    nav => {

                        nav.classList.remove(
                            "active"
                        );

                    }
                );


                item.classList.add(
                    "active"
                );


                if (moduloNormalizado === "inicio") {
                    dashboard.hidden = false;
                    moduleFrame.hidden = true;
                    moduleFrame.removeAttribute("src");
                    if (topbarTitle) topbarTitle.textContent = "Panel principal";
                    return;
                }

                if (moduloNormalizado === "usuarios") {
                    dashboard.hidden = true;
                    moduleFrame.src = "../../Usuarios/Frontend/Usuarios.html";
                    moduleFrame.hidden = false;
                    if (topbarTitle) topbarTitle.textContent = "Usuarios";
                    return;
                }

                if (moduloNormalizado === "roles") {
                    dashboard.hidden = true;
                    moduleFrame.src = "../../Roles/Frontend/Roles.html";
                    moduleFrame.hidden = false;
                    if (topbarTitle) topbarTitle.textContent = "Roles";
                    return;
                }

                if (moduloNormalizado === "configuracion") {
                    dashboard.hidden = true;
                    moduleFrame.src = "../../Configuracion/Frontend/Configuracion.html";
                    moduleFrame.hidden = false;
                    if (topbarTitle) topbarTitle.textContent = "Configuración";
                    return;
                }

                if (
                    moduloNormalizado !==
                    "inicio"
                ) {
                    mostrarToast(`${modulo}: módulo en construcción`);

                }

            }
        );

    }
);


/* ============================================================
   BUSCADOR
   ============================================================ */

if (buscador) {

    buscador.addEventListener(
        "input",
        () => {

            const busqueda =
                buscador.value
                    .trim()
                    .toLowerCase();


            elementosBuscables.forEach(
                elemento => {

                    const contenido =
                        (
                            elemento.dataset.search ||
                            ""
                        )
                            .toLowerCase();


                    const coincide =
                        contenido.includes(
                            busqueda
                        );


                    elemento.classList.toggle(
                        "search-hidden",
                        !coincide
                    );

                }
            );

        }
    );

}


/* ============================================================
   ACCIONES RÁPIDAS
   ============================================================ */

quickActions.forEach(
    boton => {

        boton.addEventListener(
            "click",
            () => {

                const accion =
                    boton.dataset.action;


                const mensajes = {

                    venta:
                        "Nueva venta",

                    producto:
                        "Nuevo producto",

                    inversion:
                        "Registrar inversión",

                    gasto:
                        "Registrar gasto"

                };


                const texto =
                    mensajes[accion] ||
                    "Acción";


                mostrarToast(
                    `${texto}: módulo en construcción`
                );

            }
        );

    }
);


/* ============================================================
   TOAST
   ============================================================ */

let toastTimer;


function mostrarToast(mensaje) {

    if (!toast) {

        return;

    }


    clearTimeout(
        toastTimer
    );


    toast.textContent =
        mensaje;


    toast.classList.add(
        "show"
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );

}


/* ============================================================
   INICIAR MENÚ
   ============================================================ */

function iniciarMenu() {

    /*
       Primero cargamos la identidad del negocio.
    */

    cargarPersonalizacion();


    /*
       Después inicializamos la información
       general del Dashboard.
    */

    mostrarFecha();

    actualizarSaludo();

}

if (btnUsuario && menuUsuario) {
    btnUsuario.addEventListener("click", event => {
        event.stopPropagation();
        const abierto = !menuUsuario.hidden;
        menuUsuario.hidden = abierto;
        btnUsuario.setAttribute("aria-expanded", String(!abierto));
    });

    document.addEventListener("click", () => {
        menuUsuario.hidden = true;
        btnUsuario.setAttribute("aria-expanded", "false");
    });
}

if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener("click", () => {
        menuUsuario.hidden = true;
        btnUsuario.setAttribute("aria-expanded", "false");
        confirmacionCerrarSesion.hidden = false;
        cancelarCerrarSesion.focus();
    });
}

cancelarCerrarSesion.addEventListener("click", () => {
    confirmacionCerrarSesion.hidden = true;
});

confirmarCerrarSesion.addEventListener("click", () => {
    window.location.replace("../../Acceso/Frontend/Acceso.html");
});

window.addEventListener("message", event => {
    if (event.data?.type !== "fixelar-confirm-delete") return;
    origenConfirmacionModulo = event.source;
    textoConfirmacionModulo.textContent = event.data.message;
    confirmacionModulo.hidden = false;
    document.getElementById("cancelarConfirmacionModulo").focus();
});

document.getElementById("cancelarConfirmacionModulo").addEventListener("click", () => {
    if (origenConfirmacionModulo) origenConfirmacionModulo.postMessage({ type: "fixelar-confirm-delete-result", confirmed: false }, "*");
    origenConfirmacionModulo = null;
    confirmacionModulo.hidden = true;
});

document.getElementById("aceptarConfirmacionModulo").addEventListener("click", () => {
    if (origenConfirmacionModulo) origenConfirmacionModulo.postMessage({ type: "fixelar-confirm-delete-result", confirmed: true }, "*");
    origenConfirmacionModulo = null;
    confirmacionModulo.hidden = true;
});

window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) {
        cargarPersonalizacion();
    }
});


/* ============================================================
   EJECUTAR
   ============================================================ */

iniciarMenu();

"use strict";

const STORAGE_KEY = "Nodix_configuracion_empresa_v1";
const campos = ["nit", "nombre", "propietario", "telefono", "correo", "ubicacion"];
const formulario = document.getElementById("formularioEmpresa");
const logoInput = document.getElementById("logoEmpresa");
const imagen = document.getElementById("imagenEmpresa");
const inicial = document.getElementById("inicialEmpresa");
const quitarLogo = document.getElementById("quitarLogo");
const cancelarCambios = document.getElementById("cancelarCambios");
const mensaje = document.getElementById("mensajeConfiguracion");
const toast = document.getElementById("toastConfiguracion");
let logoData = "";
let estadoGuardado = { campos: {}, logo: "" };
let toastTimer;

function actualizarLogo() {
    const nombre = document.getElementById("nombre").value.trim();
    inicial.textContent = nombre.charAt(0).toUpperCase() || "N";
    inicial.hidden = Boolean(logoData);
    imagen.hidden = !logoData;
    if (logoData) imagen.src = logoData;
    quitarLogo.hidden = !logoData;
}

function actualizarEstadoCambios() {
    const actuales = Object.fromEntries(campos.map(campo => [campo, document.getElementById(campo).value]));
    const editado = JSON.stringify(actuales) !== JSON.stringify(estadoGuardado.campos) || logoData !== estadoGuardado.logo;
    cancelarCambios.hidden = !editado;
}

function cargar() {
    try {
        const datos = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        campos.forEach(campo => { document.getElementById(campo).value = datos[campo] || ""; });
        logoData = datos.logo || "";
    } catch {
        logoData = "";
    }
    estadoGuardado = { campos: Object.fromEntries(campos.map(campo => [campo, document.getElementById(campo).value])), logo: logoData };
    actualizarLogo();
    actualizarEstadoCambios();
}

function mostrarToast(texto) {
    clearTimeout(toastTimer);
    toast.textContent = texto;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function restaurarEstadoGuardado() {
    campos.forEach(campo => { document.getElementById(campo).value = estadoGuardado.campos[campo] || ""; });
    logoData = estadoGuardado.logo || "";
    logoInput.value = "";
    mensaje.textContent = "";
    formulario.querySelectorAll(".invalid").forEach(elemento => elemento.classList.remove("invalid"));
    actualizarLogo();
    actualizarEstadoCambios();
}

document.getElementById("seleccionarLogo").addEventListener("click", () => logoInput.click());
logoInput.addEventListener("change", () => {
    const archivo = logoInput.files[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => { logoData = lector.result; actualizarLogo(); actualizarEstadoCambios(); };
    lector.readAsDataURL(archivo);
});
quitarLogo.addEventListener("click", () => { logoData = ""; logoInput.value = ""; actualizarLogo(); actualizarEstadoCambios(); });
campos.forEach(campo => document.getElementById(campo).addEventListener("input", () => { if (campo === "nombre") actualizarLogo(); actualizarEstadoCambios(); }));
cancelarCambios.addEventListener("click", restaurarEstadoGuardado);

formulario.addEventListener("submit", evento => {
    evento.preventDefault();
    mensaje.textContent = "";
    formulario.querySelectorAll(".invalid").forEach(elemento => elemento.classList.remove("invalid"));
    if (!formulario.reportValidity()) {
        const invalido = formulario.querySelector(":invalid");
        if (invalido) invalido.classList.add("invalid");
        return;
    }
    const datos = Object.fromEntries(campos.map(campo => [campo, document.getElementById(campo).value.trim()]));
    if (!/^[0-9-]+$/.test(datos.nit)) {
        mensaje.textContent = "El NIT/CC debe contener solo números y guiones.";
        document.getElementById("nit").classList.add("invalid");
        return;
    }
    if (!/^\d+$/.test(datos.telefono)) {
        mensaje.textContent = "El teléfono debe contener solo números.";
        document.getElementById("telefono").classList.add("invalid");
        return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...datos, nombreEmpresa: datos.nombre, logo: logoData }));
    estadoGuardado = { campos: Object.fromEntries(campos.map(campo => [campo, datos[campo]])), logo: logoData };
    actualizarEstadoCambios();
    mostrarToast("Información guardada");
});

cargar();

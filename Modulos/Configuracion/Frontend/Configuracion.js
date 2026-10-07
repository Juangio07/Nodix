"use strict";

const STORAGE_KEY = "Nodix_configuracion_empresa_v1";
const fields = ["nit", "nombre", "propietario", "telefono", "correo", "ubicacion"];
const MAX_LOGO_BYTES = 8 * 1024 * 1024;
const MAX_SOURCE_DIMENSION = 12000;
const NORMALIZED_LOGO_SIZE = 600;
const LOGO_BACKGROUND = "#ffffff";

const form = document.getElementById("companyForm");
const imageInput = document.getElementById("logoInput");
const image = document.getElementById("logoImage");
const initial = document.getElementById("logoInitial");
const formMessage = document.getElementById("formMessage");
const removeLogo = document.getElementById("removeLogo");
let logo = "";
let toastTimer;

function getData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function setMessage(message = "") {
    formMessage.textContent = message;
}

function updatePreview() {
    const name = document.getElementById("nombre").value.trim();
    initial.textContent = (name.charAt(0) || "N").toUpperCase();
    initial.hidden = Boolean(logo);
    image.hidden = !logo;
    image.alt = name ? `Logo de ${name}` : "Logo de la empresa";
    if (logo) image.src = logo;
    removeLogo.hidden = !logo;
}

function notifyParent() {
    if (window.parent === window) return;
    const payload = { nombreEmpresa: document.getElementById("nombre").value.trim(), logo };
    window.parent.postMessage({ type: "nodix-company-updated", payload }, "*");
}

function showToast(text) {
    const toast = document.getElementById("toast");
    clearTimeout(toastTimer);
    toast.textContent = text;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function normalizeImageSource(source) {
    return new Promise((resolve, reject) => {
        const sourceImage = new Image();
        sourceImage.decoding = "async";
        sourceImage.onload = () => {
            const width = sourceImage.naturalWidth || sourceImage.width;
            const height = sourceImage.naturalHeight || sourceImage.height;
            if (!width || !height || width > MAX_SOURCE_DIMENSION || height > MAX_SOURCE_DIMENSION) {
                reject(new Error("image-dimensions"));
                return;
            }

            const canvas = document.createElement("canvas");
            canvas.width = NORMALIZED_LOGO_SIZE;
            canvas.height = NORMALIZED_LOGO_SIZE;
            const context = canvas.getContext("2d", { alpha: false });
            if (!context) {
                reject(new Error("canvas-unavailable"));
                return;
            }

            context.fillStyle = LOGO_BACKGROUND;
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = "high";

            const scale = Math.min(canvas.width / width, canvas.height / height);
            const drawWidth = Math.max(1, Math.round(width * scale));
            const drawHeight = Math.max(1, Math.round(height * scale));
            const drawX = Math.round((canvas.width - drawWidth) / 2);
            const drawY = Math.round((canvas.height - drawHeight) / 2);
            context.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);

            resolve(canvas.toDataURL("image/png"));
        };
        sourceImage.onerror = () => reject(new Error("image-decode"));
        sourceImage.src = source;
    });
}

async function normalizeImageFile(file) {
    if (!file || !file.type.startsWith("image/")) throw new Error("image-type");
    if (file.size > MAX_LOGO_BYTES) throw new Error("image-size");

    const objectUrl = URL.createObjectURL(file);
    try { return await normalizeImageSource(objectUrl); }
    finally { URL.revokeObjectURL(objectUrl); }
}

function imageErrorMessage(error) {
    if (error?.message === "image-size") return "La imagen supera el límite de 8 MB.";
    if (error?.message === "image-dimensions") return "La imagen tiene dimensiones demasiado grandes para procesarla.";
    if (error?.message === "image-type") return "Selecciona un archivo de imagen válido.";
    return "No se pudo leer la imagen. Prueba con PNG, JPG, WEBP u otro formato compatible.";
}

async function load() {
    const data = getData();
    fields.forEach(field => { document.getElementById(field).value = data[field] || ""; });
    logo = data.logo || "";
    updatePreview();

    if (!logo) return;
    try {
        const normalizedLogo = await normalizeImageSource(logo);
        logo = normalizedLogo;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, logo: normalizedLogo }));
        updatePreview();
        notifyParent();
    } catch (error) {
        logo = "";
        updatePreview();
        setMessage(imageErrorMessage(error));
    }
}

document.getElementById("uploadLogo").addEventListener("click", () => imageInput.click());

imageInput.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    setMessage("");

    try {
        logo = await normalizeImageFile(file);
        updatePreview();
        notifyParent();
        showToast("Logo cargado y ajustado correctamente");
    } catch (error) {
        imageInput.value = "";
        setMessage(imageErrorMessage(error));
        showToast("No se pudo cargar el logo");
    }
});

image.addEventListener("error", () => {
    logo = "";
    updatePreview();
    setMessage("No se pudo mostrar el logo guardado. Carga una imagen nueva.");
});

removeLogo.addEventListener("click", () => {
    logo = "";
    imageInput.value = "";
    setMessage("");
    updatePreview();
    notifyParent();
});

document.getElementById("nombre").addEventListener("input", updatePreview);

form.addEventListener("submit", event => {
    event.preventDefault();
    setMessage("");
    if (!form.reportValidity()) return;

    const data = Object.fromEntries(fields.map(field => [field, document.getElementById(field).value.trim()]));
    if (!/^[0-9-]+$/.test(data.nit)) {
        setMessage("El NIT/CC debe contener solo números y guiones.");
        return;
    }

    const payload = { ...data, nombreEmpresa: data.nombre, logo };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    if (window.parent !== window) window.parent.postMessage({ type: "nodix-company-updated", payload }, "*");
    updatePreview();
    showToast("Información guardada");
});

load();

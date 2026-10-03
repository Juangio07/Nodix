"use strict";

const STORAGE_KEY = "Nodix_configuracion_empresa_v1";
const fields = ["nit", "nombre", "propietario", "telefono", "correo", "ubicacion"];
const form = document.getElementById("companyForm");
const imageInput = document.getElementById("logoInput");
const image = document.getElementById("logoImage");
const initial = document.getElementById("logoInitial");
let logo = "";
let toastTimer;

function getData() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } }
function updatePreview() { const name = document.getElementById("nombre").value.trim(); initial.textContent = (name.charAt(0) || "N").toUpperCase(); initial.hidden = Boolean(logo); image.hidden = !logo; if (logo) image.src = logo; document.getElementById("removeLogo").hidden = !logo; }
function notifyParent() { if (window.parent === window) return; const payload = { nombreEmpresa: document.getElementById("nombre").value.trim(), logo }; window.parent.postMessage({ type: "nodix-company-updated", payload }, "*"); }
function showToast(text) { const toast = document.getElementById("toast"); clearTimeout(toastTimer); toast.textContent = text; toast.classList.add("show"); toastTimer = setTimeout(() => toast.classList.remove("show"), 2200); }
function load() { const data = getData(); fields.forEach(field => { document.getElementById(field).value = data[field] || ""; }); logo = data.logo || ""; updatePreview(); }
document.getElementById("uploadLogo").addEventListener("click", () => imageInput.click());
imageInput.addEventListener("change", () => { const file = imageInput.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { logo = reader.result; updatePreview(); notifyParent(); }; reader.readAsDataURL(file); });
document.getElementById("removeLogo").addEventListener("click", () => { logo = ""; imageInput.value = ""; updatePreview(); notifyParent(); });
document.getElementById("nombre").addEventListener("input", updatePreview);
form.addEventListener("submit", event => { event.preventDefault(); document.getElementById("formMessage").textContent = ""; if (!form.reportValidity()) return; const data = Object.fromEntries(fields.map(field => [field, document.getElementById(field).value.trim()])); if (!/^[0-9-]+$/.test(data.nit)) { document.getElementById("formMessage").textContent = "El NIT/CC debe contener solo números y guiones."; return; } const payload = { ...data, nombreEmpresa: data.nombre, logo }; localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); if (window.parent !== window) window.parent.postMessage({ type: "nodix-company-updated", payload }, "*"); updatePreview(); showToast("Información guardada"); });
load();

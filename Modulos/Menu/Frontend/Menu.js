"use strict";

const frame = document.getElementById("moduleFrame");
const dashboard = document.getElementById("dashboard");
const routes = { Articulos: "../../Articulos/Frontend/Articulos.html", Categorias: "../../Categorias/Frontend/Categorias.html", Clientes: "../../Clientes/Frontend/Clientes.html", Gastos: "../../Gastos/Frontend/Gastos.html", Mercancia: "../../Mercancia/Frontend/Mercancia.html", Usuarios: "../../Usuarios/Frontend/Usuarios.html", Roles: "../../Roles/Frontend/Roles.html", Configuración: "../../Configuracion/Frontend/Configuracion.html" };
const labels = { Inicio: "Inicio", Articulos: "Artículos", Categorias: "Categorías", Clientes: "Clientes", Gastos: "Gastos", Mercancia: "Mercancía", Usuarios: "Usuarios", Roles: "Roles", Configuración: "Configuración" };
const icons = { Inicio: "fa-house", Articulos: "fa-boxes-stacked", Categorias: "fa-layer-group", Clientes: "fa-address-book", Gastos: "fa-receipt", Mercancia: "fa-truck-ramp-box", Usuarios: "fa-user", Roles: "fa-key", Configuración: "fa-gear" };
const menuGroups = [{ title: "OPERACIÓN", items: ["Inicio", "Articulos", "Categorias", "Clientes", "Gastos", "Mercancia"] }, { title: "ADMINISTRACIÓN", items: ["Usuarios", "Roles", "Configuración"] }];

function setVisible(element, visible) { element.hidden = !visible; element.style.setProperty("display", visible ? "block" : "none", "important"); }
function setActive(section) { document.querySelectorAll(".side-link").forEach(link => link.classList.toggle("active", link.dataset.section === section)); }
function showInicio() { setActive("Inicio"); setVisible(dashboard, true); setVisible(frame, false); frame.removeAttribute("src"); frame.classList.remove("active"); }
function showModule(section) { const route = routes[section]; if (!route) { showInicio(); return; } setActive(section); setVisible(dashboard, false); setVisible(frame, true); frame.classList.add("active"); frame.src = `${route}?v=${Date.now()}`; }

function buildNavigation() {
    const navigation = document.querySelector(".side-nav");
    if (!navigation) return;
    navigation.innerHTML = "";
    menuGroups.forEach(group => {
        const heading = document.createElement("small");
        heading.textContent = group.title;
        navigation.appendChild(heading);
        group.items.forEach(section => {
            const link = document.createElement("button");
            link.className = "side-link";
            link.dataset.section = section;
            link.type = "button";
            link.innerHTML = `<i class="fa-solid ${icons[section]}" aria-hidden="true"></i>${labels[section]}`;
            navigation.appendChild(link);
        });
    });
}

buildNavigation();

document.querySelectorAll(".side-link").forEach(link => {
    const section = link.dataset.section;
    const text = labels[section];
    const icon = link.querySelector("i");
    if (text && link.lastChild && link.lastChild.nodeType === 3) link.lastChild.textContent = text;
    if (icon && icons[section]) icon.className = `fa-solid ${icons[section]}`;
    link.addEventListener("click", () => section === "Inicio" ? showInicio() : showModule(section));
});

frame.addEventListener("load", () => {
    try {
        const doc = frame.contentDocument;
        if (!doc) return;
        doc.documentElement.style.height = "100%";
        doc.documentElement.style.overflowY = "auto";
        doc.documentElement.style.scrollbarWidth = "none";
        doc.body.style.minHeight = "100%";
        doc.body.style.overflowY = "auto";
        doc.body.style.overflowX = "hidden";
        doc.body.style.scrollbarWidth = "none";
        const style = doc.createElement("style");
        style.textContent = "html,body{scrollbar-width:none;-ms-overflow-style:none}::-webkit-scrollbar{width:0;height:0;display:none}";
        doc.head.appendChild(style);
    } catch (error) { console.warn("No se pudo preparar el módulo:", error); }
});

function renderBusinessIdentity(data = {}) {
    const name = String(data.nombreEmpresa || data.nombre || "").trim();
    const businessName = document.getElementById("businessName");
    const avatar = document.getElementById("businessInitial");
    if (!avatar) return;
    if (name && businessName) businessName.textContent = name;
    const previousImage = avatar.querySelector("img");
    if (previousImage) previousImage.remove();
    avatar.classList.remove("has-logo");
    avatar.textContent = (name.charAt(0) || avatar.textContent.trim().charAt(0) || "N").toUpperCase();
    if (data.logo) {
        const image = document.createElement("img");
        image.src = data.logo;
        image.alt = name ? `Logo de ${name}` : "Logo de la empresa";
        image.draggable = false;
        image.addEventListener("error", () => { image.remove(); avatar.classList.remove("has-logo"); avatar.textContent = (name.charAt(0) || "N").toUpperCase(); });
        avatar.textContent = "";
        avatar.appendChild(image);
        avatar.classList.add("has-logo");
    }
}

try { renderBusinessIdentity(JSON.parse(localStorage.getItem("Nodix_configuracion_empresa_v1") || "{}")); } catch { /* La navegación conserva la identidad por defecto. */ }
window.addEventListener("storage", event => { if (event.key !== "Nodix_configuracion_empresa_v1") return; try { renderBusinessIdentity(JSON.parse(event.newValue || "{}")); } catch { renderBusinessIdentity(); } });
window.addEventListener("message", event => { if (event.data && event.data.type === "nodix-company-updated") renderBusinessIdentity(event.data.payload || {}); });

showInicio();

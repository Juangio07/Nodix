"use strict";

const frame = document.getElementById("moduleFrame");
const dashboard = document.getElementById("dashboard");
const routes = { Ventas: "../../Ventas/Frontend/Ventas.html", Articulos: "../../Articulos/Frontend/Articulos.html", Categorias: "../../Categorias/Frontend/Categorias.html", Clientes: "../../Clientes/Frontend/Clientes.html", Gastos: "../../Gastos/Frontend/Gastos.html", Mercancia: "../../Mercancia/Frontend/Mercancia.html", Estadisticas: "../../Estadisticas/Frontend/Estadisticas.html", Usuarios: "../../Usuarios/Frontend/Usuarios.html", Roles: "../../Roles/Frontend/Roles.html", Configuración: "../../Configuracion/Frontend/Configuracion.html" };
const labels = { Inicio: "Inicio", Ventas: "Ventas", Articulos: "Artículos", Categorias: "Categorías", Clientes: "Clientes", Gastos: "Gastos", Mercancia: "Mercancía", Estadisticas: "Estadísticas", Usuarios: "Usuarios", Roles: "Roles", Configuración: "Configuración" };
const icons = { Inicio: "fa-house", Ventas: "fa-receipt", Articulos: "fa-boxes-stacked", Categorias: "fa-layer-group", Clientes: "fa-address-book", Gastos: "fa-money-bill-wave", Mercancia: "fa-truck-ramp-box", Estadisticas: "fa-chart-line", Usuarios: "fa-user", Roles: "fa-key", Configuración: "fa-gear" };
const menuGroups = [{ title: "VISTA GENERAL", items: ["Inicio"] }, { title: "OPERACIÓN", items: ["Ventas", "Clientes"] }, { title: "INVENTARIO", items: ["Articulos", "Categorias", "Mercancia"] }, { title: "FINANZAS", items: ["Gastos"] }, { title: "ANÁLISIS", items: ["Estadisticas"] }, { title: "ADMINISTRACIÓN", items: ["Usuarios", "Roles", "Configuración"] }];
const normalizeSearch = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function setVisible(element, visible) { element.hidden = !visible; element.style.setProperty("display", visible ? "block" : "none", "important"); }
function setActive(section) { document.querySelectorAll(".side-link").forEach(link => { const active = link.dataset.section === section; link.classList.toggle("active", active); link.setAttribute("aria-current", active ? "page" : "false"); }); }
function showInicio() { setActive("Inicio"); setVisible(dashboard, true); setVisible(frame, false); frame.removeAttribute("src"); frame.classList.remove("active"); }
function showModule(section, params = "") { const route = routes[section]; if (!route) { showInicio(); return; } setActive(section); setVisible(dashboard, false); setVisible(frame, true); frame.classList.add("active"); const query = params ? `${params}&` : ""; frame.src = `${route}?${query}v=${Date.now()}`; }

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
            link.setAttribute("aria-label", labels[section]);
            link.innerHTML = `<i class="fa-solid ${icons[section]}" aria-hidden="true"></i><span class="side-link-label">${labels[section]}</span>`;
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
        doc.documentElement.style.minHeight = "100%";
        doc.documentElement.style.overflowY = "auto";
        doc.documentElement.style.scrollbarWidth = "none";
        doc.body.style.height = "auto";
        doc.body.style.minHeight = "100%";
        doc.body.style.overflowY = "auto";
        doc.body.style.overflowX = "hidden";
        doc.body.style.scrollbarWidth = "none";
        const style = doc.createElement("style");
        style.textContent = "html,body{scrollbar-width:none;-ms-overflow-style:none}::-webkit-scrollbar{width:0;height:0;display:none}";
        doc.head.appendChild(style);
    } catch (error) { console.warn("No se pudo preparar el módulo:", error); }
});

const dashboardMoney = value => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value) || 0);
const dashboardNumber = value => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Number(value) || 0);
const dashboardSafe = value => String(value ?? "").replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[character]));
const dashboardDate = (date = new Date()) => { const copy = new Date(date); copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset()); return copy.toISOString().slice(0, 10); };
const dashboardShift = (date, amount) => { const copy = new Date(`${date}T12:00:00`); copy.setDate(copy.getDate() + amount); return dashboardDate(copy); };
const dashboardNumeric = (...values) => { for (const value of values) { const number = Number(String(value ?? "").replace(/[^0-9.-]/g, "")); if (Number.isFinite(number) && number !== 0) return number; } return 0; };
const dashboardKeys = ["Nodix_ventas_v2", "Nodix_ventas_v1", "Nodix_ventas", "Nodix_sales_v1", "Nodix_sales", "Nodix_mercancia_v2", "Nodix_mercancia_v1", "Nodix_articulos_v2", "Nodix_articulos_v1", "Nodix_categorias_v1", "Nodix_clientes_v1", "Nodix_gastos_v1", "Nodix_gastos"];

function dashboardRecordDate(value) {
    const raw = value && (value.fecha || value.fechaVenta || value.date || value.createdAt || value.created_at || value.timestamp);
    if (!raw) return "";
    if (typeof raw === "number") return dashboardDate(new Date(raw < 100000000000 ? raw * 1000 : raw));
    const text = String(raw).trim();
    const iso = text.match(/^\d{4}-\d{2}-\d{2}/);
    if (iso) return iso[0];
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? "" : dashboardDate(parsed);
}

function dashboardItems(sale) {
    const value = sale && (sale.items || sale.detalle || sale.detalles || sale.productos || sale.articulos || sale.lines || sale.lineas);
    return Array.isArray(value) ? value : [];
}

function loadDashboardData() {
    const scope = window.NodixBusinessScope;
    const inventory = window.NodixInventoryScope;
    const readScoped = (key, legacyKey) => scope?.readScoped?.(key, legacyKey)?.records || [];
    const categories = readScoped("Nodix_categorias_v1");
    const articles = readScoped("Nodix_articulos_v2", "Nodix_articulos_v1");
    const sales = inventory?.readSales?.() || readScoped("Nodix_ventas_v2", "Nodix_ventas_v1");
    const merchandise = inventory?.readMerchandise?.() || readScoped("Nodix_mercancia_v2", "Nodix_mercancia_v1");
    const expenses = readScoped("Nodix_gastos_v1", "Nodix_gastos");
    const categoryMap = Object.fromEntries(categories.map(category => [String(category.id || category.idCategoria || category.categoriaId), String(category.nombre || category.name || "Sin categoría")]));
    const articleMap = Object.fromEntries(articles.map(article => [String(article.id || article.codigo), article]));
    const normalizedSales = sales.map(sale => ({ ...sale, date: dashboardRecordDate(sale), total: dashboardNumeric(sale.total, sale.totalVenta, sale.valorTotal, sale.subtotal), items: dashboardItems(sale).map(line => ({ ...line, quantity: dashboardNumeric(line.cantidad, line.quantity, line.qty, line.unidades) || 1, amount: dashboardNumeric(line.subtotal, line.total, line.valorTotal, line.importe) || dashboardNumeric(line.precioVenta, line.precio, line.unitPrice) * (dashboardNumeric(line.cantidad, line.quantity, line.qty, line.unidades) || 1), price: dashboardNumeric(line.precioVenta, line.precio, line.unitPrice, line.valorUnitario), articleId: String(line.articuloId || line.articleId || line.idArticulo || line.productId || ""), code: String(line.codigo || line.code || ""), categoryId: String(line.categoriaId || line.categoryId || "") })) })).filter(sale => sale.date);
    normalizedSales.forEach(sale => { if (!sale.total) sale.total = sale.items.reduce((sum, line) => sum + line.amount, 0); });
    const normalizedExpenses = expenses.map(expense => ({ date: dashboardRecordDate(expense), value: dashboardNumeric(expense.valorTotal, expense.valor, expense.total, expense.amount) })).filter(expense => expense.date);
    const articleStock = articles.map(article => {
        const id = String(article.id || article.codigo || "");
        const code = String(article.codigo || "");
        const stock = inventory?.availableStock ? inventory.availableStock(id, code, merchandise, normalizedSales) : dashboardNumeric(article.stock);
        return { ...article, id, stock, estado: article.estado === "inactive" ? "inactive" : "active" };
    });
    return { categoryMap, articleMap, sales: normalizedSales, expenses: normalizedExpenses, articles: articleStock };
}

function renderDashboardData() {
    const data = loadDashboardData();
    const today = dashboardDate();
    const from = dashboardShift(today, -29);
    const todaySales = data.sales.filter(sale => sale.date === today);
    const periodSales = data.sales.filter(sale => sale.date >= from && sale.date <= today);
    const periodExpenses = data.expenses.filter(expense => expense.date >= from && expense.date <= today);
    const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const periodTotal = periodSales.reduce((sum, sale) => sum + sale.total, 0);
    const expenseTotal = periodExpenses.reduce((sum, expense) => sum + expense.value, 0);
    const stockTotal = data.articles.reduce((sum, article) => sum + article.stock, 0);
    const activeArticles = data.articles.filter(article => article.estado === "active");
    const availableReferences = activeArticles.filter(article => article.stock > 0).length;
    let grossProfit = 0;
    periodSales.forEach(sale => sale.items.forEach(line => {
        const article = data.articleMap[line.articleId] || data.articleMap[line.code] || {};
        const cost = dashboardNumeric(line.costo, line.cost, article.costo);
        grossProfit += Math.max(0, line.price - cost) * line.quantity;
    }));
    const margin = periodTotal ? Math.round((grossProfit / periodTotal) * 100) : 0;
    const setText = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value; };
    setText("dashboardReferences", `${dashboardNumber(availableReferences)} referencias sincronizadas`);
    setText("dashboardRevenue", `${dashboardMoney(todayTotal)} COP`);
    setText("dashboardRevenueHint", `${dashboardMoney(periodTotal)} en los últimos 30 días`);
    setText("dashboardRevenueChange", todayTotal ? "Registrado hoy" : "Sin ventas hoy");
    setText("dashboardTickets", `${dashboardNumber(todaySales.length)} transacciones`);
    setText("dashboardTicketAverage", dashboardMoney(todaySales.length ? todayTotal / todaySales.length : 0));
    setText("dashboardTicketChange", todaySales.length ? "Hoy" : "Sin tickets");
    setText("dashboardInventory", `${dashboardNumber(stockTotal)} uds en bodega`);
    setText("dashboardInventoryHint", `${dashboardNumber(activeArticles.length)} artículos activos`);
    setText("dashboardStockChange", `${dashboardNumber(activeArticles.filter(article => article.stock <= 0).length)} sin stock`);
    setText("dashboardMargin", `${margin}% margen.`);
    setText("dashboardMarginChange", periodTotal ? "30 días" : "Sin ventas");
    setText("dashboardNet", dashboardMoney(periodTotal - expenseTotal));
    const stockLine = document.getElementById("dashboardStockLine");
    if (stockLine) {
        const lowStock = activeArticles.filter(article => article.stock > 0 && article.stock <= 5).length;
        const withoutStock = activeArticles.filter(article => article.stock <= 0).length;
        const healthy = Math.max(0, activeArticles.length - lowStock - withoutStock);
        const total = Math.max(1, activeArticles.length);
        stockLine.innerHTML = `<i style="width:${healthy / total * 100}%"></i><i style="width:${lowStock / total * 100}%"></i><i style="width:${withoutStock / total * 100}%"></i>`;
    }
    const chartBars = document.getElementById("dashboardChartBars");
    const days = Array.from({ length: 7 }, (_, index) => dashboardShift(today, index - 6));
    const chartData = days.map(date => ({ date, value: data.sales.filter(sale => sale.date === date).reduce((sum, sale) => sum + sale.total, 0) }));
    const chartMax = Math.max(...chartData.map(item => item.value), 0);
    const revenueBars = document.getElementById("dashboardRevenueBars");
    if (revenueBars) revenueBars.innerHTML = chartData.map(item => `<i style="height:${chartMax ? Math.max(12, item.value / chartMax * 100) : 12}%"></i>`).join("");
    setText("dashboardAxisHigh", dashboardMoney(chartMax));
    setText("dashboardAxisMid", dashboardMoney(chartMax / 2));
    const peak = chartData.reduce((current, item) => item.value > current.value ? item : current, { value: 0, date: today });
    setText("dashboardPeak", peak.value ? `Mayor ingreso: ${peak.date} · ${dashboardMoney(peak.value)}` : "Sin ventas en el periodo");
    if (chartBars) chartBars.innerHTML = chartData.map((item, index) => `<i class="${item.value === peak.value && item.value > 0 ? "peak" : ""}" style="height:${chartMax ? Math.max(8, item.value / chartMax * 100) : 8}%"><b>${new Intl.DateTimeFormat("es-CO", { weekday: "short" }).format(new Date(`${item.date}T12:00:00`)).replace(".", "")}</b></i>`).join("");
    const mix = {};
    periodSales.flatMap(sale => sale.items).forEach(line => { const label = line.categoryId && data.categoryMap[line.categoryId] ? data.categoryMap[line.categoryId] : (data.articleMap[line.articleId]?.categoriaId && data.categoryMap[data.articleMap[line.articleId].categoriaId]) || "Sin categoría"; mix[label] = (mix[label] || 0) + line.amount; });
    const mixEntries = Object.entries(mix).sort((first, second) => second[1] - first[1]).slice(0, 3);
    const palette = ["#ffe500", "#ff9a3d", "#087f60"];
    const donut = document.getElementById("dashboardDonut");
    const mixList = document.getElementById("dashboardMixList");
    setText("dashboardMixTotal", periodTotal ? `${dashboardMoney(periodTotal)} 30 DÍAS` : "$ 0 SIN VENTAS");
    if (donut) donut.style.background = mixEntries.length && periodTotal ? `conic-gradient(${mixEntries.map(([label, value], index) => `${palette[index]} ${mixEntries.slice(0, index).reduce((sum, entry) => sum + entry[1], 0) / periodTotal * 100}% ${mixEntries.slice(0, index + 1).reduce((sum, entry) => sum + entry[1], 0) / periodTotal * 100}%`).join(",")})` : "conic-gradient(#eef1f5 0 100%)";
    if (mixList) mixList.innerHTML = mixEntries.map(([label, value], index) => `<div class="category"><i class="fa-solid fa-layer-group"></i><span><b>${dashboardSafe(label)}</b><small>Ventas del periodo</small></span><strong>${dashboardSafe(dashboardMoney(value))}<small>${Math.round(value / periodTotal * 100)}% PARTICIPACIÓN</small></strong></div>`).join("");
}

function showNodixInfo(title, message) {
    if (window.NodixAlert?.show) window.NodixAlert.show({ type: "info", title, message, confirmText: "Entendido" });
}

function findSection(query) {
    const normalized = normalizeSearch(query);
    if (!normalized) return "";
    return Object.keys(labels).find(section => normalizeSearch(labels[section]).includes(normalized) || normalizeSearch(section).includes(normalized)) || "";
}

const globalSearch = document.getElementById("globalSearch");
globalSearch?.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    const query = globalSearch.value.trim();
    if (!query) return;
    const section = findSection(query);
    if (!section) {
        showNodixInfo("Búsqueda de Nodix", "No encontramos un módulo que coincida con esa búsqueda.");
        return;
    }
    globalSearch.value = "";
    globalSearch.blur();
    section === "Inicio" ? showInicio() : showModule(section);
});

document.getElementById("notificationsButton")?.addEventListener("click", () => {
    showNodixInfo("Notificaciones", "No tienes notificaciones nuevas en este espacio de trabajo.");
});

document.querySelectorAll("[data-dashboard-action]").forEach(button => {
    button.addEventListener("click", () => {
        if (button.dataset.dashboardAction === "shift") { showModule("Estadisticas", "view=closure"); return; }
        if (button.dataset.dashboardAction === "period-tab") {
            document.querySelectorAll(".period-tabs button").forEach(tab => tab.classList.toggle("selected", tab === button));
            return;
        }
        const messages = {
            period: ["Periodo del dashboard", "El resumen actual muestra los últimos 30 días de operación."],
            export: ["Exportación", "La exportación estará disponible cuando conectemos el backend del negocio."],
            filters: ["Filtros del dashboard", "Los filtros avanzados se habilitarán con los reportes conectados al backend."],
            shift: ["Cierre de turno", "El cierre de turno se podrá gestionar cuando exista una caja operativa configurada."],
            reconciliation: ["Reconciliación", "La reconciliación estará disponible cuando se registren medios de pago y movimientos reales."],
            turns: ["Turnos", "La consulta de turnos estará disponible cuando se configure la operación de caja."]
        };
        const [title, message] = messages[button.dataset.dashboardAction] || ["Nodix", "Esta acción aún no tiene información disponible."];
        showNodixInfo(title, message);
    });
});

document.querySelector(".logout")?.addEventListener("click", async () => {
    const confirmed = window.NodixAlert?.confirm
        ? await window.NodixAlert.confirm({ type: "confirm", title: "¿Cerrar sesión?", message: "Volverás a la pantalla de acceso de Nodix.", confirmText: "Cerrar sesión" })
        : false;
    if (confirmed) window.location.replace("../../Acceso/Frontend/Acceso.html");
});

function renderBusinessIdentity(data = {}) {
    const name = String(data.nombreEmpresa || data.nombre || "").trim();
    const displayName = name || "Negocio demo";
    const businessName = document.getElementById("businessName");
    const avatar = document.getElementById("businessInitial");
    if (!avatar) return;
    if (businessName) businessName.textContent = displayName;
    const previousImage = avatar.querySelector("img");
    if (previousImage) previousImage.remove();
    avatar.classList.remove("has-logo");
    avatar.textContent = displayName.charAt(0).toUpperCase();
    if (data.logo) {
        const image = document.createElement("img");
        image.src = data.logo;
        image.alt = `Logo de ${displayName}`;
        image.draggable = false;
        image.addEventListener("error", () => { image.remove(); avatar.classList.remove("has-logo"); avatar.textContent = displayName.charAt(0).toUpperCase(); });
        avatar.textContent = "";
        avatar.appendChild(image);
        avatar.classList.add("has-logo");
    }
}

try { renderBusinessIdentity(JSON.parse(localStorage.getItem("Nodix_configuracion_empresa_v1") || "{}")); } catch { /* La navegación conserva la identidad por defecto. */ }
window.addEventListener("storage", event => {
    if (event.key === "Nodix_configuracion_empresa_v1") {
        try { renderBusinessIdentity(JSON.parse(event.newValue || "{}")); } catch { renderBusinessIdentity(); }
        renderDashboardData();
    }
    if (dashboardKeys.includes(event.key)) renderDashboardData();
});
window.addEventListener("message", event => { if (event.data && event.data.type === "nodix-company-updated") { renderBusinessIdentity(event.data.payload || {}); renderDashboardData(); } });

renderDashboardData();
showInicio();

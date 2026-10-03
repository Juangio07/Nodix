"use strict";

const ARTICLE_KEY = "Nodix_articulos_v2";
const ARTICLE_LEGACY_KEY = "Nodix_articulos_v1";
const CATEGORY_KEY = "Nodix_categorias_v1";
const CLIENT_KEY = "Nodix_clientes_v2";
const CLIENT_LEGACY_KEY = "Nodix_clientes_v1";
const SALE_KEY = "Nodix_ventas_v2";
const SALE_LEGACY_KEY = "Nodix_ventas_v1";
const scopeApi = window.NodixBusinessScope;
const inventoryApi = window.NodixInventoryScope;
const currencyApi = window.NodixCurrencyInput;

const productSearch = document.getElementById("productSearch");
const categorySelect = document.getElementById("categorySelect");
const productSelect = document.getElementById("productSelect");
const productPreview = document.getElementById("productPreview");
const productEmpty = document.getElementById("productEmpty");
const productQuantity = document.getElementById("productQuantity");
const addProduct = document.getElementById("addProduct");
const productMessage = document.getElementById("productMessage");
const cartRows = document.getElementById("cartRows");
const cartEmpty = document.getElementById("cartEmpty");
const clientSelect = document.getElementById("clientSelect");
const confirmSale = document.getElementById("confirmSale");
const formMessage = document.getElementById("formMessage");
const toast = document.getElementById("toast");
let business = scopeApi.getBusiness();
let categories = [];
let articles = [];
let clients = [];
let sales = [];
let cart = [];
let selectedCategoryId = "";
let selectedArticleId = "";
let toastTimer;

function safe(value) { return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[character])); }
function money(value) { const amount = Number(value) || 0; return amount > 0 ? currencyApi.format(amount) : "$ 0"; }
function number(value) { return new Intl.NumberFormat("es-CO").format(Number(value) || 0); }
function localDate() { const date = new Date(); const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10); }
function dateLabel(value) { if (!value) return "Sin fecha"; const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }); }
function newId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function records(key, legacyKey) {
    const scoped = scopeApi.readScoped(key, legacyKey).records;
    if (scoped.length) return scoped;
    try {
        const raw = JSON.parse(localStorage.getItem(key) || "null");
        return Array.isArray(raw) ? raw : [];
    } catch { return []; }
}
function categoryName(id) { const category = categories.find(item => item.id === String(id)); return category ? category.nombre : "Sin categoría"; }
function normalizeArticle(item) { return { id: String(item.id || item.codigo || newId("ART")), codigo: String(item.codigo || "").trim(), descripcion: String(item.descripcion || item.nombre || "").trim(), categoriaId: String(item.categoriaId || ""), precioVenta: Number(item.precioVenta || item.precio || 0) || 0, costo: Number(item.costo || 0) || 0, estado: item.estado === "inactive" ? "inactive" : "active" }; }
function normalizeClient(item) { return { id: String(item.id || item.documento || newId("CLI")), documento: String(item.documento || "").trim(), nombre: String(item.nombre || "").trim(), telefono: String(item.telefono || "").trim(), estado: item.estado === "inactive" ? "inactive" : "active" }; }
function normalizeSale(item) { const lines = item.items || item.detalle || item.detalles || item.productos || item.articulos || item.lines || item.lineas || []; const normalizedLines = Array.isArray(lines) ? lines.map(line => ({ articuloId: String(line.articuloId || line.articleId || line.idArticulo || line.productId || ""), codigo: String(line.codigo || line.code || ""), descripcion: String(line.descripcion || line.nombre || line.description || ""), cantidad: Number(line.cantidad || line.quantity || line.qty || 0) || 0, precioVenta: Number(line.precioVenta || line.precio || line.unitPrice || line.valorUnitario || 0) || 0, subtotal: Number(line.subtotal || line.total || 0) || 0 })) : []; return { id: String(item.id || item.numero || newId("VEN")), numero: String(item.numero || item.numeroFactura || item.codigo || "Venta"), tipo: String(item.tipo || item.tipoFactura || "Venta de mostrador"), fecha: String(item.fecha || item.createdAt || localDate()).slice(0, 10), clienteId: String(item.clienteId || item.clientId || ""), clienteNombre: String(item.clienteNombre || item.clientName || "Consumidor final"), metodoPago: String(item.metodoPago || item.paymentMethod || "Efectivo"), items: normalizedLines, subtotal: Number(item.subtotal || item.total || 0) || 0, total: Number(item.total || item.valorTotal || item.subtotal || 0) || 0, estado: String(item.estado || "completed") }; }

function reloadData() {
    business = scopeApi.getBusiness();
    categories = records(CATEGORY_KEY).map(item => ({ id: String(item.id || ""), nombre: String(item.nombre || "").trim(), estado: item.estado === "inactive" ? "inactive" : "active" }));
    const merchandise = inventoryApi.readMerchandise();
    const storedSales = inventoryApi.readSales();
    articles = records(ARTICLE_KEY, ARTICLE_LEGACY_KEY).map(normalizeArticle).map(article => ({ ...article, stock: inventoryApi.availableStock(article.id, article.codigo, merchandise, storedSales) }));
    clients = records(CLIENT_KEY, CLIENT_LEGACY_KEY).map(normalizeClient).filter(client => client.estado === "active");
    sales = records(SALE_KEY, SALE_LEGACY_KEY).map(normalizeSale).sort((first, second) => String(second.fecha).localeCompare(String(first.fecha)));
}

function renderCategoryOptions() {
    const activeCategories = categories.filter(category => category.estado === "active");
    categorySelect.innerHTML = `<option value="">${activeCategories.length ? "Selecciona una categoría" : "No hay categorías activas"}</option>${activeCategories.map(category => `<option value="${safe(category.id)}">${safe(category.nombre || "Sin nombre")}</option>`).join("")}`;
    categorySelect.value = selectedCategoryId;
    categorySelect.disabled = !activeCategories.length;
}

function renderProductOptions() {
    const query = productSearch.value.trim().toLowerCase();
    const activeArticles = articles.filter(article => article.estado === "active" && article.categoriaId === selectedCategoryId && `${article.codigo} ${article.descripcion}`.toLowerCase().includes(query));
    const categoryReady = Boolean(selectedCategoryId);
    productSearch.disabled = !categoryReady;
    productSearch.placeholder = categoryReady ? "Escribe código o descripción..." : "Selecciona una categoría primero...";
    productSelect.innerHTML = `<option value="">${!categoryReady ? "Primero selecciona una categoría" : activeArticles.length ? "Selecciona un artículo" : "No hay artículos en esta categoría"}</option>${activeArticles.map(article => `<option value="${safe(article.id)}" ${article.stock <= 0 ? "disabled" : ""}>${safe(article.codigo || "Sin código")} · ${safe(article.descripcion || "Sin descripción")} · ${money(article.precioVenta)} · ${number(article.stock)} disp.</option>`).join("")}`;
    if (selectedArticleId && activeArticles.some(article => article.id === selectedArticleId && article.stock > 0)) productSelect.value = selectedArticleId;
    else { selectedArticleId = ""; productSelect.value = ""; }
    document.getElementById("availableReferences").textContent = articles.filter(article => article.estado === "active" && article.stock > 0).length;
    const availableInCategory = activeArticles.some(article => article.stock > 0);
    productEmpty.hidden = !categoryReady || availableInCategory;
    if (categoryReady && !activeArticles.length) productEmpty.innerHTML = '<i class="fa-solid fa-box-open" aria-hidden="true"></i><strong>Esta categoría aún no tiene artículos</strong><span>Crea un artículo desde el módulo Artículos y asígnalo a esta categoría.</span>';
    else if (categoryReady && !availableInCategory) productEmpty.innerHTML = '<i class="fa-solid fa-boxes-stacked" aria-hidden="true"></i><strong>Sin stock disponible</strong><span>Registra mercancía para los artículos de esta categoría antes de venderlos.</span>';
    productSelect.disabled = !categoryReady || !activeArticles.length;
    renderSelectedProduct();
}

function renderSelectedProduct() {
    const article = articles.find(item => item.id === selectedArticleId);
    productMessage.textContent = "";
    if (!article) { productPreview.hidden = true; return; }
    productPreview.hidden = false;
    document.getElementById("selectedProductName").textContent = article.descripcion || "Sin descripción";
    document.getElementById("selectedProductMeta").textContent = `${article.codigo || "Sin código"} · ${categoryName(article.categoriaId)}`;
    document.getElementById("selectedProductPrice").textContent = money(article.precioVenta);
    document.getElementById("selectedProductStock").textContent = `${number(article.stock)} und.`;
    productQuantity.max = String(article.stock);
    productQuantity.value = Math.min(Math.max(Number(productQuantity.value) || 1, 1), Math.max(article.stock, 1));
    addProduct.disabled = article.stock <= 0 || article.precioVenta <= 0;
}

function renderClients() { const current = clientSelect.value; clientSelect.innerHTML = `<option value="">Consumidor final</option>${clients.map(client => `<option value="${safe(client.id)}">${safe(client.nombre || "Cliente sin nombre")} · ${safe(client.documento || "sin documento")}</option>`).join("")}`; if (clients.some(client => client.id === current)) clientSelect.value = current; }
function lineQuantity(articleId) { return cart.find(line => line.articuloId === articleId)?.cantidad || 0; }
function renderCart() {
    const totalItems = cart.reduce((sum, line) => sum + line.cantidad, 0);
    const subtotal = cart.reduce((sum, line) => sum + line.subtotal, 0);
    document.getElementById("cartCount").textContent = `${number(totalItems)} ${totalItems === 1 ? "producto" : "productos"}`;
    document.getElementById("summaryItems").textContent = number(totalItems);
    document.getElementById("summarySubtotal").textContent = money(subtotal);
    document.getElementById("summaryTotal").textContent = money(subtotal);
    confirmSale.disabled = cart.length === 0;
    cartEmpty.hidden = cart.length > 0;
    cartRows.innerHTML = cart.map(line => `<tr><td><div class="cart-product"><strong>${safe(line.descripcion || "Sin descripción")}</strong><small>${safe(line.codigo || "Sin código")} · ${safe(categoryName(line.categoriaId))}</small></div></td><td>${money(line.precioVenta)}</td><td><div class="quantity-control"><button type="button" data-action="decrease" data-id="${safe(line.articuloId)}" aria-label="Disminuir cantidad"><i class="fa-solid fa-minus" aria-hidden="true"></i></button><span>${number(line.cantidad)}</span><button type="button" data-action="increase" data-id="${safe(line.articuloId)}" aria-label="Aumentar cantidad"><i class="fa-solid fa-plus" aria-hidden="true"></i></button></div></td><td>${money(line.subtotal)}</td><td><button class="remove-line" type="button" data-action="remove" data-id="${safe(line.articuloId)}" aria-label="Quitar producto" title="Quitar producto"><i class="fa-solid fa-trash" aria-hidden="true"></i></button></td></tr>`).join("");
}

function renderRecentSales() {
    const recent = sales.slice(0, 5);
    document.getElementById("salesCount").textContent = `${sales.length} ${sales.length === 1 ? "registro" : "registros"}`;
    document.getElementById("recentEmpty").hidden = recent.length > 0;
    document.getElementById("recentSales").innerHTML = recent.map(sale => `<div class="recent-item"><div><strong>${safe(sale.numero)}</strong><small>${safe(dateLabel(sale.fecha))} · ${safe(sale.tipo)}</small></div><div><strong>${safe(sale.clienteNombre || "Consumidor final")}</strong><small>${number(sale.items.reduce((sum, line) => sum + line.cantidad, 0))} productos · ${safe(sale.metodoPago)}</small></div><strong class="recent-total">${money(sale.total)}</strong><span class="recent-status">Confirmada</span></div>`).join("");
}

function resetInvoice() { cart = []; selectedCategoryId = ""; selectedArticleId = ""; productSearch.value = ""; productQuantity.value = "1"; productMessage.textContent = ""; formMessage.textContent = ""; clientSelect.value = ""; document.getElementById("invoiceType").value = "Venta de mostrador"; document.getElementById("paymentMethod").value = "Efectivo"; document.getElementById("invoiceNumber").textContent = "Nueva"; renderCategoryOptions(); renderProductOptions(); renderCart(); }
function addSelectedProduct() {
    const article = articles.find(item => item.id === selectedArticleId);
    const quantity = Math.floor(Number(productQuantity.value) || 0);
    if (!article) { productMessage.textContent = "Selecciona un artículo para continuar."; return; }
    if (article.precioVenta <= 0) { productMessage.textContent = "Este artículo todavía no tiene un precio de venta configurado."; return; }
    const existingQuantity = lineQuantity(article.id);
    if (quantity < 1) { productMessage.textContent = "La cantidad debe ser de al menos una unidad."; return; }
    if (existingQuantity + quantity > article.stock) { productMessage.textContent = `Solo hay ${number(article.stock - existingQuantity)} unidades disponibles para agregar.`; return; }
    const existing = cart.find(line => line.articuloId === article.id);
    if (existing) { existing.cantidad += quantity; existing.subtotal = existing.cantidad * existing.precioVenta; }
    else cart.push({ articuloId: article.id, codigo: article.codigo, descripcion: article.descripcion, categoriaId: article.categoriaId, cantidad: quantity, precioVenta: article.precioVenta, costo: article.costo, subtotal: quantity * article.precioVenta });
    productMessage.textContent = ""; productQuantity.value = "1"; renderCart(); showToast(`${article.descripcion || "Artículo"} agregado a la factura`);
}

function handleCartAction(event) {
    const button = event.target.closest("button[data-action]"); if (!button) return;
    const line = cart.find(item => item.articuloId === button.dataset.id); if (!line) return;
    const article = articles.find(item => item.id === line.articuloId);
    if (button.dataset.action === "increase") { if (article && line.cantidad < article.stock) line.cantidad += 1; else { formMessage.textContent = "No hay más unidades disponibles para este artículo."; return; } }
    if (button.dataset.action === "decrease") line.cantidad -= 1;
    if (button.dataset.action === "remove" || line.cantidad <= 0) cart = cart.filter(item => item.articuloId !== line.articuloId);
    else line.subtotal = line.cantidad * line.precioVenta;
    formMessage.textContent = ""; renderCart();
}

function persistSale() {
    const selectedClient = clients.find(client => client.id === clientSelect.value);
    const subtotal = cart.reduce((sum, line) => sum + line.subtotal, 0);
    const nextNumber = String(sales.length + 1).padStart(4, "0");
    const sale = { id: newId("VEN"), numero: `FAC-${new Date().getFullYear()}-${nextNumber}`, negocioId: business.id, negocioNombre: business.name, tipo: document.getElementById("invoiceType").value, fecha: localDate(), fechaHora: new Date().toISOString(), clienteId: selectedClient ? selectedClient.id : "", clienteNombre: selectedClient ? selectedClient.nombre : "Consumidor final", metodoPago: document.getElementById("paymentMethod").value, items: cart.map(line => ({ ...line })), subtotal, total: subtotal, estado: "completed" };
    const stored = [...sales, sale];
    scopeApi.writeScoped(SALE_KEY, stored);
    sales = [sale, ...sales];
    return sale;
}

function confirmCurrentSale() {
    formMessage.textContent = "";
    if (!cart.length) { formMessage.textContent = "Agrega al menos un producto a la factura."; return; }
    reloadData();
    const unavailable = cart.find(line => { const article = articles.find(item => item.id === line.articuloId); return !article || article.stock < line.cantidad; });
    if (unavailable) { formMessage.textContent = `La cantidad disponible cambió para ${unavailable.descripcion}. Revisa la factura antes de confirmar.`; renderProductOptions(); renderCart(); return; }
    const sale = persistSale();
    reloadData();
    resetInvoice();
    renderClients();
    renderRecentSales();
    showToast(`${sale.numero} confirmada correctamente`);
}

function showToast(text) { clearTimeout(toastTimer); toast.textContent = text; toast.classList.add("show"); toastTimer = setTimeout(() => toast.classList.remove("show"), 2500); }

categorySelect.addEventListener("change", () => { selectedCategoryId = categorySelect.value; selectedArticleId = ""; productSearch.value = ""; productQuantity.value = "1"; productMessage.textContent = ""; renderProductOptions(); });
productSearch.addEventListener("input", renderProductOptions);
productSelect.addEventListener("change", () => { selectedArticleId = productSelect.value; productQuantity.value = "1"; renderSelectedProduct(); });
productQuantity.addEventListener("input", () => { const article = articles.find(item => item.id === selectedArticleId); if (article) productQuantity.value = String(Math.min(Math.max(Math.floor(Number(productQuantity.value) || 1), 1), Math.max(article.stock, 1))); });
addProduct.addEventListener("click", addSelectedProduct);
cartRows.addEventListener("click", handleCartAction);
confirmSale.addEventListener("click", confirmCurrentSale);
document.getElementById("clearSale").addEventListener("click", () => { if (!cart.length || window.confirm("¿Limpiar los productos de la factura actual?")) resetInvoice(); });
document.getElementById("newSale").addEventListener("click", resetInvoice);

reloadData();
renderClients();
renderCategoryOptions();
renderProductOptions();
renderCart();
renderRecentSales();

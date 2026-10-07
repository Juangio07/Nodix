"use strict";

const ARTICLE_KEY = "Nodix_articulos_v2";
const ARTICLE_LEGACY_KEY = "Nodix_articulos_v1";
const CATEGORY_KEY = "Nodix_categorias_v1";
// Clientes.js guarda los registros en v1. Ventas debe leer la misma fuente
// para que el selector de clientes muestre exactamente los registros creados
// desde el módulo Clientes, manteniendo compatibilidad con una versión previa.
const CLIENT_KEY = "Nodix_clientes_v1";
const CLIENT_LEGACY_KEY = "Nodix_clientes_v2";
const SALE_KEY = "Nodix_ventas_v2";
const SALE_LEGACY_KEY = "Nodix_ventas_v1";
const RETURN_KEY = "Nodix_devoluciones_v1";
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
const newSaleView = document.getElementById("newSaleView");
const historyView = document.getElementById("historyView");
const historySearch = document.getElementById("salesHistorySearch");
const historyStartDate = document.getElementById("historyStartDate");
const historyEndDate = document.getElementById("historyEndDate");
const historyStatus = document.getElementById("historyStatus");
const historyPayment = document.getElementById("historyPayment");
const historyRows = document.getElementById("salesHistoryRows");
const historyEmpty = document.getElementById("salesHistoryEmpty");
const saleDetailDialog = document.getElementById("saleDetailDialog");
const returnDialog = document.getElementById("returnDialog");
const returnForm = document.getElementById("returnForm");
const returnItems = document.getElementById("returnItems");
const returnCategorySelect = document.getElementById("returnCategorySelect");
const returnProductSelect = document.getElementById("returnProductSelect");
const returnProductQuantity = document.getElementById("returnProductQuantity");
const replacementList = document.getElementById("replacementList");
const returnTypeFields = document.querySelectorAll('input[name="returnType"]');
let business = scopeApi.getBusiness();
let categories = [];
let articles = [];
let clients = [];
let sales = [];
let returns = [];
let cart = [];
let selectedCategoryId = "";
let selectedArticleId = "";
let activeSaleForReturn = null;
let replacementCart = [];
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
function normalizeArticle(item) { return { id: String(item.id || item.codigo || newId("ART")), codigo: String(item.codigo || item.code || "").trim(), descripcion: String(item.descripcion || item.nombre || item.name || "").trim(), categoriaId: String(item.categoriaId || item.categoryId || item.idCategoria || item.category || "").trim(), precioVenta: Number(item.precioVenta || item.precio || item.salePrice || 0) || 0, costo: Number(item.costo || item.cost || 0) || 0, estado: item.estado === "inactive" ? "inactive" : "active" }; }
function normalizeClient(item) { return { id: String(item.id || item.documento || newId("CLI")), documento: String(item.documento || "").trim(), nombre: String(item.nombre || "").trim(), telefono: String(item.telefono || "").trim(), estado: item.estado === "inactive" ? "inactive" : "active" }; }
function normalizeSale(item) { const lines = item.items || item.detalle || item.detalles || item.productos || item.articulos || item.lines || item.lineas || []; const normalizedLines = Array.isArray(lines) ? lines.map(line => { const cantidad = Number(line.cantidad || line.quantity || line.qty || 0) || 0; const precioVenta = Number(line.precioVenta || line.precio || line.unitPrice || line.valorUnitario || 0) || 0; return { articuloId: String(line.articuloId || line.articleId || line.idArticulo || line.productId || ""), codigo: String(line.codigo || line.code || ""), descripcion: String(line.descripcion || line.nombre || line.description || ""), categoriaId: String(line.categoriaId || line.categoryId || ""), categoriaNombre: String(line.categoriaNombre || line.categoryName || ""), cantidad, precioVenta, subtotal: Number(line.subtotal || line.total || 0) || precioVenta * cantidad }; }) : []; return { id: String(item.id || item.numero || newId("VEN")), negocioId: String(item.negocioId || item.businessId || business.id), negocioNombre: String(item.negocioNombre || item.businessName || business.name), numero: String(item.numero || item.numeroFactura || item.codigo || "Venta"), tipo: String(item.tipo || item.tipoFactura || "Venta de mostrador"), fecha: String(item.fecha || item.createdAt || localDate()).slice(0, 10), fechaHora: String(item.fechaHora || item.createdAt || ""), clienteId: String(item.clienteId || item.clientId || ""), clienteNombre: String(item.clienteNombre || item.clientName || "Consumidor final"), clienteDocumento: String(item.clienteDocumento || item.clientDocument || ""), clienteTelefono: String(item.clienteTelefono || item.clientPhone || ""), usuarioId: String(item.usuarioId || item.userId || ""), usuarioNombre: String(item.usuarioNombre || item.userName || "Administrador"), metodoPago: String(item.metodoPago || item.paymentMethod || "Efectivo"), items: normalizedLines, subtotal: Number(item.subtotal || item.total || 0) || 0, total: Number(item.total || item.valorTotal || item.subtotal || 0) || 0, estado: String(item.estado || "completed") }; }
function normalizeReturn(item) { const normalizeLine = line => { const quantity = Number(line.cantidad || line.quantity || line.qty || 0) || 0; const price = Number(line.precioVenta || line.precio || line.unitPrice || line.valorUnitario || 0) || 0; return { articuloId: String(line.articuloId || line.articleId || line.idArticulo || line.productId || ""), codigo: String(line.codigo || line.code || ""), descripcion: String(line.descripcion || line.nombre || line.description || ""), categoriaId: String(line.categoriaId || line.categoryId || ""), categoriaNombre: String(line.categoriaNombre || line.categoryName || ""), cantidad: quantity, precioVenta: price, subtotal: Number(line.subtotal || line.total || 0) || price * quantity }; }; return { id: String(item.id || newId("DEV")), negocioId: String(item.negocioId || item.businessId || business.id), ventaId: String(item.ventaId || item.saleId || ""), ventaNumero: String(item.ventaNumero || item.saleNumber || ""), fecha: String(item.fecha || item.createdAt || localDate()).slice(0, 10), fechaHora: String(item.fechaHora || item.createdAt || ""), motivo: String(item.motivo || item.reason || ""), detalleMotivo: String(item.detalleMotivo || item.reasonDetail || ""), tipo: String(item.tipo || item.type || "refund"), estado: String(item.estado || item.status || "completed"), source: String(item.source || item.refundSource || ""), amount: Number(item.amount || item.monto || item.valor || 0) || 0, difference: Number(item.difference || item.diferencia || 0) || 0, paymentMethod: String(item.paymentMethod || item.metodoPago || ""), items: Array.isArray(item.items || item.returnedItems || item.productosDevueltos) ? (item.items || item.returnedItems || item.productosDevueltos).map(normalizeLine) : [], replacementItems: Array.isArray(item.replacementItems || item.itemsEntregados || item.productosCambio) ? (item.replacementItems || item.itemsEntregados || item.productosCambio).map(normalizeLine) : [] }; }

function reloadData() {
    business = scopeApi.getBusiness();
    categories = records(CATEGORY_KEY).map(item => ({ id: String(item.id || item.idCategoria || item.categoriaId || "").trim(), nombre: String(item.nombre || item.name || "").trim(), estado: item.estado === "inactive" ? "inactive" : "active" }));
    const merchandise = inventoryApi.readMerchandise();
    const storedSales = inventoryApi.readSales();
    articles = records(ARTICLE_KEY, ARTICLE_LEGACY_KEY).map(normalizeArticle).map(article => ({ ...article, stock: inventoryApi.availableStock(article.id, article.codigo, merchandise, storedSales) }));
    clients = records(CLIENT_KEY, CLIENT_LEGACY_KEY).map(normalizeClient).filter(client => client.estado === "active");
    sales = records(SALE_KEY, SALE_LEGACY_KEY).map(normalizeSale).map(sale => {
        // Completa ventas antiguas que todavía no guardaban el documento o
        // teléfono del cliente, sin alterar los datos ya congelados de la venta.
        const client = clients.find(item => item.id === sale.clienteId);
        return { ...sale, clienteDocumento: sale.clienteDocumento || client?.documento || "", clienteTelefono: sale.clienteTelefono || client?.telefono || "", clienteNombre: sale.clienteNombre === "Consumidor final" && client ? client.nombre : sale.clienteNombre };
    }).sort((first, second) => String(second.fecha).localeCompare(String(first.fecha)));
    returns = records(RETURN_KEY).map(normalizeReturn);
}

function renderCategoryOptions() {
    const activeCategories = categories.filter(category => category.estado === "active");
    categorySelect.innerHTML = `<option value="">${activeCategories.length ? "Selecciona una categoría" : "No hay categorías activas"}</option>${activeCategories.map(category => `<option value="${safe(category.id)}">${safe(category.nombre || "Sin nombre")}</option>`).join("")}`;
    categorySelect.value = selectedCategoryId;
    categorySelect.disabled = !activeCategories.length;
}

function renderProductOptions() {
    const query = productSearch.value.trim().toLowerCase();
    const activeArticles = articles.filter(article => article.estado === "active" && String(article.categoriaId).trim() === String(selectedCategoryId).trim() && `${article.codigo} ${article.descripcion}`.toLowerCase().includes(query));
    const categoryReady = Boolean(selectedCategoryId);
    productSearch.disabled = !categoryReady;
    productSearch.placeholder = categoryReady ? "Escribe código o descripción..." : "Selecciona una categoría primero...";
    const articleOptions = activeArticles.map(article => {
        const stockLabel = article.stock > 0 ? `${number(article.stock)} disp.` : "Sin stock";
        return `<option value="${safe(article.id)}">${safe(article.codigo || "Sin código")} · ${safe(article.descripcion || "Sin descripción")} · ${money(article.precioVenta)} · ${stockLabel}</option>`;
    }).join("");
    productSelect.innerHTML = `<option value="">${!categoryReady ? "Primero selecciona una categoría" : activeArticles.length ? "Selecciona un artículo" : "No hay artículos en esta categoría"}</option>${articleOptions}`;
    if (selectedArticleId && activeArticles.some(article => article.id === selectedArticleId)) productSelect.value = selectedArticleId;
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
    if (!article) {
        productPreview.hidden = false;
        productPreview.classList.add("is-empty");
        document.getElementById("selectedProductName").textContent = "";
        document.getElementById("selectedProductMeta").textContent = "";
        document.getElementById("selectedProductPrice").textContent = "—";
        document.getElementById("selectedProductStock").textContent = "—";
        productQuantity.value = "";
        productQuantity.removeAttribute("max");
        productQuantity.disabled = true;
        addProduct.disabled = true;
        return;
    }
    productPreview.hidden = false;
    productPreview.classList.remove("is-empty");
    document.getElementById("selectedProductName").textContent = article.descripcion || "Sin descripción";
    document.getElementById("selectedProductMeta").textContent = `${article.codigo || "Sin código"} · ${categoryName(article.categoriaId)}`;
    document.getElementById("selectedProductPrice").textContent = money(article.precioVenta);
    document.getElementById("selectedProductStock").textContent = `${number(article.stock)} und.`;
    productQuantity.max = String(article.stock);
    productQuantity.value = Math.min(Math.max(Number(productQuantity.value) || 1, 1), Math.max(article.stock, 1));
    productQuantity.disabled = false;
    // El botón debe seguir disponible sin stock para que la validación
    // muestre la alerta Nodix al presionarlo.
    addProduct.disabled = false;
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
    document.getElementById("recentSales").innerHTML = recent.map(sale => `<button class="recent-item" type="button" data-sale-id="${safe(sale.id)}"><span><strong>${safe(sale.numero)}</strong><small>${safe(dateLabel(sale.fecha))} · ${safe(sale.tipo)}</small></span><span><strong>${safe(sale.clienteNombre || "Consumidor final")}</strong><small>${number(sale.items.reduce((sum, line) => sum + line.cantidad, 0))} productos · ${safe(sale.metodoPago)}</small></span><strong class="recent-total">${money(sale.total)}</strong><span class="recent-status ${saleStatus(sale)}">${statusLabel(sale)}</span></button>`).join("");
}

function completedReturnsForSale(saleId) { return returns.filter(item => item.ventaId === String(saleId) && !["pending", "pendiente", "rejected", "rechazada", "cancelled", "cancelada"].includes(String(item.estado || "completed").toLowerCase())); }
function returnedQuantity(saleId, articleId, articleCode) { return completedReturnsForSale(saleId).reduce((sum, item) => sum + item.items.filter(line => String(line.articuloId) === String(articleId) || (!line.articuloId && String(line.codigo).toLowerCase() === String(articleCode || "").toLowerCase())).reduce((total, line) => total + line.cantidad, 0), 0); }
function returnableLines(sale) { return sale.items.map(line => ({ ...line, returned: returnedQuantity(sale.id, line.articuloId, line.codigo), returnable: Math.max(0, line.cantidad - returnedQuantity(sale.id, line.articuloId, line.codigo)) })).filter(line => line.returnable > 0); }
function saleReturnSummary(sale) { const lines = sale.items; const total = lines.reduce((sum, line) => sum + line.cantidad, 0); const returned = lines.reduce((sum, line) => sum + returnedQuantity(sale.id, line.articuloId, line.codigo), 0); return { total, returned, remaining: Math.max(0, total - returned) }; }

function saleStatus(sale) {
    const value = String(sale.estado || "completed").toLowerCase();
    if (["cancelled", "canceled", "anulada", "anulado"].includes(value)) return "cancelled";
    if (["pending", "pendiente"].includes(value)) return "pending";
    if (["returned", "devuelta", "devuelto"].includes(value)) return "returned";
    if (["partial_returned", "devolución parcial", "devolucion parcial"].includes(value)) return "partial_returned";
    const summary = saleReturnSummary(sale);
    if (summary.returned > 0 && summary.remaining === 0) return "returned";
    if (summary.returned > 0) return "partial_returned";
    return "completed";
}

function statusLabel(sale) {
    const status = saleStatus(sale);
    return status === "cancelled" ? "Anulada" : status === "pending" ? "Pendiente" : status === "returned" ? "Devuelta" : status === "partial_returned" ? "Devolución parcial" : "Confirmada";
}

function formatDateTime(sale) {
    if (!sale.fechaHora) return dateLabel(sale.fecha);
    const date = new Date(sale.fechaHora);
    return Number.isNaN(date.getTime()) ? dateLabel(sale.fecha) : date.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

function historyMatches(sale) {
    const query = historySearch.value.trim().toLowerCase();
    const searchable = [sale.numero, sale.clienteNombre, sale.clienteDocumento, sale.clienteTelefono, sale.usuarioNombre, ...sale.items.flatMap(line => [line.codigo, line.descripcion])].join(" ").toLowerCase();
    const statusMatches = historyStatus.value === "all" || saleStatus(sale) === historyStatus.value;
    const paymentMatches = historyPayment.value === "all" || sale.metodoPago === historyPayment.value;
    const startMatches = !historyStartDate.value || sale.fecha >= historyStartDate.value;
    const endMatches = !historyEndDate.value || sale.fecha <= historyEndDate.value;
    return (!query || searchable.includes(query)) && statusMatches && paymentMatches && startMatches && endMatches;
}

function renderSalesHistory() {
    const visible = sales.filter(historyMatches);
    const totalProducts = visible.reduce((sum, sale) => sum + sale.items.reduce((lineSum, line) => lineSum + line.cantidad, 0), 0);
    const totalAmount = visible.reduce((sum, sale) => sum + sale.total, 0);
    document.getElementById("historyCount").textContent = number(visible.length);
    document.getElementById("historyResults").textContent = number(visible.length);
    document.getElementById("historyProducts").textContent = number(totalProducts);
    const historyTotal = document.getElementById("historyTotal");
    historyTotal.textContent = money(totalAmount);
    historyTotal.style.color = "var(--warning)";
    historyEmpty.hidden = visible.length > 0;
    historyRows.innerHTML = visible.map(sale => {
        const products = sale.items.reduce((sum, line) => sum + line.cantidad, 0);
        return `<tr><td><strong class="invoice-number">${safe(sale.numero)}</strong><small>${safe(sale.tipo)}</small></td><td>${safe(dateLabel(sale.fecha))}<small>${safe(formatDateTime(sale).split(" · ").pop() || "")}</small></td><td><strong>${safe(sale.clienteNombre || "Consumidor final")}</strong><small>${safe(sale.clienteDocumento || "Sin documento")}</small></td><td>${number(products)} ${products === 1 ? "producto" : "productos"}</td><td>${safe(sale.metodoPago)}</td><td><strong>${money(sale.total)}</strong></td><td><span class="history-status ${saleStatus(sale)}">${statusLabel(sale)}</span></td><td><button class="detail-button" type="button" data-sale-id="${safe(sale.id)}" title="Ver detalle"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i><span>Ver detalle</span></button></td></tr>`;
    }).join("");
    historyRows.querySelectorAll(".detail-button").forEach(element => { element.style.color = "var(--warning)"; });
}

function openSaleDetail(saleId) {
    const sale = sales.find(item => item.id === saleId);
    if (!sale) return;
    activeSaleForReturn = sale;
    document.getElementById("saleDetailTitle").textContent = sale.numero;
    document.getElementById("saleDetailMeta").innerHTML = `<div><span>Fecha y hora</span><strong>${safe(formatDateTime(sale))}</strong></div><div><span>Tipo</span><strong>${safe(sale.tipo)}</strong></div><div><span>Estado</span><strong class="detail-state ${saleStatus(sale)}">${statusLabel(sale)}</strong></div>`;
    document.getElementById("saleDetailCustomer").innerHTML = `<div class="customer-detail-icon"><i class="fa-solid fa-user" aria-hidden="true"></i></div><div><span>Cliente comprador</span><strong>${safe(sale.clienteNombre || "Consumidor final")}</strong><small>${safe(sale.clienteDocumento || "Sin documento")} · ${safe(sale.clienteTelefono || "Sin teléfono")}</small></div><div class="sale-operator"><span>Registrada por</span><strong>${safe(sale.usuarioNombre || "Administrador")}</strong></div>`;
    document.getElementById("saleDetailRows").innerHTML = sale.items.map(line => `<tr><td><strong>${safe(line.descripcion || "Sin descripción")}</strong><small>${safe(line.codigo || "Sin código")}</small></td><td>${safe(line.categoriaNombre || categoryName(line.categoriaId))}</td><td>${number(line.cantidad)}</td><td>${money(line.precioVenta)}</td><td><strong>${money(line.subtotal)}</strong></td></tr>`).join("");
    document.getElementById("saleDetailPayment").textContent = sale.metodoPago;
    const saleDetailTotal = document.getElementById("saleDetailTotal");
    saleDetailTotal.textContent = money(sale.total);
    saleDetailTotal.style.color = "var(--warning)";
    const summary = saleReturnSummary(sale);
    const returnButton = document.getElementById("startReturn");
    const returnNote = document.getElementById("saleDetailReturnNote");
    const canReturn = !["cancelled", "pending", "returned"].includes(saleStatus(sale)) && summary.remaining > 0;
    returnButton.hidden = !canReturn;
    returnNote.hidden = summary.returned === 0;
    const latestReturn = completedReturnsForSale(sale.id).sort((first, second) => String(second.fechaHora || second.fecha).localeCompare(String(first.fechaHora || first.fecha)))[0];
    const returnText = summary.remaining ? `Ya se devolvieron ${number(summary.returned)} de ${number(summary.total)} unidades. Quedan ${number(summary.remaining)} disponibles para devolución.` : "Esta factura ya fue devuelta completamente.";
    returnNote.innerHTML = `<i class="fa-solid fa-rotate-left" aria-hidden="true"></i><span>${returnText}${latestReturn ? ` Motivo registrado: ${safe(latestReturn.motivo)}.` : ""}</span>`;
    if (saleDetailDialog.showModal) saleDetailDialog.showModal();
    else saleDetailDialog.setAttribute("open", "");
}

function closeSaleDetail() { if (saleDetailDialog.open && saleDetailDialog.close) saleDetailDialog.close(); else saleDetailDialog.removeAttribute("open"); }

function currentReturnType() { return document.querySelector('input[name="returnType"]:checked')?.value || "refund"; }
function selectedReturnLines() {
    if (!activeSaleForReturn) return [];
    return Array.from(returnItems.querySelectorAll("[data-return-qty]")).map(input => {
        const source = activeSaleForReturn.items.find(line => String(line.articuloId) === String(input.dataset.id) && String(line.codigo) === String(input.dataset.code)) || activeSaleForReturn.items.find(line => String(line.articuloId) === String(input.dataset.id));
        const quantity = Math.min(Math.max(Math.floor(Number(input.value) || 0), 0), Number(input.max) || 0);
        return source && quantity ? { ...source, cantidad: quantity, subtotal: quantity * source.precioVenta } : null;
    }).filter(Boolean);
}
function returnedSelectionByArticle() { return selectedReturnLines().reduce((result, line) => { result[line.articuloId] = (result[line.articuloId] || 0) + line.cantidad; return result; }, {}); }
function selectedReturnAmount() { return selectedReturnLines().reduce((sum, line) => sum + line.subtotal, 0); }

function renderReturnItems() {
    const lines = returnableLines(activeSaleForReturn || { items: [], id: "" });
    returnItems.innerHTML = lines.length ? lines.map(line => `<div class="return-item-row"><div class="return-item-copy"><strong>${safe(line.descripcion || "Sin descripción")}</strong><small>${safe(line.codigo || "Sin código")} · ${safe(line.categoriaNombre || categoryName(line.categoriaId))} · ${money(line.precioVenta)} unidad</small></div><span class="return-available">${number(line.returnable)} ${line.returnable === 1 ? "disponible" : "disponibles"}</span><label class="return-quantity"><span>Devuelve</span><input type="number" min="0" max="${line.returnable}" value="0" data-return-qty data-id="${safe(line.articuloId)}" data-code="${safe(line.codigo)}" inputmode="numeric"></label></div>`).join("") : `<div class="return-items-empty"><i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>Todos los productos de esta factura ya fueron devueltos.</span></div>`;
    renderReturnFinancials();
}

function renderReturnCategoryOptions() {
    const activeCategories = categories.filter(category => category.estado === "active");
    const current = returnCategorySelect.value;
    returnCategorySelect.innerHTML = `<option value="">Selecciona una categoría</option>${activeCategories.map(category => `<option value="${safe(category.id)}">${safe(category.nombre || "Sin nombre")}</option>`).join("")}`;
    if (activeCategories.some(category => category.id === current)) returnCategorySelect.value = current;
}

function provisionalReplacementStock(article) {
    const returned = returnedSelectionByArticle()[article.id] || 0;
    const alreadySelected = replacementCart.filter(line => line.articuloId === article.id).reduce((sum, line) => sum + line.cantidad, 0);
    return Math.max(0, article.stock + returned - alreadySelected);
}

function renderReturnProductOptions() {
    const categoryId = returnCategorySelect.value;
    const current = returnProductSelect.value;
    const options = articles.filter(article => article.estado === "active" && article.categoriaId === categoryId && provisionalReplacementStock(article) > 0);
    returnProductSelect.innerHTML = `<option value="">${categoryId ? (options.length ? "Selecciona un artículo" : "No hay stock disponible") : "Primero selecciona una categoría"}</option>${options.map(article => `<option value="${safe(article.id)}">${safe(article.codigo || "Sin código")} · ${safe(article.descripcion || "Sin descripción")} · ${money(article.precioVenta)} · ${number(provisionalReplacementStock(article))} disp.</option>`).join("")}`;
    returnProductSelect.disabled = !categoryId || !options.length;
    if (options.some(article => article.id === current)) returnProductSelect.value = current;
}

function renderReplacementList() {
    replacementList.innerHTML = replacementCart.length ? replacementCart.map((line, index) => `<div class="replacement-row"><div><strong>${safe(line.descripcion)}</strong><small>${safe(line.codigo || "Sin código")} · ${number(line.cantidad)} ${line.cantidad === 1 ? "unidad" : "unidades"}</small></div><strong>${money(line.subtotal)}</strong><button type="button" data-remove-replacement="${index}" aria-label="Quitar producto de cambio"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div>`).join("") : `<div class="replacement-empty"><i class="fa-solid fa-box-open" aria-hidden="true"></i><span>Agrega el producto que recibirá el cliente.</span></div>`;
    renderReturnFinancials();
}

function renderReturnFinancials() {
    const returnedAmount = selectedReturnAmount();
    const replacementAmount = replacementCart.reduce((sum, line) => sum + line.subtotal, 0);
    const difference = replacementAmount - returnedAmount;
    document.getElementById("returnSelectedTotal").textContent = money(returnedAmount);
    document.getElementById("exchangeReturnedTotal").textContent = money(returnedAmount);
    document.getElementById("exchangeReplacementTotal").textContent = money(replacementAmount);
    const label = document.getElementById("exchangeDifferenceLabel");
    const value = document.getElementById("exchangeDifference");
    label.textContent = difference > 0 ? "Saldo por cobrar" : difference < 0 ? "Dinero a devolver" : "Diferencia";
    value.textContent = money(Math.abs(difference));
    value.classList.toggle("is-charge", difference > 0);
    value.classList.toggle("is-refund", difference < 0);
    const type = currentReturnType();
    document.getElementById("returnMoneyFields").hidden = type !== "refund";
    document.getElementById("exchangeFields").hidden = type !== "exchange";
    document.getElementById("exchangeMoneyFields").hidden = type !== "exchange" || difference === 0;
    document.getElementById("exchangeMoneySourceLabel").innerHTML = `${difference < 0 ? "Origen del reembolso" : "Medio de pago del excedente"} <b>*</b>`;
}

function openReturnDialog() {
    if (!activeSaleForReturn || !returnableLines(activeSaleForReturn).length) return;
    closeSaleDetail();
    returnForm.reset();
    replacementCart = [];
    document.querySelectorAll(".return-type-option").forEach(option => option.classList.toggle("is-selected", option.querySelector("input")?.checked));
    document.getElementById("returnDialogTitle").textContent = `Devolución · ${activeSaleForReturn.numero}`;
    document.getElementById("returnSaleSummary").textContent = `${activeSaleForReturn.clienteNombre || "Consumidor final"} · ${dateLabel(activeSaleForReturn.fecha)}`;
    document.getElementById("returnFormMessage").textContent = "";
    renderReturnItems();
    renderReturnCategoryOptions();
    returnCategorySelect.value = "";
    renderReturnProductOptions();
    renderReplacementList();
    if (returnDialog.showModal) returnDialog.showModal();
    else returnDialog.setAttribute("open", "");
}

function closeReturnDialog() { if (returnDialog.open && returnDialog.close) returnDialog.close(); else returnDialog.removeAttribute("open"); }

function addReplacementProduct() {
    const article = articles.find(item => item.id === returnProductSelect.value);
    const quantity = Math.floor(Number(returnProductQuantity.value) || 0);
    const message = document.getElementById("returnFormMessage");
    if (!article) { message.textContent = "Selecciona el artículo que recibirá el cliente."; return; }
    if (quantity < 1) { message.textContent = "La cantidad del producto nuevo debe ser de al menos una unidad."; return; }
    if (article.precioVenta <= 0) { message.textContent = "El artículo seleccionado no tiene un precio de venta configurado."; return; }
    if (quantity > provisionalReplacementStock(article)) { showStockAlert(`Solo hay ${number(provisionalReplacementStock(article))} unidades disponibles de ${article.descripcion || article.codigo}.`); return; }
    const existing = replacementCart.find(line => line.articuloId === article.id);
    if (existing) { existing.cantidad += quantity; existing.subtotal = existing.cantidad * existing.precioVenta; }
    else replacementCart.push({ articuloId: article.id, codigo: article.codigo, descripcion: article.descripcion, categoriaId: article.categoriaId, categoriaNombre: categoryName(article.categoriaId), cantidad: quantity, precioVenta: article.precioVenta, subtotal: quantity * article.precioVenta });
    message.textContent = "";
    returnProductQuantity.value = "1";
    renderReplacementList();
    renderReturnProductOptions();
}

function persistReturn() {
    const selectedItems = selectedReturnLines();
    const returnAmount = selectedItems.reduce((sum, line) => sum + line.subtotal, 0);
    const replacementAmount = replacementCart.reduce((sum, line) => sum + line.subtotal, 0);
    const type = currentReturnType();
    const difference = replacementAmount - returnAmount;
    const source = type === "refund" ? document.getElementById("returnMoneySource").value : difference < 0 ? document.getElementById("exchangeMoneySource").value : "";
    const paymentMethod = type === "exchange" && difference > 0 ? document.getElementById("exchangeMoneySource").value : "";
    const record = { id: newId("DEV"), negocioId: business.id, negocioNombre: business.name, ventaId: activeSaleForReturn.id, ventaNumero: activeSaleForReturn.numero, fecha: localDate(), fechaHora: new Date().toISOString(), motivo: document.getElementById("returnReason").value, detalleMotivo: document.getElementById("returnReasonDetail").value.trim(), tipo: type, estado: "completed", source, paymentMethod, amount: type === "refund" ? returnAmount : Math.max(0, -difference), difference, items: selectedItems, replacementItems: replacementCart.map(line => ({ ...line })) };
    const summary = saleReturnSummary(activeSaleForReturn);
    const returnedAfter = summary.returned + selectedItems.reduce((sum, line) => sum + line.cantidad, 0);
    const nextStatus = returnedAfter >= summary.total ? "returned" : "partial_returned";
    const nextSales = sales.map(sale => sale.id === activeSaleForReturn.id ? { ...sale, estado: nextStatus, ultimaDevolucionId: record.id, ultimaDevolucionFecha: record.fecha } : sale);
    scopeApi.writeScoped(RETURN_KEY, [record, ...returns]);
    scopeApi.writeScoped(SALE_KEY, nextSales);
    returns = [normalizeReturn(record), ...returns];
    sales = nextSales;
    return { record, difference, nextStatus };
}

async function confirmReturn(event) {
    event.preventDefault();
    const message = document.getElementById("returnFormMessage");
    message.textContent = "";
    const selectedItems = selectedReturnLines();
    const reason = document.getElementById("returnReason").value;
    const type = currentReturnType();
    const returnAmount = selectedItems.reduce((sum, line) => sum + line.subtotal, 0);
    const replacementAmount = replacementCart.reduce((sum, line) => sum + line.subtotal, 0);
    const difference = replacementAmount - returnAmount;
    if (!selectedItems.length) { message.textContent = "Selecciona al menos un producto y una cantidad para devolver."; return; }
    if (!reason) { message.textContent = "Selecciona el motivo de la devolución."; return; }
    if (type === "exchange" && !replacementCart.length) { message.textContent = "Agrega el producto que recibirá el cliente para continuar."; return; }
    if (type === "exchange" && difference !== 0 && !document.getElementById("exchangeMoneySource").value) { message.textContent = "Selecciona el medio para registrar la diferencia."; return; }
    const actionText = type === "refund" ? `Se devolverán ${money(returnAmount)} desde ${document.getElementById("returnMoneySource").selectedOptions[0].textContent}.` : difference > 0 ? `El cliente pagará un excedente de ${money(difference)}.` : difference < 0 ? `Se devolverán ${money(Math.abs(difference))} al cliente.` : "El cambio queda igualado, sin diferencia.";
    const confirmed = window.NodixAlert?.confirm ? await window.NodixAlert.confirm({ type: "confirm", title: "¿Registrar esta devolución?", message: `${actionText} El inventario y la factura se actualizarán.`, confirmText: "Registrar devolución", cancelText: "Revisar datos" }) : true;
    if (!confirmed) return;
    const result = persistReturn();
    closeReturnDialog();
    reloadData();
    renderClients();
    renderCategoryOptions();
    renderProductOptions();
    renderCart();
    renderRecentSales();
    renderSalesHistory();
    showToast(`${activeSaleForReturn.numero} actualizada correctamente`);
    activeSaleForReturn = sales.find(sale => sale.id === activeSaleForReturn.id) || null;
    if (window.NodixAlert?.show) window.NodixAlert.show({ type: "success", title: "Devolución registrada", message: result.nextStatus === "returned" ? "La factura quedó completamente devuelta y las unidades regresaron al inventario." : "La devolución quedó registrada y las unidades regresaron al inventario.", confirmText: "Entendido" });
}

function setSalesView(view) {
    const isHistory = view === "history";
    newSaleView.hidden = isHistory;
    historyView.hidden = !isHistory;
    document.querySelectorAll("[data-sales-view]").forEach(button => { const selected = button.dataset.salesView === view; button.classList.toggle("active", selected); button.setAttribute("aria-selected", String(selected)); });
    if (isHistory) renderSalesHistory();
}

function resetInvoice() { cart = []; selectedCategoryId = ""; selectedArticleId = ""; productSearch.value = ""; productQuantity.value = "1"; productMessage.textContent = ""; formMessage.textContent = ""; clientSelect.value = ""; document.getElementById("invoiceType").value = "Venta de mostrador"; document.getElementById("paymentMethod").value = "Efectivo"; document.getElementById("invoiceNumber").textContent = "Nueva"; renderCategoryOptions(); renderProductOptions(); renderCart(); }
function addSelectedProduct() {
    const article = articles.find(item => item.id === selectedArticleId);
    const quantity = Math.floor(Number(productQuantity.value) || 0);
    if (!article) { productMessage.textContent = "Selecciona un artículo para continuar."; return; }
    if (article.stock <= 0) {
        const message = `La referencia ${article.descripcion || article.codigo || "seleccionada"} no tiene unidades disponibles. Registra mercancía antes de agregarla a la factura.`;
        showStockAlert(message);
        return;
    }
    if (article.precioVenta <= 0) { productMessage.textContent = "Este artículo todavía no tiene un precio de venta configurado."; return; }
    const existingQuantity = lineQuantity(article.id);
    if (quantity < 1) { productMessage.textContent = "La cantidad debe ser de al menos una unidad."; return; }
    if (existingQuantity + quantity > article.stock) {
        const available = Math.max(0, article.stock - existingQuantity);
        const message = available ? `Solo hay ${number(available)} unidades disponibles para agregar.` : "Esta referencia ya no tiene unidades disponibles para agregar.";
        showStockAlert(message);
        return;
    }
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
    const sale = { id: newId("VEN"), numero: `FAC-${new Date().getFullYear()}-${nextNumber}`, negocioId: business.id, negocioNombre: business.name, tipo: document.getElementById("invoiceType").value, fecha: localDate(), fechaHora: new Date().toISOString(), clienteId: selectedClient ? selectedClient.id : "", clienteNombre: selectedClient ? selectedClient.nombre : "Consumidor final", clienteDocumento: selectedClient ? selectedClient.documento : "", clienteTelefono: selectedClient ? selectedClient.telefono : "", usuarioId: "USR-DEMO", usuarioNombre: "Administrador", metodoPago: document.getElementById("paymentMethod").value, items: cart.map(line => ({ ...line, categoriaNombre: line.categoriaNombre || categoryName(line.categoriaId) })), subtotal, total: subtotal, estado: "completed" };
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

function showStockAlert(message) { if (window.NodixAlert?.show) window.NodixAlert.show({ type: "warning", title: "Stock no disponible", message, confirmText: "Entendido" }); }
function showToast(text) { clearTimeout(toastTimer); toast.textContent = text; toast.classList.add("show"); toastTimer = setTimeout(() => toast.classList.remove("show"), 2500); }

categorySelect.addEventListener("change", () => { selectedCategoryId = categorySelect.value; selectedArticleId = ""; productSearch.value = ""; productQuantity.value = "1"; productMessage.textContent = ""; renderProductOptions(); });
productSearch.addEventListener("input", renderProductOptions);
productSelect.addEventListener("change", () => { selectedArticleId = productSelect.value; productQuantity.value = "1"; renderSelectedProduct(); });
productQuantity.addEventListener("input", () => { const article = articles.find(item => item.id === selectedArticleId); if (article) productQuantity.value = String(Math.min(Math.max(Math.floor(Number(productQuantity.value) || 1), 1), Math.max(article.stock, 1))); });
addProduct.addEventListener("click", addSelectedProduct);
cartRows.addEventListener("click", handleCartAction);
confirmSale.addEventListener("click", confirmCurrentSale);
document.getElementById("clearSale").addEventListener("click", async () => {
    if (!cart.length) {
        resetInvoice();
        return;
    }
    const confirmed = window.NodixAlert?.confirm
        ? await window.NodixAlert.confirm({
            type: "confirm",
            title: "¿Limpiar la factura?",
            message: "Se quitarán todos los productos de la factura actual.",
            confirmText: "Limpiar factura",
            cancelText: "Conservar factura"
        })
        : false;
    if (confirmed) resetInvoice();
});

document.querySelectorAll("[data-sales-view]").forEach(button => button.addEventListener("click", () => setSalesView(button.dataset.salesView)));
[historySearch, historyStartDate, historyEndDate, historyStatus, historyPayment].forEach(control => control.addEventListener("input", renderSalesHistory));
[historyStatus, historyPayment].forEach(control => control.addEventListener("change", renderSalesHistory));
document.getElementById("clearHistoryFilters").addEventListener("click", () => {
    historySearch.value = "";
    historyStartDate.value = "";
    historyEndDate.value = "";
    historyStatus.value = "all";
    historyPayment.value = "all";
    renderSalesHistory();
});
document.getElementById("recentSales").addEventListener("click", event => {
    const button = event.target.closest("[data-sale-id]");
    if (button) openSaleDetail(button.dataset.saleId);
});
historyRows.addEventListener("click", event => {
    const button = event.target.closest("[data-sale-id]");
    if (button) openSaleDetail(button.dataset.saleId);
});
document.getElementById("closeSaleDetail").addEventListener("click", closeSaleDetail);
saleDetailDialog.addEventListener("click", event => { if (event.target === saleDetailDialog) closeSaleDetail(); });
saleDetailDialog.addEventListener("cancel", event => { event.preventDefault(); closeSaleDetail(); });
document.getElementById("startReturn").addEventListener("click", openReturnDialog);
document.getElementById("closeReturnDialog").addEventListener("click", closeReturnDialog);
document.getElementById("cancelReturn").addEventListener("click", closeReturnDialog);
returnDialog.addEventListener("click", event => { if (event.target === returnDialog) closeReturnDialog(); });
returnDialog.addEventListener("cancel", event => { event.preventDefault(); closeReturnDialog(); });
returnForm.addEventListener("submit", confirmReturn);
returnItems.addEventListener("input", event => { const input = event.target.closest("[data-return-qty]"); if (!input) return; input.value = String(Math.min(Math.max(Math.floor(Number(input.value) || 0), 0), Number(input.max) || 0)); renderReturnFinancials(); renderReturnProductOptions(); });
returnTypeFields.forEach(input => input.addEventListener("change", () => { document.querySelectorAll(".return-type-option").forEach(option => option.classList.toggle("is-selected", option.querySelector("input")?.checked)); renderReturnFinancials(); }));
returnCategorySelect.addEventListener("change", () => { returnProductSelect.value = ""; renderReturnProductOptions(); });
document.getElementById("addReplacementProduct").addEventListener("click", addReplacementProduct);
replacementList.addEventListener("click", event => { const button = event.target.closest("[data-remove-replacement]"); if (!button) return; replacementCart.splice(Number(button.dataset.removeReplacement), 1); renderReplacementList(); renderReturnProductOptions(); });
window.addEventListener("storage", event => { if ([SALE_KEY, SALE_LEGACY_KEY, RETURN_KEY, CLIENT_KEY, CLIENT_LEGACY_KEY].includes(event.key)) { reloadData(); renderClients(); renderRecentSales(); renderSalesHistory(); if (activeSaleForReturn && returnDialog.open) { activeSaleForReturn = sales.find(sale => sale.id === activeSaleForReturn.id) || null; if (activeSaleForReturn) renderReturnItems(); } } });

reloadData();
renderClients();
renderCategoryOptions();
renderProductOptions();
renderCart();
renderRecentSales();
renderSalesHistory();

"use strict";

const STORAGE_KEY = "Nodix_articulos_v2";
const LEGACY_STORAGE_KEY = "Nodix_articulos_v1";
const scopeApi = window.NodixBusinessScope;
const inventoryApi = window.NodixInventoryScope;
const currencyApi = window.NodixCurrencyInput;
const dialog = document.getElementById("articleDialog");
const form = document.getElementById("articleForm");
const rows = document.getElementById("articlesRows");
const emptyState = document.getElementById("emptyState");
const search = document.getElementById("searchArticles");
const message = document.getElementById("formMessage");
const toast = document.getElementById("toast");
const costInput = document.getElementById("costo");
const salePriceInput = document.getElementById("precioVenta");
currencyApi.bind(costInput);
currencyApi.bind(salePriceInput);
function createStatusFilter() { const wrapper = document.createElement("label"); wrapper.className = "filter-box"; wrapper.innerHTML = '<i class="fa-solid fa-sliders" aria-hidden="true"></i><span class="sr-only">Filtrar por estado</span><select id="statusFilter"><option value="all">Todos los estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select>'; document.querySelector(".directory-tools").appendChild(wrapper); return wrapper.querySelector("select"); }
const statusFilter = createStatusFilter();
let business = scopeApi.getBusiness();
let categories = [];
let articles = readArticles();
let editingId = "";
let toastTimer;
const money = value => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value) || 0);
const number = value => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Number(value) || 0);
const safe = value => String(value || "").replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[character]));

function setupCategoryUI() {
    const grid = form.querySelector(".form-grid");
    const categoryLabel = document.createElement("label");
    categoryLabel.className = "field-wide";
    categoryLabel.innerHTML = '<span>Categoría <b>*</b></span><select id="categoriaId" name="categoriaId" required><option value="">Selecciona una categoría</option></select>';
    grid.appendChild(categoryLabel);
    const header = document.querySelector("thead tr");
    const categoryHeader = document.createElement("th");
    categoryHeader.textContent = "Categoría";
    header.insertBefore(categoryHeader, header.children[2]);
    const statusHeader = document.createElement("th");
    statusHeader.textContent = "Estado";
    header.insertBefore(statusHeader, header.lastElementChild);
}
setupCategoryUI();
const categorySelect = document.getElementById("categoriaId");

function readArticles() { const result = scopeApi.readScoped(STORAGE_KEY, LEGACY_STORAGE_KEY); business = result.business; return result.records.filter(item => !item.negocioId || item.negocioId === business.id).map(normalize); }
function readCategories() { const result = scopeApi.readScoped("Nodix_categorias_v1"); business = result.business; return result.records.filter(category => !category.negocioId || category.negocioId === business.id).sort((first, second) => (Number(first.orden) || 0) - (Number(second.orden) || 0)).map(category => ({ id: String(category.id), nombre: String(category.nombre || "").trim(), estado: category.estado === "inactive" ? "inactive" : "active" })); }
function loadCategories(selectedId = "") { categories = readCategories(); const options = categories.filter(category => category.estado === "active" || category.id === selectedId); categorySelect.innerHTML = '<option value="">Selecciona una categoría activa</option>' + options.map(category => `<option value="${safe(category.id)}">${safe(category.nombre)}</option>`).join(""); categorySelect.value = selectedId; }
function categoryName(categoryId) { const category = categories.find(item => item.id === categoryId); return category ? category.nombre : "Sin categoría"; }
function syncDerivedValues() { const merchandise = inventoryApi.readMerchandise(); const sales = inventoryApi.readSales(); articles.forEach(article => { article.stock = inventoryApi.availableStock(article.id, article.codigo, merchandise, sales); const linkedEntries = merchandise.filter(item => String(item.articuloId || item.articleId || "") === article.id); if (linkedEntries.length) article.costo = inventoryApi.averageCost(article.id, merchandise); }); }
function normalize(item) { return { id: String(item.id || item.codigo || `ART-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`), negocioId: business.id, negocioNombre: business.name, codigo: String(item.codigo || "").trim(), descripcion: String(item.descripcion || "").trim(), costo: Number(item.costo) || 0, precioVenta: Number(item.precioVenta || item.precio) || 0, stock: Math.max(0, Number(item.stock) || 0), categoriaId: String(item.categoriaId || ""), estado: item.estado === "inactive" ? "inactive" : "active" }; }
function persist() { scopeApi.writeScoped(STORAGE_KEY, articles.map(item => ({ ...item, negocioId: business.id, negocioNombre: business.name }))); }
function filtered() { const query = search.value.trim().toLowerCase(); return articles.filter(item => `${item.codigo} ${item.descripcion} ${categoryName(item.categoriaId)}`.toLowerCase().includes(query) && (statusFilter.value === "all" || item.estado === statusFilter.value)); }
function render() {
    syncDerivedValues();
    const visible = filtered();
    const stockTotal = articles.reduce((sum, item) => sum + item.stock, 0);
    const saleValue = articles.reduce((sum, item) => sum + item.precioVenta * item.stock, 0);
    const marginBase = articles.reduce((sum, item) => sum + item.costo, 0);
    const marginValue = articles.reduce((sum, item) => sum + Math.max(0, item.precioVenta - item.costo), 0);
    document.getElementById("totalArticles").textContent = articles.length;
    document.getElementById("totalStock").textContent = number(stockTotal);
    document.getElementById("salesValue").textContent = money(saleValue);
    document.getElementById("averageMargin").textContent = `${marginBase ? Math.round((marginValue / marginBase) * 100) : 0}%`;
    document.getElementById("resultsCount").textContent = `${visible.length} ${visible.length === 1 ? "registro" : "registros"}`;
    rows.innerHTML = visible.map(item => { const margin = item.costo ? Math.round(((item.precioVenta - item.costo) / item.costo) * 100) : 0; return `<tr><td><span class="role-pill">${safe(item.codigo || "Sin código")}</span></td><td class="document-cell">${safe(item.descripcion || "Sin descripción")}</td><td><span class="role-pill"><i class="fa-solid fa-layer-group" aria-hidden="true"></i> ${safe(categoryName(item.categoriaId))}</span></td><td><span class="role-pill"><i class="fa-solid fa-cubes" aria-hidden="true"></i> ${number(item.stock)}</span></td><td class="phone-cell">${money(item.costo)}</td><td class="phone-cell">${money(item.precioVenta)}</td><td><span class="status-pill ${margin < 0 ? "inactive" : ""}">${margin}%</span></td><td><span class="status-pill ${item.estado === "inactive" ? "inactive" : ""}">${item.estado === "inactive" ? "Inactivo" : "Activo"}</span></td><td><div class="row-actions"><button class="icon-button" type="button" data-action="edit" data-id="${safe(item.id)}" title="Editar artículo" aria-label="Editar artículo"><i class="fa-solid fa-pen" aria-hidden="true"></i></button><button class="icon-button" type="button" data-action="toggle" data-id="${safe(item.id)}" title="${item.estado === "inactive" ? "Activar artículo" : "Desactivar artículo"}" aria-label="${item.estado === "inactive" ? "Activar artículo" : "Desactivar artículo"}"><i class="fa-solid fa-power-off" aria-hidden="true"></i></button><button class="icon-button" type="button" data-action="delete" data-id="${safe(item.id)}" title="Eliminar artículo" aria-label="Eliminar artículo"><i class="fa-solid fa-trash" aria-hidden="true"></i></button></div></td></tr>`; }).join("");
    emptyState.hidden = visible.length > 0;
    if (!visible.length) { const filteredBySearch = Boolean(search.value.trim()) || statusFilter.value !== "all"; document.getElementById("emptyTitle").textContent = filteredBySearch ? "No encontramos coincidencias" : "Aún no hay artículos"; document.getElementById("emptyText").textContent = filteredBySearch ? "Prueba con otros términos o limpia el filtro." : "Registra el primer artículo para comenzar."; document.getElementById("emptyAction").hidden = filteredBySearch; }
}
function showToast(text) { clearTimeout(toastTimer); toast.textContent = text; toast.classList.add("show"); toastTimer = setTimeout(() => toast.classList.remove("show"), 2300); }
function resetForm() { editingId = ""; form.reset(); currencyApi.setValue(costInput, 0); currencyApi.setValue(salePriceInput, 0); document.getElementById("dialogTitle").textContent = "Agregar artículo"; categorySelect.value = ""; message.textContent = ""; }
function openDialog(item) { resetForm(); loadCategories(item ? item.categoriaId : ""); if (item) { editingId = item.id; document.getElementById("dialogTitle").textContent = "Editar artículo"; document.getElementById("articleId").value = item.id; document.getElementById("codigo").value = item.codigo; document.getElementById("descripcion").value = item.descripcion; currencyApi.setValue(costInput, item.costo); currencyApi.setValue(salePriceInput, item.precioVenta); categorySelect.value = item.categoriaId; } if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", ""); setTimeout(() => document.getElementById("codigo").focus(), 0); }
function closeDialog() { if (dialog.open && dialog.close) dialog.close(); else dialog.removeAttribute("open"); resetForm(); }
document.getElementById("newArticle").addEventListener("click", () => openDialog());
document.getElementById("emptyAction").addEventListener("click", () => openDialog());
document.getElementById("closeDialog").addEventListener("click", closeDialog);
document.getElementById("cancelDialog").addEventListener("click", closeDialog);
dialog.addEventListener("click", event => { if (event.target === dialog) closeDialog(); });
search.addEventListener("input", render);
statusFilter.addEventListener("change", render);
rows.addEventListener("click", event => { const button = event.target.closest("button[data-action]"); if (!button) return; const item = articles.find(article => article.id === button.dataset.id); if (!item) return; if (button.dataset.action === "edit") openDialog(item); if (button.dataset.action === "toggle") { item.estado = item.estado === "active" ? "inactive" : "active"; persist(); render(); showToast(item.estado === "active" ? "Artículo activado" : "Artículo desactivado"); } if (button.dataset.action === "delete" && window.confirm(`¿Eliminar el artículo ${item.descripcion || item.codigo}?`)) { articles = articles.filter(article => article.id !== item.id); persist(); render(); showToast("Artículo eliminado"); } });
form.addEventListener("submit", event => { event.preventDefault(); message.textContent = ""; if (!form.reportValidity()) return; const values = Object.fromEntries(new FormData(form).entries()); if (!values.categoriaId) { message.textContent = "Selecciona una categoría del negocio activo."; return; } if (!categories.some(category => category.id === values.categoriaId)) { message.textContent = "La categoría seleccionada no pertenece al negocio activo."; return; } const code = values.codigo.trim(); if (articles.some(item => item.codigo.toLowerCase() === code.toLowerCase() && item.id !== editingId)) { message.textContent = "Ya existe un artículo con ese código."; return; } const current = articles.find(item => item.id === editingId); const wasEditing = Boolean(editingId); const record = normalize({ ...current, id: editingId || `ART-${Date.now()}`, codigo: code, descripcion: values.descripcion.trim(), costo: current ? current.costo : 0, precioVenta: currencyApi.number(salePriceInput), stock: current ? current.stock : 0, categoriaId: values.categoriaId }); articles = wasEditing ? articles.map(item => item.id === editingId ? record : item) : [record, ...articles]; persist(); closeDialog(); render(); showToast(wasEditing ? "Artículo actualizado" : "Artículo creado"); });

loadCategories();
render();

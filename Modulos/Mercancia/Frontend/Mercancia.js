"use strict";

const STORAGE_KEY = "Nodix_mercancia_v2";
const LEGACY_STORAGE_KEY = "Nodix_mercancia_v1";
const ARTICLE_STORAGE_KEY = "Nodix_articulos_v2";
const ARTICLE_LEGACY_STORAGE_KEY = "Nodix_articulos_v1";
const CATEGORY_STORAGE_KEY = "Nodix_categorias_v1";
const scopeApi = window.NodixBusinessScope;
const inventoryApi = window.NodixInventoryScope;
const currencyApi = window.NodixCurrencyInput;
const dialog = document.getElementById("merchandiseDialog");
const form = document.getElementById("merchandiseForm");
const rows = document.getElementById("merchandiseRows");
const emptyState = document.getElementById("emptyState");
const search = document.getElementById("searchMerchandise");
const message = document.getElementById("formMessage");
const toast = document.getElementById("toast");
const categorySelect = document.getElementById("categoriaId");
const articleSelect = document.getElementById("articuloId");
const quantityInput = document.getElementById("cantidad");
const costInput = document.getElementById("costo");
const totalInput = document.getElementById("valorTotal");
currencyApi.bind(costInput);
currencyApi.bind(totalInput);
let business = scopeApi.getBusiness();
let entries = readEntries();
let categories = readCategories();
let articles = readArticles();
let editingId = "";
let toastTimer;
const money = value => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value) || 0);
const safe = value => String(value || "").replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[character]));
const localDate = (date = new Date()) => { const copy = new Date(date); copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset()); return copy.toISOString().slice(0, 10); };

function normalize(item) { const cantidad = Math.max(0, Number(item.cantidad || item.quantity) || 0); const costo = Math.max(0, Number(item.costo || item.unitCost) || 0); return { id: String(item.id || `MER-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`), negocioId: business.id, negocioNombre: business.name, categoriaId: String(item.categoriaId || item.categoryId || ""), articuloId: String(item.articuloId || item.articleId || ""), articuloCodigo: String(item.articuloCodigo || item.articleCode || "").trim(), articuloNombre: String(item.articuloNombre || item.articleName || item.descripcion || "").trim(), descripcion: String(item.descripcion || "").trim(), cantidad, costo, valorTotal: Number(item.valorTotal) || cantidad * costo, fecha: String(item.fecha || item.date || "").slice(0, 10) }; }
function readEntries() { const result = scopeApi.readScoped(STORAGE_KEY, LEGACY_STORAGE_KEY); business = result.business; return result.records.filter(item => !item.negocioId || item.negocioId === business.id).map(normalize); }
function readCategories() { const result = scopeApi.readScoped(CATEGORY_STORAGE_KEY); business = result.business; return result.records.filter(item => !item.negocioId || item.negocioId === business.id).map(item => ({ id: String(item.id), nombre: String(item.nombre || "").trim(), estado: item.estado === "inactive" ? "inactive" : "active" })); }
function readArticles() { const result = scopeApi.readScoped(ARTICLE_STORAGE_KEY, ARTICLE_LEGACY_STORAGE_KEY); business = result.business; return result.records.filter(item => !item.negocioId || item.negocioId === business.id).map(item => ({ id: String(item.id || item.codigo), codigo: String(item.codigo || "").trim(), descripcion: String(item.descripcion || item.nombre || "").trim(), categoriaId: String(item.categoriaId || item.categoryId || ""), costo: Number(item.costo) || 0, precioVenta: Number(item.precioVenta || item.precio) || 0, stock: Math.max(0, Number(item.stock) || 0), estado: item.estado === "inactive" ? "inactive" : "active" })); }
function persist() { scopeApi.writeScoped(STORAGE_KEY, entries.map(item => ({ ...item, negocioId: business.id, negocioNombre: business.name }))); }
function persistArticles() { scopeApi.writeScoped(ARTICLE_STORAGE_KEY, articles.map(item => ({ ...item, negocioId: business.id, negocioNombre: business.name }))); }
function categoryName(entry) { const category = categories.find(item => item.id === entry.categoriaId); return category ? category.nombre : "Sin categoría"; }
function articleName(entry) { const article = articles.find(item => item.id === entry.articuloId); return article ? article.descripcion : (entry.articuloNombre || entry.descripcion || "Sin artículo"); }
function articleCode(entry) { const article = articles.find(item => item.id === entry.articuloId); return article ? article.codigo : entry.articuloCodigo; }
function loadCategories(selectedId = "") { categories = readCategories(); const options = categories.filter(category => category.estado === "active" || category.id === selectedId); categorySelect.innerHTML = '<option value="">Selecciona una categoría activa</option>' + options.map(category => `<option value="${safe(category.id)}">${safe(category.nombre)}</option>`).join(""); categorySelect.value = selectedId; }
function loadArticles(categoryId = "", selectedId = "") { const options = articles.filter(article => article.categoriaId === categoryId && (article.estado === "active" || article.id === selectedId)); articleSelect.disabled = !categoryId; articleSelect.innerHTML = categoryId ? '<option value="">Selecciona un artículo</option>' + options.map(article => `<option value="${safe(article.id)}">${safe(article.codigo ? `${article.codigo} · ${article.descripcion}` : article.descripcion)}</option>`).join("") : '<option value="">Primero selecciona una categoría</option>'; articleSelect.value = selectedId; document.getElementById("articleHint").textContent = categoryId && !options.length ? "No hay artículos activos en esta categoría. Crea uno desde Artículos." : "Solo aparecen artículos activos de la categoría seleccionada."; }
function recalculateArticles(affectedIds) { const ids = [...new Set(affectedIds.filter(Boolean))]; if (!ids.length) return; const sales = inventoryApi.readSales(); ids.forEach(id => { const article = articles.find(item => item.id === id); if (!article) return; article.stock = inventoryApi.availableStock(article.id, article.codigo, entries, sales); const linkedEntries = entries.filter(item => item.articuloId === id); article.costo = linkedEntries.length ? inventoryApi.averageCost(article.id, entries) : 0; }); persistArticles(); }
function filtered() { const query = search.value.trim().toLowerCase(); return entries.filter(item => `${categoryName(item)} ${articleName(item)} ${articleCode(item)} ${item.fecha}`.toLowerCase().includes(query)); }
function render() { const visible = filtered(); document.getElementById("totalEntries").textContent = entries.length; document.getElementById("totalQuantity").textContent = entries.reduce((sum, item) => sum + item.cantidad, 0); document.getElementById("merchandiseValue").textContent = money(entries.reduce((sum, item) => sum + item.valorTotal, 0)); document.getElementById("resultsCount").textContent = `${visible.length} ${visible.length === 1 ? "registro" : "registros"}`; rows.innerHTML = visible.map(item => `<tr><td><span class="role-pill"><i class="fa-solid fa-layer-group" aria-hidden="true"></i> ${safe(categoryName(item))}</span></td><td class="document-cell"><strong>${safe(articleName(item))}</strong><small>${safe(articleCode(item) || "Sin código")}</small></td><td class="phone-cell">${item.cantidad}</td><td class="phone-cell">${money(item.costo)}</td><td class="phone-cell">${money(item.valorTotal)}</td><td class="phone-cell">${safe(item.fecha || "—")}</td><td><div class="row-actions"><button class="icon-button" type="button" data-action="edit" data-id="${safe(item.id)}" aria-label="Editar entrada" title="Editar entrada"><i class="fa-solid fa-pen" aria-hidden="true"></i></button><button class="icon-button" type="button" data-action="delete" data-id="${safe(item.id)}" aria-label="Eliminar entrada" title="Eliminar entrada"><i class="fa-solid fa-trash" aria-hidden="true"></i></button></div></td></tr>`).join(""); emptyState.hidden = visible.length > 0; if (!visible.length) { const filteredBySearch = Boolean(search.value.trim()); document.getElementById("emptyTitle").textContent = filteredBySearch ? "No encontramos coincidencias" : "Aún no hay mercancía"; document.getElementById("emptyText").textContent = filteredBySearch ? "Prueba con otra búsqueda." : "Registra la primera entrada para comenzar."; document.getElementById("emptyAction").hidden = filteredBySearch; } }
function showToast(text) { clearTimeout(toastTimer); toast.textContent = text; toast.classList.add("show"); toastTimer = setTimeout(() => toast.classList.remove("show"), 2300); }
function updateTotal() { currencyApi.setValue(totalInput, (Number(quantityInput.value) || 0) * currencyApi.number(costInput)); }
function resetForm() { editingId = ""; form.reset(); currencyApi.setValue(costInput, 0); currencyApi.setValue(totalInput, 0); document.getElementById("dialogTitle").textContent = "Nueva entrada"; document.getElementById("fecha").value = localDate(); message.textContent = ""; loadCategories(); loadArticles(); }
function openDialog(item) { resetForm(); if (item) { editingId = item.id; document.getElementById("dialogTitle").textContent = "Editar entrada"; document.getElementById("merchandiseId").value = item.id; loadCategories(item.categoriaId); loadArticles(item.categoriaId, item.articuloId); quantityInput.value = item.cantidad; currencyApi.setValue(costInput, item.costo); currencyApi.setValue(totalInput, item.valorTotal); document.getElementById("fecha").value = item.fecha; } if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", ""); setTimeout(() => categorySelect.focus(), 0); }
function closeDialog() { if (dialog.open && dialog.close) dialog.close(); else dialog.removeAttribute("open"); resetForm(); }

document.getElementById("newMerchandise").addEventListener("click", () => openDialog());
document.getElementById("emptyAction").addEventListener("click", () => openDialog());
document.getElementById("closeDialog").addEventListener("click", closeDialog);
document.getElementById("cancelDialog").addEventListener("click", closeDialog);
dialog.addEventListener("click", event => { if (event.target === dialog) closeDialog(); });
search.addEventListener("input", render);
categorySelect.addEventListener("change", () => loadArticles(categorySelect.value));
quantityInput.addEventListener("input", updateTotal);
costInput.addEventListener("input", updateTotal);
rows.addEventListener("click", event => { const button = event.target.closest("button[data-action]"); if (!button) return; const item = entries.find(entry => entry.id === button.dataset.id); if (!item) return; if (button.dataset.action === "edit") openDialog(item); if (button.dataset.action === "delete" && window.confirm("¿Eliminar esta entrada de mercancía? El stock del artículo será recalculado.")) { const affectedId = item.articuloId; entries = entries.filter(entry => entry.id !== item.id); persist(); recalculateArticles([affectedId]); render(); showToast("Entrada eliminada y stock actualizado"); } });
form.addEventListener("submit", event => { event.preventDefault(); message.textContent = ""; if (!form.reportValidity()) return; const values = Object.fromEntries(new FormData(form).entries()); const category = categories.find(item => item.id === values.categoriaId); const article = articles.find(item => item.id === values.articuloId && item.categoriaId === values.categoriaId); const current = entries.find(item => item.id === editingId); const unitCost = currencyApi.number(costInput); const totalValue = (Number(values.cantidad) || 0) * unitCost; if (!category) { message.textContent = "Selecciona una categoría válida del negocio activo."; return; } if (!article) { message.textContent = "Selecciona un artículo de la categoría elegida."; return; } const isExistingInactiveCategory = current && current.categoriaId === category.id; const isExistingInactiveArticle = current && current.articuloId === article.id; if ((category.estado === "inactive" && !isExistingInactiveCategory) || (article.estado === "inactive" && !isExistingInactiveArticle)) { message.textContent = "Solo puedes registrar mercancía nueva en categorías y artículos activos."; return; } const wasEditing = Boolean(editingId); const record = normalize({ ...current, id: editingId || `MER-${Date.now()}`, categoriaId: category.id, articuloId: article.id, articuloCodigo: article.codigo, articuloNombre: article.descripcion, descripcion: article.descripcion, cantidad: values.cantidad, costo: unitCost, valorTotal: totalValue, fecha: values.fecha }); entries = wasEditing ? entries.map(item => item.id === editingId ? record : item) : [record, ...entries]; persist(); recalculateArticles([current && current.articuloId, record.articuloId]); closeDialog(); render(); showToast(wasEditing ? "Entrada actualizada y stock recalculado" : "Entrada creada y stock actualizado"); });

loadCategories();
loadArticles();
render();

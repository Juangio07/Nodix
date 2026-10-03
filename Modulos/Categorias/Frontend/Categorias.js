"use strict";

const STORAGE_KEY = "Nodix_categorias_v1";
const scopeApi = window.NodixBusinessScope;
const dialog = document.getElementById("categoryDialog");
const form = document.getElementById("categoryForm");
const rows = document.getElementById("categoriesRows");
const emptyState = document.getElementById("emptyState");
const search = document.getElementById("searchCategories");
const message = document.getElementById("formMessage");
const toast = document.getElementById("toast");
let business = scopeApi.getBusiness();
let categories = readCategories();
let editingId = "";
let toastTimer;
const safe = value => String(value || "").replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[character]));

function normalizeCategory(category, index) { return { id: String(category.id || `CAT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`), nombre: String(category.nombre || "").trim(), descripcion: String(category.descripcion || "").trim(), orden: Number(category.orden) || index + 1, estado: category.estado === "inactive" ? "inactive" : "active", negocioId: business.id, negocioNombre: business.name }; }
function readCategories() { const result = scopeApi.readScoped(STORAGE_KEY); business = result.business; return result.records.filter(category => !category.negocioId || category.negocioId === business.id).map(normalizeCategory); }
function readArticles() { return scopeApi.readScoped("Nodix_articulos_v2", "Nodix_articulos_v1").records.filter(article => !article.negocioId || article.negocioId === business.id); }
function persist() { business = scopeApi.writeScoped(STORAGE_KEY, categories.map((category, index) => ({ ...category, negocioId: business.id, negocioNombre: business.name, orden: index + 1 }))); }
function reindex() { categories.sort((first, second) => first.orden - second.orden || first.nombre.localeCompare(second.nombre, "es")); categories.forEach((category, index) => { category.orden = index + 1; }); }
function articleCount(categoryId) { return readArticles().filter(article => article.categoriaId === categoryId).length; }
function filteredCategories() { const query = search.value.trim().toLowerCase(); return categories.filter(category => `${category.nombre} ${category.descripcion}`.toLowerCase().includes(query)); }
function render() {
    const visible = filteredCategories();
    const articles = readArticles();
    document.getElementById("totalCategories").textContent = categories.length;
    document.getElementById("usedCategories").textContent = categories.filter(category => articleCount(category.id) > 0).length;
    document.getElementById("assignedArticles").textContent = articles.filter(article => article.categoriaId && categories.some(category => category.id === article.categoriaId)).length;
    document.getElementById("businessScope").innerHTML = `<i class="fa-solid fa-building" aria-hidden="true"></i> ${safe(business.name)}`;
    document.getElementById("resultsCount").textContent = `${visible.length} ${visible.length === 1 ? "registro" : "registros"}`;
    rows.innerHTML = visible.map(category => { const assigned = articleCount(category.id); const index = categories.findIndex(item => item.id === category.id); return `<tr><td class="order-cell">${category.orden}</td><td class="category-name">${safe(category.nombre || "Sin nombre")}</td><td class="category-description">${safe(category.descripcion || "Sin descripción")}</td><td><span class="role-pill"><i class="fa-solid fa-box" aria-hidden="true"></i> ${assigned}</span></td><td><span class="status-pill ${category.estado === "inactive" ? "inactive" : ""}">${category.estado === "inactive" ? "Inactiva" : "Activa"}</span></td><td><div class="row-actions"><button class="icon-button move-action" type="button" data-action="up" data-id="${safe(category.id)}" aria-label="Subir categoría" ${index === 0 ? "disabled" : ""}><i class="fa-solid fa-arrow-up" aria-hidden="true"></i></button><button class="icon-button move-action" type="button" data-action="down" data-id="${safe(category.id)}" aria-label="Bajar categoría" ${index === categories.length - 1 ? "disabled" : ""}><i class="fa-solid fa-arrow-down" aria-hidden="true"></i></button><button class="icon-button" type="button" data-action="edit" data-id="${safe(category.id)}" aria-label="Editar categoría"><i class="fa-solid fa-pen" aria-hidden="true"></i></button><button class="icon-button" type="button" data-action="delete" data-id="${safe(category.id)}" aria-label="Eliminar categoría"><i class="fa-solid fa-trash" aria-hidden="true"></i></button></div></td></tr>`; }).join("");
    emptyState.hidden = visible.length > 0;
    if (!visible.length) { const filteredBySearch = Boolean(search.value.trim()); document.getElementById("emptyTitle").textContent = filteredBySearch ? "No encontramos coincidencias" : "Aún no hay categorías"; document.getElementById("emptyText").textContent = filteredBySearch ? "Prueba con otra búsqueda." : "Crea una categoría para comenzar a organizar tus artículos."; document.getElementById("emptyAction").hidden = filteredBySearch; }
}
function showToast(text) { clearTimeout(toastTimer); toast.textContent = text; toast.classList.add("show"); toastTimer = setTimeout(() => toast.classList.remove("show"), 2600); }
function resetForm() { editingId = ""; form.reset(); document.getElementById("dialogTitle").textContent = "Agregar categoría"; message.textContent = ""; }
function openDialog(category) { resetForm(); if (category) { editingId = category.id; document.getElementById("dialogTitle").textContent = "Editar categoría"; document.getElementById("categoryId").value = category.id; document.getElementById("categoryName").value = category.nombre; document.getElementById("categoryDescription").value = category.descripcion; } if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", ""); setTimeout(() => document.getElementById("categoryName").focus(), 0); }
function closeDialog() { if (dialog.open && dialog.close) dialog.close(); else dialog.removeAttribute("open"); resetForm(); }
function moveCategory(id, direction) { const index = categories.findIndex(category => category.id === id); const target = index + direction; if (index < 0 || target < 0 || target >= categories.length) return; [categories[index], categories[target]] = [categories[target], categories[index]]; reindex(); persist(); render(); }

document.getElementById("newCategory").addEventListener("click", () => openDialog());
document.getElementById("emptyAction").addEventListener("click", () => openDialog());
document.getElementById("closeDialog").addEventListener("click", closeDialog);
document.getElementById("cancelDialog").addEventListener("click", closeDialog);
dialog.addEventListener("click", event => { if (event.target === dialog) closeDialog(); });
search.addEventListener("input", render);
rows.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button || button.disabled) return;
    const category = categories.find(item => item.id === button.dataset.id);
    if (!category) return;
    if (button.dataset.action === "edit") openDialog(category);
    if (button.dataset.action === "up") moveCategory(category.id, -1);
    if (button.dataset.action === "down") moveCategory(category.id, 1);
    if (button.dataset.action === "delete") {
        const assigned = articleCount(category.id);
        if (assigned > 0) { showToast("No puedes eliminar una categoría con artículos asignados."); return; }
        if (!window.confirm(`¿Eliminar la categoría ${category.nombre}?`)) return;
        categories = categories.filter(item => item.id !== category.id);
        reindex(); persist(); render(); showToast("Categoría eliminada");
    }
});
form.addEventListener("submit", event => {
    event.preventDefault();
    message.textContent = "";
    if (!form.reportValidity()) return;
    business = scopeApi.getBusiness();
    const values = Object.fromEntries(new FormData(form).entries());
    const name = values.nombre.trim();
    if (categories.some(category => category.nombre.toLowerCase() === name.toLowerCase() && category.id !== editingId)) { message.textContent = "Ya existe una categoría con ese nombre en este negocio."; return; }
    const current = categories.find(category => category.id === editingId);
    const wasEditing = Boolean(editingId);
    const record = normalizeCategory({ ...current, id: editingId || `CAT-${Date.now()}`, nombre: name, descripcion: values.descripcion.trim(), orden: current ? current.orden : categories.length + 1, estado: current ? current.estado : "active" }, categories.length);
    categories = wasEditing ? categories.map(category => category.id === editingId ? record : category) : [...categories, record];
    reindex(); persist(); closeDialog(); render(); showToast(wasEditing ? "Categoría actualizada" : "Categoría creada");
});

reindex();
render();

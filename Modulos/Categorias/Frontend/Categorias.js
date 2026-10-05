"use strict";

const STORAGE_KEY = "Nodix_categorias_v1";
const scopeApi = window.NodixBusinessScope;
const relationshipApi = window.NodixRelationshipGuard;
const dialog = document.getElementById("categoryDialog");
const form = document.getElementById("categoryForm");
const rows = document.getElementById("categoriesRows");
const emptyState = document.getElementById("emptyState");
const search = document.getElementById("searchCategories");
const message = document.getElementById("formMessage");
const toast = document.getElementById("toast");
function createStatusFilter() { const wrapper = document.createElement("label"); wrapper.className = "filter-box"; wrapper.innerHTML = '<i class="fa-solid fa-sliders" aria-hidden="true"></i><span class="sr-only">Filtrar por estado</span><select id="statusFilter"><option value="all">Todos los estados</option><option value="active">Activas</option><option value="inactive">Inactivas</option></select>'; document.querySelector(".directory-tools").appendChild(wrapper); return wrapper.querySelector("select"); }
const statusFilter = createStatusFilter();
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
function filteredCategories() { const query = search.value.trim().toLowerCase(); return categories.filter(category => `${category.nombre} ${category.descripcion}`.toLowerCase().includes(query) && (statusFilter.value === "all" || category.estado === statusFilter.value)); }
function render() {
    const visible = filteredCategories();
    const articles = readArticles();
    document.getElementById("totalCategories").textContent = categories.length;
    document.getElementById("usedCategories").textContent = categories.filter(category => articleCount(category.id) > 0).length;
    document.getElementById("assignedArticles").textContent = articles.filter(article => article.categoriaId && categories.some(category => category.id === article.categoriaId)).length;
    document.getElementById("resultsCount").textContent = `${visible.length} ${visible.length === 1 ? "registro" : "registros"}`;
    rows.innerHTML = visible.map(category => { const assigned = articleCount(category.id); return `<tr><td class="order-cell">${category.orden}</td><td class="category-name">${safe(category.nombre || "Sin nombre")}</td><td class="category-description">${safe(category.descripcion || "Sin descripción")}</td><td><span class="role-pill"><i class="fa-solid fa-box" aria-hidden="true"></i> ${assigned}</span></td><td><span class="status-pill ${category.estado === "inactive" ? "inactive" : ""}">${category.estado === "inactive" ? "Inactiva" : "Activa"}</span></td><td><div class="row-actions"><button class="icon-button" type="button" data-action="edit" data-id="${safe(category.id)}" title="Editar categoría" aria-label="Editar categoría"><i class="fa-solid fa-pen" aria-hidden="true"></i></button><button class="icon-button" type="button" data-action="toggle" data-id="${safe(category.id)}" title="${category.estado === "inactive" ? "Activar categoría" : "Desactivar categoría"}" aria-label="${category.estado === "inactive" ? "Activar categoría" : "Desactivar categoría"}"><i class="fa-solid fa-power-off" aria-hidden="true"></i></button><button class="icon-button" type="button" data-action="delete" data-id="${safe(category.id)}" title="Eliminar categoría" aria-label="Eliminar categoría"><i class="fa-solid fa-trash" aria-hidden="true"></i></button></div></td></tr>`; }).join("");
    emptyState.hidden = visible.length > 0;
    if (!visible.length) { const filteredBySearch = Boolean(search.value.trim()) || statusFilter.value !== "all"; document.getElementById("emptyTitle").textContent = filteredBySearch ? "No encontramos coincidencias" : "Aún no hay categorías"; document.getElementById("emptyText").textContent = filteredBySearch ? "Prueba con otros términos o limpia el filtro." : "Crea una categoría para comenzar a organizar tus artículos."; document.getElementById("emptyAction").hidden = filteredBySearch; }
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
statusFilter.addEventListener("change", render);
rows.addEventListener("click", event => {
    const button = event.target.closest('button[data-action="toggle"], button[data-action="delete"]');
    if (!button) return;
    const category = categories.find(item => item.id === button.dataset.id);
    if (!category || (button.dataset.action === "toggle" && category.estado !== "active")) return;
    const restriction = relationshipApi?.checkBeforeDeactivate("categorias", category, button.dataset.action === "delete" ? "delete" : "deactivate");
    if (!restriction) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    relationshipApi?.notify(restriction);
}, true);
rows.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button || button.disabled) return;
    const category = categories.find(item => item.id === button.dataset.id);
    if (!category) return;
    if (button.dataset.action === "edit") openDialog(category);
    if (button.dataset.action === "toggle") { category.estado = category.estado === "active" ? "inactive" : "active"; persist(); render(); showToast(category.estado === "active" ? "Categoría activada" : "Categoría desactivada"); }
    if (button.dataset.action === "delete") {
        const assigned = articleCount(category.id);
        if (assigned > 0) { showToast("No puedes eliminar una categoría con artículos asignados."); return; }
        const confirmed = window.NodixAlert?.confirm
            ? await window.NodixAlert.confirm({
                type: "confirm",
                title: "¿Eliminar categoría?",
                message: `Se eliminará la categoría “${category.nombre}”. Esta acción no se puede deshacer.`,
                confirmText: "Eliminar categoría"
            })
            : false;
        if (!confirmed) return;
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

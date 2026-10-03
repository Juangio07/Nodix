"use strict";

const STORAGE_KEY = "Nodix_roles_v1";
const dialog = document.getElementById("roleDialog");
const form = document.getElementById("roleForm");
const rows = document.getElementById("rolesRows");
const emptyState = document.getElementById("emptyState");
const search = document.getElementById("searchRoles");
const statusFilter = document.getElementById("statusFilter");
const message = document.getElementById("formMessage");
const toast = document.getElementById("toast");
let roles = readRoles();
let editingId = "";
let toastTimer;

function readRoles() {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(stored) ? stored.map(normalizeRole) : [];
    } catch { return []; }
}

function normalizeRole(role) {
    return {
        id: String(role.id || role.idRol || `ROL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
        nombre: String(role.nombre || "").trim(),
        descripcion: String(role.descripcion || role.descripcionRol || "").trim(),
        estado: role.estado === "inactive" ? "inactive" : "active"
    };
}

function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function getUsers() {
    try {
        const stored = JSON.parse(localStorage.getItem("Nodix_usuarios_v1") || "[]");
        return Array.isArray(stored) ? stored : [];
    } catch { return []; }
}

function assignedTo(role) {
    return getUsers().filter(user => String(user.idRol || "").toLowerCase() === role.nombre.toLowerCase() || String(user.idRol || "") === role.id).length;
}

function filteredRoles() {
    const query = search.value.trim().toLowerCase();
    const state = statusFilter.value;
    return roles.filter(role => `${role.nombre} ${role.descripcion}`.toLowerCase().includes(query) && (state === "all" || role.estado === state));
}

function render() {
    const visibleRoles = filteredRoles();
    const activeCount = roles.filter(role => role.estado === "active").length;
    const assignedCount = roles.reduce((total, role) => total + assignedTo(role), 0);
    document.getElementById("totalRoles").textContent = roles.length;
    document.getElementById("activeRoles").textContent = activeCount;
    document.getElementById("assignedUsers").textContent = assignedCount;
    document.getElementById("resultsCount").textContent = `${visibleRoles.length} ${visibleRoles.length === 1 ? "registro" : "registros"}`;
    rows.innerHTML = visibleRoles.map(role => `
      <tr>
        <td><div class="person-cell"><span class="avatar"><i class="fa-solid fa-key" aria-hidden="true"></i></span><span><strong>${escapeHtml(role.nombre || "Sin nombre")}</strong><small>${escapeHtml(role.id)}</small></span></div></td>
        <td class="document-cell">${escapeHtml(role.descripcion || "Sin descripción")}</td>
        <td><span class="role-pill"><i class="fa-solid fa-user-group" aria-hidden="true"></i> ${assignedTo(role)}</span></td>
        <td><span class="status-pill ${role.estado === "inactive" ? "inactive" : ""}">${role.estado === "inactive" ? "Inactivo" : "Activo"}</span></td>
        <td><div class="row-actions"><button class="icon-button" type="button" data-action="edit" data-id="${escapeHtml(role.id)}" title="Editar rol" aria-label="Editar rol"><i class="fa-solid fa-pen" aria-hidden="true"></i></button><button class="icon-button" type="button" data-action="toggle" data-id="${escapeHtml(role.id)}" title="Cambiar estado" aria-label="Cambiar estado"><i class="fa-solid fa-power-off" aria-hidden="true"></i></button></div></td>
      </tr>`).join("");
    const hasRows = visibleRoles.length > 0;
    emptyState.hidden = hasRows;
    if (!hasRows) {
        const hasFilters = Boolean(search.value.trim()) || statusFilter.value !== "all";
        document.getElementById("emptyTitle").textContent = hasFilters ? "No encontramos coincidencias" : "Aún no hay roles";
        document.getElementById("emptyText").textContent = hasFilters ? "Prueba con otros términos o limpia los filtros." : "Crea el primer perfil para organizar los accesos.";
        document.getElementById("emptyAction").hidden = hasFilters;
    }
}

function showToast(text) { clearTimeout(toastTimer); toast.textContent = text; toast.classList.add("show"); toastTimer = setTimeout(() => toast.classList.remove("show"), 2300); }
function resetForm() { editingId = ""; form.reset(); document.getElementById("dialogTitle").textContent = "Agregar rol"; message.textContent = ""; }
function openDialog(role) { resetForm(); if (role) { editingId = role.id; document.getElementById("dialogTitle").textContent = "Editar rol"; document.getElementById("roleId").value = role.id; document.getElementById("roleName").value = role.nombre; document.getElementById("roleDescription").value = role.descripcion; } if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", ""); setTimeout(() => document.getElementById("roleName").focus(), 0); }
function closeDialog() { if (dialog.open && typeof dialog.close === "function") dialog.close(); else dialog.removeAttribute("open"); resetForm(); }

document.getElementById("newRole").addEventListener("click", () => openDialog());
document.getElementById("emptyAction").addEventListener("click", () => openDialog());
document.getElementById("closeDialog").addEventListener("click", closeDialog);
document.getElementById("cancelDialog").addEventListener("click", closeDialog);
dialog.addEventListener("click", event => { if (event.target === dialog) closeDialog(); });
search.addEventListener("input", render);
statusFilter.addEventListener("change", render);

rows.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const role = roles.find(item => item.id === button.dataset.id);
    if (!role) return;
    if (button.dataset.action === "edit") openDialog(role);
    if (button.dataset.action === "toggle") { role.estado = role.estado === "active" ? "inactive" : "active"; persist(); render(); showToast(role.estado === "active" ? "Rol activado" : "Rol desactivado"); }
});

function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(roles)); }

form.addEventListener("submit", event => {
    event.preventDefault();
    message.textContent = "";
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());
    const name = values.nombre.trim();
    if (roles.some(role => role.nombre.toLowerCase() === name.toLowerCase() && role.id !== editingId)) { message.textContent = "Ya existe un rol con ese nombre."; return; }
    const wasEditing = Boolean(editingId);
    const current = roles.find(role => role.id === editingId);
    const record = normalizeRole({ ...current, id: editingId || `ROL-${Date.now()}`, nombre: name, descripcion: values.descripcion.trim(), estado: current ? current.estado : "active" });
    roles = wasEditing ? roles.map(role => role.id === editingId ? record : role) : [record, ...roles];
    persist();
    closeDialog();
    render();
    showToast(wasEditing ? "Rol actualizado" : "Rol creado");
});

render();

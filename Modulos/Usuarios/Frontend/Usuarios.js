"use strict";

const STORAGE_KEY = "Nodix_usuarios_v1";
const scopeApi = window.NodixBusinessScope;
const relationshipApi = window.NodixRelationshipGuard;
const fields = ["idUsuario", "idRol", "documento", "nombre", "telefono", "usuario", "contrasena"];
const form = document.getElementById("userForm");
const dialog = document.getElementById("userDialog");
const rows = document.getElementById("usersRows");
const emptyState = document.getElementById("emptyState");
const emptyTitle = document.getElementById("emptyTitle");
const emptyText = document.getElementById("emptyText");
const search = document.getElementById("searchUsers");
const statusFilter = document.getElementById("statusFilter");
const roleSelect = document.getElementById("idRol");
const message = document.getElementById("formMessage");
const toast = document.getElementById("toast");
let business = scopeApi.getBusiness();
let users = readUsers();
let editingId = "";
let toastTimer;

function readUsers() {
    const result = scopeApi.readScoped(STORAGE_KEY);
    business = result.business;
    return result.records.map(normalizeUser);
}

function readRoles() {
    try {
        const result = scopeApi.readScoped("Nodix_roles_v1");
        business = result.business;
        return result.records.map(role => ({
            id: String(role.id || role.idRol || "").trim(),
            nombre: String(role.nombre || "").trim(),
            estado: role.estado === "inactive" ? "inactive" : "active"
        })).filter(role => role.id && role.nombre);
    } catch {
        return [];
    }
}

function findRole(reference, roles = readRoles()) {
    const value = String(reference || "").trim().toLowerCase();
    return roles.find(role => role.id.toLowerCase() === value || role.nombre.toLowerCase() === value) || null;
}

function renderRoleOptions(selectedReference = roleSelect.value) {
    const roles = readRoles();
    const selectedRole = findRole(selectedReference, roles);
    const availableRoles = roles.filter(role => role.estado === "active");
    if (selectedRole && !availableRoles.some(role => role.id === selectedRole.id)) availableRoles.unshift(selectedRole);
    availableRoles.sort((first, second) => first.nombre.localeCompare(second.nombre, "es"));
    roleSelect.innerHTML = "<option value=\"\">Selecciona un rol</option>";
    availableRoles.forEach(role => {
        const option = document.createElement("option");
        option.value = role.id;
        option.textContent = role.estado === "inactive" ? `${role.nombre} (Inactivo)` : role.nombre;
        roleSelect.appendChild(option);
    });
    if (!availableRoles.length) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No hay roles creados";
        option.disabled = true;
        roleSelect.appendChild(option);
    }
    if (selectedRole) roleSelect.value = selectedRole.id;
}

function normalizeUser(user) {
    const name = String(user.nombre || "").trim();
    return {
        idUsuario: String(user.idUsuario || `USR-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
        idRol: String(user.idRol || ""),
        documento: String(user.documento || ""),
        nombre: name,
        telefono: String(user.telefono || ""),
        usuario: String(user.usuario || ""),
        contrasena: String(user.contrasena || ""),
        estado: user.estado === "inactive" ? "inactive" : "active",
        negocioId: business.id,
        negocioNombre: business.name
    };
}

function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function initials(name) {
    const parts = String(name || "N").trim().split(/\s+/).filter(Boolean);
    return (parts.slice(0, 2).map(part => part[0]).join("") || "N").toUpperCase();
}

function persist() {
    scopeApi.writeScoped(STORAGE_KEY, users.map(user => ({ ...user, negocioId: business.id, negocioNombre: business.name })));
}

function filteredUsers() {
    const query = search.value.trim().toLowerCase();
    const state = statusFilter.value;
    return users.filter(user => {
        const matchesQuery = [user.nombre, user.documento, user.usuario, user.idRol].some(value => value.toLowerCase().includes(query));
        return matchesQuery && (state === "all" || user.estado === state);
    });
}

function render() {
    const visibleUsers = filteredUsers();
    const activeCount = users.filter(user => user.estado === "active").length;
    const roleCount = new Set(users.map(user => user.idRol).filter(Boolean)).size;
    document.getElementById("totalUsers").textContent = users.length;
    document.getElementById("activeUsers").textContent = activeCount;
    document.getElementById("usedRoles").textContent = roleCount;
    document.getElementById("resultsCount").textContent = `${visibleUsers.length} ${visibleUsers.length === 1 ? "registro" : "registros"}`;
    rows.innerHTML = visibleUsers.map(user => `
      <tr>
        <td><div class="person-cell"><span class="avatar">${escapeHtml(initials(user.nombre))}</span><span><strong>${escapeHtml(user.nombre || "Sin nombre")}</strong><small>@${escapeHtml(user.usuario || "sin-usuario")}</small></span></div></td>
        <td class="document-cell">${escapeHtml(user.documento || "—")}</td>
        <td class="phone-cell">${escapeHtml(user.telefono || "—")}</td>
        <td><span class="role-pill">${escapeHtml((findRole(user.idRol) || {}).nombre || user.idRol || "Sin rol")}</span></td>
        <td><span class="status-pill ${user.estado === "inactive" ? "inactive" : ""}">${user.estado === "inactive" ? "Inactivo" : "Activo"}</span></td>
        <td><div class="row-actions"><button class="icon-button" type="button" data-action="edit" data-id="${escapeHtml(user.idUsuario)}" title="Editar usuario" aria-label="Editar usuario"><i class="fa-solid fa-pen" aria-hidden="true"></i></button><button class="icon-button" type="button" data-action="toggle" data-id="${escapeHtml(user.idUsuario)}" title="${user.estado === "inactive" ? "Activar usuario" : "Desactivar usuario"}" aria-label="${user.estado === "inactive" ? "Activar usuario" : "Desactivar usuario"}"><i class="fa-solid fa-power-off" aria-hidden="true"></i></button><button class="icon-button" type="button" data-action="delete" data-id="${escapeHtml(user.idUsuario)}" title="Eliminar usuario" aria-label="Eliminar usuario"><i class="fa-solid fa-trash" aria-hidden="true"></i></button></div></td>
      </tr>`).join("");
    const hasRows = visibleUsers.length > 0;
    emptyState.hidden = hasRows;
    if (!hasRows) {
        const hasFilters = Boolean(search.value.trim()) || statusFilter.value !== "all";
        emptyTitle.textContent = hasFilters ? "No encontramos coincidencias" : "Aún no hay usuarios";
        emptyText.textContent = hasFilters ? "Prueba con otros términos o limpia los filtros." : "Crea el primer acceso para comenzar a organizar tu equipo.";
        document.getElementById("emptyAction").hidden = hasFilters;
    }
}

function showToast(text) {
    clearTimeout(toastTimer);
    toast.textContent = text;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function resetForm() {
    editingId = "";
    form.reset();
    document.getElementById("dialogTitle").textContent = "Agregar usuario";
    document.getElementById("contrasena").required = true;
    document.getElementById("contrasena").placeholder = "••••••••";
    document.getElementById("formMessage").textContent = "";
    document.getElementById("contrasena").type = "password";
    document.querySelector("#togglePassword i").className = "fa-solid fa-eye";
}

function openDialog(user) {
    resetForm();
    renderRoleOptions(user ? user.idRol : "");
    if (user) {
        editingId = user.idUsuario;
        document.getElementById("dialogTitle").textContent = "Editar usuario";
        fields.forEach(field => { if (field !== "contrasena" && field !== "idRol") document.getElementById(field).value = user[field] || ""; });
        document.getElementById("contrasena").required = false;
        document.getElementById("contrasena").placeholder = "Dejar vacía para conservarla";
    }
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    setTimeout(() => document.getElementById("nombre").focus(), 0);
}

function closeDialog() {
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
    resetForm();
}

document.getElementById("newUser").addEventListener("click", () => openDialog());
document.getElementById("emptyAction").addEventListener("click", () => openDialog());
document.getElementById("closeDialog").addEventListener("click", closeDialog);
document.getElementById("cancelDialog").addEventListener("click", closeDialog);
dialog.addEventListener("click", event => { if (event.target === dialog) closeDialog(); });
search.addEventListener("input", render);
statusFilter.addEventListener("change", render);

rows.addEventListener("click", event => {
    const button = event.target.closest('button[data-action="toggle"], button[data-action="delete"]');
    if (!button) return;
    const user = users.find(item => item.idUsuario === button.dataset.id);
    if (!user || (button.dataset.action === "toggle" && user.estado !== "active")) return;
    const restriction = relationshipApi?.checkBeforeDeactivate("usuarios", user, button.dataset.action === "delete" ? "delete" : "deactivate");
    if (!restriction) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    relationshipApi?.notify(restriction);
}, true);

document.getElementById("togglePassword").addEventListener("click", () => {
    const input = document.getElementById("contrasena");
    const icon = document.querySelector("#togglePassword i");
    input.type = input.type === "password" ? "text" : "password";
    icon.className = input.type === "password" ? "fa-solid fa-eye" : "fa-solid fa-eye-slash";
});

rows.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const user = users.find(item => item.idUsuario === button.dataset.id);
    if (!user) return;
    if (button.dataset.action === "edit") openDialog(user);
    if (button.dataset.action === "toggle") {
        user.estado = user.estado === "active" ? "inactive" : "active";
        persist();
        render();
        showToast(user.estado === "active" ? "Usuario activado" : "Usuario desactivado");
    }
    if (button.dataset.action === "delete") {
        const confirmed = window.NodixAlert?.confirm
            ? await window.NodixAlert.confirm({
                type: "confirm",
                title: "¿Eliminar usuario?",
                message: `Se eliminará el usuario “${user.nombre || "seleccionado"}”. Esta acción no se puede deshacer.`,
                confirmText: "Eliminar usuario"
            })
            : false;
        if (!confirmed) return;
        users = users.filter(item => item.idUsuario !== user.idUsuario);
        persist();
        render();
        showToast("Usuario eliminado");
    }
});

form.addEventListener("submit", event => {
    event.preventDefault();
    message.textContent = "";
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());
    const current = editingId ? users.find(user => user.idUsuario === editingId) : null;
    if (!values.idRol.trim()) { message.textContent = "Indica el rol de acceso del usuario."; return; }
    if (current && users.some(user => user.usuario.toLowerCase() === values.usuario.trim().toLowerCase() && user.idUsuario !== editingId)) { message.textContent = "Ese nombre de usuario ya está en uso."; return; }
    const record = normalizeUser({ ...current, ...values, idUsuario: editingId || values.idUsuario || `USR-${Date.now()}`, contrasena: values.contrasena || (current && current.contrasena), estado: current ? current.estado : "active" });
    if (current) users = users.map(user => user.idUsuario === editingId ? record : user);
    else users = [record, ...users];
    persist();
    closeDialog();
    render();
    showToast(current ? "Usuario actualizado" : "Usuario creado");
});

renderRoleOptions();
render();

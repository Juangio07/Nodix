"use strict";

const STORAGE_KEY = "Nodix_roles_v1";
const scopeApi = window.NodixBusinessScope;
const relationshipApi = window.NodixRelationshipGuard;
const PERMISSION_MODULES = [
    { key: "ventas", label: "Ventas", icon: "fa-receipt" },
    { key: "articulos", label: "Artículos", icon: "fa-boxes-stacked" },
    { key: "categorias", label: "Categorías", icon: "fa-layer-group" },
    { key: "clientes", label: "Clientes", icon: "fa-address-book" },
    { key: "gastos", label: "Gastos", icon: "fa-money-bill-wave" },
    { key: "mercancia", label: "Mercancía", icon: "fa-truck-ramp-box" },
    { key: "usuarios", label: "Usuarios", icon: "fa-user" },
    { key: "roles", label: "Roles", icon: "fa-key" },
    { key: "configuracion", label: "Configuración", icon: "fa-gear" },
    { key: "estadisticas", label: "Estadísticas", icon: "fa-chart-line" }
];
const PERMISSION_ACTIONS = [
    { key: "crear", label: "Crear" },
    { key: "editar", label: "Editar" },
    { key: "estado", label: "Activar / inactivar" },
    { key: "eliminar", label: "Eliminar" }
];
const dialog = document.getElementById("roleDialog");
const form = document.getElementById("roleForm");
const rows = document.getElementById("rolesRows");
const emptyState = document.getElementById("emptyState");
const search = document.getElementById("searchRoles");
const statusFilter = document.getElementById("statusFilter");
const message = document.getElementById("formMessage");
const toast = document.getElementById("toast");
const roleType = document.getElementById("roleType");
const permissionsGrid = document.getElementById("permissionsGrid");
const permissionNote = document.getElementById("permissionNote");
let business = scopeApi.getBusiness();
let roles = readRoles();
let editingId = "";
let toastTimer;

function isOwnerName(name) {
    const normalized = String(name || "").trim().toLowerCase();
    return normalized.includes("admin") || normalized.includes("dueño") || normalized.includes("dueno") || normalized === "owner";
}

function allPermissions() {
    return Object.fromEntries(PERMISSION_MODULES.map(module => [module.key, {
        ver: true,
        crear: true,
        editar: true,
        estado: true,
        eliminar: true
    }]));
}

function hasPermissionValue(value, keys) {
    return keys.some(key => value && value[key] === true);
}

function normalizePermissions(value, type = "custom") {
    const source = value && typeof value === "object" ? value : {};
    const owner = type === "owner";
    return Object.fromEntries(PERMISSION_MODULES.map(module => {
        const current = source[module.key] && typeof source[module.key] === "object" ? source[module.key] : {};
        const canView = owner || hasPermissionValue(current, ["ver", "view"]);
        return [module.key, {
            ver: canView,
            crear: canView && (owner || hasPermissionValue(current, ["crear", "create"])),
            editar: canView && (owner || hasPermissionValue(current, ["editar", "edit"])),
            estado: canView && (owner || hasPermissionValue(current, ["estado", "toggle", "activar"])),
            eliminar: canView && (owner || hasPermissionValue(current, ["eliminar", "delete"]))
        }];
    }));
}

function readRoles() {
    const result = scopeApi.readScoped(STORAGE_KEY);
    business = result.business;
    return result.records.map(normalizeRole);
}

function normalizeRole(role) {
    const name = String(role.nombre || "").trim();
    const owner = role.tipo === "owner" || role.protegido === true || isOwnerName(name);
    return {
        id: String(role.id || role.idRol || `ROL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
        nombre: name,
        descripcion: String(role.descripcion || role.descripcionRol || "").trim(),
        estado: role.estado === "inactive" ? "inactive" : "active",
        tipo: owner ? "owner" : "custom",
        protegido: owner,
        permisos: normalizePermissions(role.permisos, owner ? "owner" : "custom"),
        negocioId: business.id,
        negocioNombre: business.name
    };
}

function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function getUsers() {
    try { return scopeApi.readScoped("Nodix_usuarios_v1").records; } catch { return []; }
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
        <td><div class="person-cell"><span class="avatar"><i class="fa-solid fa-key" aria-hidden="true"></i></span><span><strong>${escapeHtml(role.nombre || "Sin nombre")}</strong></span></div></td>
        <td class="document-cell">${escapeHtml(role.descripcion || "Sin descripción")}</td>
        <td><span class="role-pill"><i class="fa-solid fa-user-group" aria-hidden="true"></i> ${assignedTo(role)}</span></td>
        <td><span class="status-pill ${role.estado === "inactive" ? "inactive" : ""}">${role.estado === "inactive" ? "Inactivo" : "Activo"}</span></td>
        <td><div class="row-actions"><button class="icon-button" type="button" data-action="edit" data-id="${escapeHtml(role.id)}" title="Editar rol" aria-label="Editar rol"><i class="fa-solid fa-pen" aria-hidden="true"></i></button><button class="icon-button" type="button" data-action="toggle" data-id="${escapeHtml(role.id)}" title="${role.protegido ? "Rol protegido" : role.estado === "inactive" ? "Activar rol" : "Desactivar rol"}" aria-label="${role.protegido ? "Rol protegido" : role.estado === "inactive" ? "Activar rol" : "Desactivar rol"}"><i class="fa-solid fa-power-off" aria-hidden="true"></i></button><button class="icon-button" type="button" data-action="delete" data-id="${escapeHtml(role.id)}" title="${role.protegido ? "Rol protegido" : "Eliminar rol"}" aria-label="${role.protegido ? "Rol protegido" : "Eliminar rol"}"><i class="fa-solid fa-trash" aria-hidden="true"></i></button></div></td>
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

function renderPermissionMatrix(value = {}, type = roleType.value) {
    const permissions = normalizePermissions(value, type);
    permissionsGrid.innerHTML = PERMISSION_MODULES.map(module => {
        const current = permissions[module.key];
        return `<div class="permission-row" data-module="${module.key}"><div class="permission-module"><div class="permission-module-title"><i class="fa-solid ${module.icon}" aria-hidden="true"></i><span><strong>${module.label}</strong><small>Acceso al módulo</small></span></div><label class="permission-check permission-view"><input type="checkbox" data-permission-action="ver" ${current.ver ? "checked" : ""}><span>Ver módulo</span></label></div><div class="permission-actions">${PERMISSION_ACTIONS.map(action => `<label class="permission-check"><input type="checkbox" data-permission-action="${action.key}" ${current[action.key] ? "checked" : ""}><span>${action.label}</span></label>`).join("")}</div></div>`;
    }).join("");
    permissionsGrid.querySelectorAll("input").forEach(input => input.addEventListener("change", event => {
        if (event.target.dataset.permissionAction === "ver" && event.target.checked) {
            event.target.closest(".permission-row").querySelectorAll(".permission-actions input").forEach(action => { action.checked = true; });
        }
        updatePermissionControls();
    }));
    updatePermissionControls();
}

function updatePermissionControls() {
    const owner = roleType.value === "owner";
    permissionsGrid.querySelectorAll(".permission-row").forEach(row => {
        const view = row.querySelector('[data-permission-action="ver"]');
        const actions = row.querySelectorAll('.permission-actions input[data-permission-action]');
        actions.forEach(input => {
            if (!view.checked) input.checked = false;
            input.disabled = owner || !view.checked;
        });
        view.disabled = owner;
        row.classList.toggle("is-unavailable", !view.checked);
    });
    permissionNote.textContent = owner ? "El perfil Administrador / Dueño tiene acceso total y sus permisos están protegidos." : "Activa primero “Ver módulo”. Después podrás habilitar las acciones permitidas.";
}

function readPermissionsFromForm() {
    return Object.fromEntries(PERMISSION_MODULES.map(module => {
        const row = permissionsGrid.querySelector(`[data-module="${module.key}"]`);
        const read = key => row && row.querySelector(`[data-permission-action="${key}"]`).checked === true;
        return [module.key, { ver: read("ver"), crear: read("crear"), editar: read("editar"), estado: read("estado"), eliminar: read("eliminar") }];
    }));
}

function showToast(text) {
    clearTimeout(toastTimer);
    toast.textContent = text;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}

function resetForm() {
    editingId = "";
    form.reset();
    roleType.disabled = false;
    roleType.value = "custom";
    document.getElementById("dialogTitle").textContent = "Agregar rol";
    message.textContent = "";
    renderPermissionMatrix({}, "custom");
}

function openDialog(role) {
    resetForm();
    if (role) {
        editingId = role.id;
        document.getElementById("dialogTitle").textContent = "Editar rol";
        document.getElementById("roleId").value = role.id;
        document.getElementById("roleName").value = role.nombre;
        document.getElementById("roleDescription").value = role.descripcion;
        roleType.value = role.tipo;
        roleType.disabled = role.protegido;
        renderPermissionMatrix(role.permisos, role.tipo);
    }
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    setTimeout(() => document.getElementById("roleName").focus(), 0);
}

function closeDialog() {
    if (dialog.open && typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    resetForm();
}

function persist() {
    scopeApi.writeScoped(STORAGE_KEY, roles.map(role => ({ ...role, negocioId: business.id, negocioNombre: business.name })));
}

document.getElementById("newRole").addEventListener("click", () => openDialog());
document.getElementById("emptyAction").addEventListener("click", () => openDialog());
document.getElementById("closeDialog").addEventListener("click", closeDialog);
document.getElementById("cancelDialog").addEventListener("click", closeDialog);
dialog.addEventListener("click", event => { if (event.target === dialog) closeDialog(); });
search.addEventListener("input", render);
statusFilter.addEventListener("change", render);
rows.addEventListener("click", event => {
    const button = event.target.closest('button[data-action="toggle"], button[data-action="delete"]');
    if (!button) return;
    const role = roles.find(item => item.id === button.dataset.id);
    if (!role || (button.dataset.action === "toggle" && role.estado !== "active")) return;
    const restriction = relationshipApi?.checkBeforeDeactivate("roles", role, button.dataset.action === "delete" ? "delete" : "deactivate");
    if (!restriction) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    relationshipApi?.notify(restriction);
}, true);
roleType.addEventListener("change", () => {
    const current = readPermissionsFromForm();
    renderPermissionMatrix(roleType.value === "owner" ? allPermissions() : current, roleType.value);
});
document.getElementById("selectAllPermissions").addEventListener("click", () => {
    if (roleType.value === "owner") return;
    permissionsGrid.querySelectorAll("input").forEach(input => { input.checked = true; });
    updatePermissionControls();
});
document.getElementById("clearPermissions").addEventListener("click", () => {
    if (roleType.value === "owner") return;
    permissionsGrid.querySelectorAll("input").forEach(input => { input.checked = false; });
    updatePermissionControls();
});

rows.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const role = roles.find(item => item.id === button.dataset.id);
    if (!role) return;
    if (button.dataset.action === "edit") openDialog(role);
    if (button.dataset.action === "toggle") {
        if (role.protegido) { showToast("El rol Administrador / Dueño está protegido."); return; }
        role.estado = role.estado === "active" ? "inactive" : "active";
        persist();
        render();
        showToast(role.estado === "active" ? "Rol activado" : "Rol desactivado");
    }
    if (button.dataset.action === "delete") {
        if (role.protegido) { showToast("El rol Administrador / Dueño está protegido."); return; }
        if (assignedTo(role) > 0) { showToast("No puedes eliminar un rol con usuarios asignados."); return; }
        const confirmed = window.NodixAlert?.confirm
            ? await window.NodixAlert.confirm({
                type: "confirm",
                title: "¿Eliminar rol?",
                message: `Se eliminará el rol “${role.nombre || "seleccionado"}”. Esta acción no se puede deshacer.`,
                confirmText: "Eliminar rol"
            })
            : false;
        if (!confirmed) return;
        roles = roles.filter(item => item.id !== role.id);
        persist();
        render();
        showToast("Rol eliminado");
    }
});

form.addEventListener("submit", event => {
    event.preventDefault();
    message.textContent = "";
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());
    const name = values.nombre.trim();
    const type = roleType.value === "owner" ? "owner" : "custom";
    if (roles.some(role => role.nombre.toLowerCase() === name.toLowerCase() && role.id !== editingId)) { message.textContent = "Ya existe un rol con ese nombre."; return; }
    const wasEditing = Boolean(editingId);
    const current = roles.find(role => role.id === editingId);
    const record = normalizeRole({ ...current, id: editingId || `ROL-${Date.now()}`, nombre: name, descripcion: values.descripcion.trim(), tipo: type, protegido: current ? current.protegido || type === "owner" : type === "owner", permisos: readPermissionsFromForm(), estado: current ? current.estado : "active" });
    roles = wasEditing ? roles.map(role => role.id === editingId ? record : role) : [record, ...roles];
    persist();
    closeDialog();
    render();
    showToast(wasEditing ? "Rol actualizado" : "Rol creado");
});

renderPermissionMatrix();
render();

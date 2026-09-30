"use strict";

const STORAGE_KEY = "Nodix_usuarios_frontend_v1";
const ROLES_STORAGE_KEY = "Nodix_roles_frontend_v1";
const tabla = document.getElementById("tablaUsuarios");
const estadoVacio = document.getElementById("estadoVacio");
const contador = document.getElementById("contadorUsuarios");
const buscador = document.getElementById("buscarUsuarios");
const filtroEstado = document.getElementById("filtroEstado");
const paginacion = document.getElementById("paginacion");
const modal = document.getElementById("modalUsuario");
const formulario = document.getElementById("formularioUsuario");
const tituloModal = document.getElementById("tituloModal");
const mensajeFormulario = document.getElementById("mensajeFormulario");
const toast = document.getElementById("toastUsuarios");
const confirmacionEliminar = document.getElementById("confirmacionEliminar");
const textoConfirmacion = document.getElementById("textoConfirmacion");
let usuarioPendienteEliminar = null;

const campos = ["idUsuario", "idRol", "documento", "nombre", "telefono", "usuario", "contrasena"];
const selectorRol = document.getElementById("idRol");
let roles = cargarRoles();
let usuarios = cargarUsuarios();
let paginaActual = 1;
const usuariosPorPagina = 8;
let toastTimer;

function cargarRoles() {
    try {
        const guardados = JSON.parse(localStorage.getItem(ROLES_STORAGE_KEY) || "[]");
        return Array.isArray(guardados) ? guardados.map(rol => ({
            idRol: rol.idRol ?? rol.IdRol,
            nombre: rol.nombre ?? rol.Nombre ?? rol.nombreRol ?? rol.NombreRol
        })).filter(rol => rol.idRol !== undefined && rol.nombre) : [];
    } catch {
        return [];
    }
}

function renderizarRoles() {
    selectorRol.innerHTML = roles.length
        ? `<option value="">Selecciona un rol</option>${roles.map(rol => `<option value="${escapar(rol.idRol)}">${escapar(rol.nombre)}</option>`).join("")}`
        : `<option value="">No hay roles disponibles</option>`;
    selectorRol.disabled = roles.length === 0;
}

function nombreRol(idRol) {
    return roles.find(rol => String(rol.idRol) === String(idRol))?.nombre || "Rol no disponible";
}

function usuariosFiltrados() {
    const termino = buscador.value.trim().toLowerCase();
    return usuarios.filter(usuario => {
        const coincideTexto = [usuario.nombre, usuario.documento, usuario.usuario].some(valor => String(valor || "").toLowerCase().includes(termino));
        const coincideEstado = filtroEstado.value === "all" || (filtroEstado.value === "active" ? usuario.activo : !usuario.activo);
        return coincideTexto && coincideEstado;
    });
}

function cargarUsuarios() {
    try {
        const guardados = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(guardados) ? guardados.map(usuario => ({ ...usuario, contrasena: "" })) : [];
    } catch {
        return [];
    }
}

function guardarUsuarios() {
    const usuariosSinContrasenas = usuarios.map(({ contrasena, ...usuario }) => usuario);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usuariosSinContrasenas));
}

function escapar(texto) {
    return String(texto ?? "").replace(/[&<>'"]/g, caracter => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[caracter]));
}

function renderizar() {
    const filtrados = usuariosFiltrados();
    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / usuariosPorPagina));
    paginaActual = Math.min(paginaActual, totalPaginas);
    const inicio = (paginaActual - 1) * usuariosPorPagina;
    tabla.innerHTML = filtrados.slice(inicio, inicio + usuariosPorPagina).map(usuario => `
        <tr>
            <td><span class="user-name">${escapar(usuario.nombre)}</span><span class="user-login">${escapar(usuario.usuario)}</span></td>
            <td>${escapar(usuario.documento)}</td>
            <td>${escapar(usuario.telefono || "—")}</td>
            <td>${escapar(nombreRol(usuario.idRol))}</td>
            <td><span class="status-badge ${usuario.activo ? "" : "inactive"}"><span class="status-dot"></span>${usuario.activo ? "Activo" : "Inactivo"}</span></td>
            <td><div class="row-actions">
                <button class="row-action edit" type="button" data-action="edit" data-id="${escapar(usuario.idUsuario)}" aria-label="Editar ${escapar(usuario.nombre)}"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
                <button class="row-action deactivate" type="button" data-action="toggle" data-id="${escapar(usuario.idUsuario)}" aria-label="Cambiar estado de ${escapar(usuario.nombre)}"><i class="fa-solid fa-power-off" aria-hidden="true"></i></button>
                <button class="row-action delete" type="button" data-action="delete" data-id="${escapar(usuario.idUsuario)}" aria-label="Eliminar ${escapar(usuario.nombre)}"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
            </div></td>
        </tr>`).join("");
    estadoVacio.hidden = filtrados.length > 0;
    contador.textContent = `${filtrados.length} ${filtrados.length === 1 ? "usuario" : "usuarios"}`;
    renderizarPaginacion(totalPaginas, filtrados.length);
}

function renderizarPaginacion(totalPaginas, totalRegistros) {
    paginacion.hidden = totalRegistros === 0;
    if (totalRegistros === 0) return;
    const grupoInicio = Math.floor((paginaActual - 1) / 3) * 3 + 1;
    const grupoFin = Math.min(grupoInicio + 2, totalPaginas);
    const paginaAnterior = paginaActual - 1;
    const paginaSiguiente = paginaActual + 1;
    paginacion.innerHTML = `<button class="page-button" type="button" data-page="${paginaAnterior}" ${paginaAnterior < 1 ? "disabled" : ""} aria-label="Página anterior"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>${Array.from({ length: grupoFin - grupoInicio + 1 }, (_, indice) => { const pagina = grupoInicio + indice; return `<button class="page-button ${pagina === paginaActual ? "active" : ""}" type="button" data-page="${pagina}" aria-current="${pagina === paginaActual ? "page" : "false"}">${pagina}</button>`; }).join("")}<button class="page-button" type="button" data-page="${paginaSiguiente}" ${paginaSiguiente > totalPaginas ? "disabled" : ""} aria-label="Página siguiente"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>`;
}

function abrirModal(usuario) {
    formulario.reset();
    mensajeFormulario.textContent = "";
    tituloModal.textContent = usuario ? "Editar usuario" : "Agregar usuario";
    campos.forEach(campo => { const elemento = document.getElementById(campo); elemento.value = usuario?.[campo === "contrasena" ? "contrasena" : campo] || ""; });
    document.getElementById("contrasena").required = !usuario;
    document.getElementById("confirmarContrasena").required = !usuario;
    limpiarErrores();
    modal.hidden = false;
    document.getElementById("idRol").focus();
}

function cerrarModal() { modal.hidden = true; }

function mostrarToast(texto) { clearTimeout(toastTimer); toast.textContent = texto; toast.classList.add("show"); toastTimer = setTimeout(() => toast.classList.remove("show"), 2400); }

function limpiarErrores() { formulario.querySelectorAll(".invalid").forEach(elemento => elemento.classList.remove("invalid")); mensajeFormulario.textContent = ""; }

function marcarInvalido(id, mensaje) { const elemento = document.getElementById(id); elemento.classList.add("invalid"); mensajeFormulario.textContent = mensaje; elemento.focus(); return false; }

function alternarContrasena(id, boton) { const campo = document.getElementById(id); const visible = campo.type === "text"; campo.type = visible ? "password" : "text"; boton.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña"); boton.title = visible ? "Mostrar contraseña" : "Ocultar contraseña"; boton.querySelector("i").className = `fa-solid fa-toggle-${visible ? "off" : "on"}`; }

document.getElementById("nuevoUsuario").addEventListener("click", () => abrirModal());
document.getElementById("cerrarModal").addEventListener("click", cerrarModal);
document.getElementById("cancelarModal").addEventListener("click", cerrarModal);
document.getElementById("cancelarEliminacion").addEventListener("click", () => { usuarioPendienteEliminar = null; confirmacionEliminar.hidden = true; });
document.getElementById("confirmarEliminacion").addEventListener("click", () => {
    if (!usuarioPendienteEliminar) return;
    usuarios = usuarios.filter(item => item.idUsuario !== usuarioPendienteEliminar.idUsuario);
    guardarUsuarios(); renderizar(); mostrarToast("Usuario eliminado");
    usuarioPendienteEliminar = null; confirmacionEliminar.hidden = true;
});
modal.addEventListener("click", evento => { if (evento.target === modal) cerrarModal(); });
buscador.addEventListener("input", () => { paginaActual = 1; renderizar(); });
filtroEstado.addEventListener("change", () => { paginaActual = 1; renderizar(); });
document.getElementById("mostrarContrasena").addEventListener("click", evento => alternarContrasena("contrasena", evento.currentTarget));
document.getElementById("mostrarConfirmarContrasena").addEventListener("click", evento => alternarContrasena("confirmarContrasena", evento.currentTarget));
paginacion.addEventListener("click", evento => { const boton = evento.target.closest("button[data-page]"); if (!boton || boton.disabled) return; paginaActual = Number(boton.dataset.page); renderizar(); });

formulario.addEventListener("submit", evento => {
    evento.preventDefault();
    limpiarErrores();
    if (!formulario.reportValidity()) { const invalido = formulario.querySelector(":invalid"); if (invalido) invalido.classList.add("invalid"); return; }
    const id = document.getElementById("idUsuario").value;
    const usuario = Object.fromEntries(campos.map(campo => [campo, document.getElementById(campo).value.trim()]));
    if (!/^\d+$/.test(usuario.documento)) return marcarInvalido("documento", "El documento debe contener solo números.");
    if (usuario.telefono && !/^\d+$/.test(usuario.telefono)) return marcarInvalido("telefono", "El teléfono debe contener solo números.");
    if (!/^[a-zA-Z0-9]+$/.test(usuario.usuario)) return marcarInvalido("usuario", "El usuario debe contener solo letras y números.");
    if (usuario.contrasena !== document.getElementById("confirmarContrasena").value) return marcarInvalido("confirmarContrasena", "Las contraseñas no coinciden.");
    const usuarioNormalizado = usuario.usuario.toLowerCase();
    const duplicado = usuarios.some(item => String(item.usuario || "").trim().toLowerCase() === usuarioNormalizado && String(item.idUsuario) !== String(id));
    if (duplicado) { mensajeFormulario.textContent = "El nombre de usuario ya está registrado."; return; }
    if (id) {
        const indice = usuarios.findIndex(item => item.idUsuario === id);
        if (indice >= 0) usuarios[indice] = { ...usuarios[indice], ...usuario };
        mostrarToast("Usuario actualizado");
    } else {
        usuarios.push({ ...usuario, idUsuario: crypto.randomUUID(), activo: true });
        mostrarToast("Usuario agregado");
    }
    guardarUsuarios(); renderizar(); cerrarModal();
});

tabla.addEventListener("click", evento => {
    const boton = evento.target.closest("button[data-action]");
    if (!boton) return;
    const usuario = usuarios.find(item => item.idUsuario === boton.dataset.id);
    if (!usuario) return;
    if (boton.dataset.action === "edit") abrirModal(usuario);
    if (boton.dataset.action === "toggle") { usuario.activo = !usuario.activo; guardarUsuarios(); renderizar(); mostrarToast(`Usuario ${usuario.activo ? "activado" : "desactivado"}`); }
    if (boton.dataset.action === "delete") mostrarConfirmacionEliminar(usuario);
});

function mostrarConfirmacionEliminar(usuario) {
    if (window.parent !== window) {
        window.parent.postMessage({ type: "fixelar-confirm-delete", message: `Vas a eliminar a ${usuario.nombre}. Esta acción no se puede deshacer.` }, "*");
        usuarioPendienteEliminar = usuario;
        return;
    }
    usuarioPendienteEliminar = usuario;
    textoConfirmacion.textContent = `Vas a eliminar a ${usuario.nombre}. Esta acción no se puede deshacer.`;
    confirmacionEliminar.hidden = false;
    document.getElementById("cancelarEliminacion").focus();
}

window.addEventListener("message", event => {
    if (event.data?.type !== "fixelar-confirm-delete-result" || !usuarioPendienteEliminar) return;
    if (event.data.confirmed) {
        usuarios = usuarios.filter(item => item.idUsuario !== usuarioPendienteEliminar.idUsuario);
        guardarUsuarios(); renderizar(); mostrarToast("Usuario eliminado");
    }
    usuarioPendienteEliminar = null;
});

renderizar();
renderizarRoles();

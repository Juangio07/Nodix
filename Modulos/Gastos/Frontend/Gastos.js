"use strict";

const STORAGE_KEY = "Nodix_gastos_v1";
const LEGACY_STORAGE_KEY = "Nodix_gastos";
const scopeApi = window.NodixBusinessScope;
const currencyApi = window.NodixCurrencyInput;
const dialog = document.getElementById("expenseDialog");
const form = document.getElementById("expenseForm");
const rows = document.getElementById("expensesRows");
const emptyState = document.getElementById("emptyState");
const search = document.getElementById("searchExpenses");
const message = document.getElementById("formMessage");
const toast = document.getElementById("toast");
const amountInput = document.getElementById("valorTotal");
currencyApi.bind(amountInput);
let business = scopeApi.getBusiness();
let expenses = readExpenses();
let editingId = "";
let toastTimer;
const money = value => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value) || 0);
const safe = value => String(value || "").replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[character]));
const localDate = (date = new Date()) => { const copy = new Date(date); copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset()); return copy.toISOString().slice(0, 10); };
function readExpenses() { const result = scopeApi.readScoped(STORAGE_KEY, LEGACY_STORAGE_KEY); business = result.business; return result.records.map(normalize); }
function normalize(item) { return { id: String(item.id || `GAS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`), descripcion: String(item.descripcion || "").trim(), valorTotal: Number(item.valorTotal || item.valor) || 0, fecha: String(item.fecha || "").slice(0, 10), negocioId: business.id, negocioNombre: business.name }; }
function persist() { scopeApi.writeScoped(STORAGE_KEY, expenses.map(item => ({ ...item, negocioId: business.id, negocioNombre: business.name }))); }
function filtered() { const query = search.value.trim().toLowerCase(); return expenses.filter(item => `${item.descripcion} ${item.fecha}`.toLowerCase().includes(query)); }
function currentMonthTotal() { const month = localDate().slice(0, 7); return expenses.filter(item => item.fecha.startsWith(month)).reduce((sum, item) => sum + item.valorTotal, 0); }
function render() { const visible = filtered(); document.getElementById("totalExpenses").textContent = expenses.length; document.getElementById("expensesValue").textContent = money(expenses.reduce((sum, item) => sum + item.valorTotal, 0)); document.getElementById("monthValue").textContent = money(currentMonthTotal()); document.getElementById("resultsCount").textContent = `${visible.length} ${visible.length === 1 ? "registro" : "registros"}`; rows.innerHTML = visible.map(item => `<tr><td class="document-cell"><strong>${safe(item.descripcion || "Sin descripción")}</strong></td><td class="phone-cell">${money(item.valorTotal)}</td><td class="phone-cell">${safe(item.fecha || "—")}</td><td><div class="row-actions"><button class="icon-button" type="button" data-action="edit" data-id="${safe(item.id)}" aria-label="Editar gasto"><i class="fa-solid fa-pen" aria-hidden="true"></i></button><button class="icon-button" type="button" data-action="delete" data-id="${safe(item.id)}" aria-label="Eliminar gasto"><i class="fa-solid fa-trash" aria-hidden="true"></i></button></div></td></tr>`).join(""); emptyState.hidden = visible.length > 0; if (!visible.length) { const filteredBySearch = Boolean(search.value.trim()); document.getElementById("emptyTitle").textContent = filteredBySearch ? "No encontramos coincidencias" : "Aún no hay gastos"; document.getElementById("emptyText").textContent = filteredBySearch ? "Prueba con otra búsqueda." : "Registra el primer movimiento para comenzar."; document.getElementById("emptyAction").hidden = filteredBySearch; } }
function showToast(text) { clearTimeout(toastTimer); toast.textContent = text; toast.classList.add("show"); toastTimer = setTimeout(() => toast.classList.remove("show"), 2300); }
function resetForm() { editingId = ""; form.reset(); currencyApi.setValue(amountInput, 0); document.getElementById("dialogTitle").textContent = "Agregar gasto"; document.getElementById("fecha").value = localDate(); message.textContent = ""; }
function openDialog(item) { resetForm(); if (item) { editingId = item.id; document.getElementById("dialogTitle").textContent = "Editar gasto"; document.getElementById("expenseId").value = item.id; document.getElementById("descripcion").value = item.descripcion; currencyApi.setValue(amountInput, item.valorTotal); document.getElementById("fecha").value = item.fecha; } if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", ""); setTimeout(() => document.getElementById("descripcion").focus(), 0); }
function closeDialog() { if (dialog.open && dialog.close) dialog.close(); else dialog.removeAttribute("open"); resetForm(); }
document.getElementById("newExpense").addEventListener("click", () => openDialog()); document.getElementById("emptyAction").addEventListener("click", () => openDialog()); document.getElementById("closeDialog").addEventListener("click", closeDialog); document.getElementById("cancelDialog").addEventListener("click", closeDialog); dialog.addEventListener("click", event => { if (event.target === dialog) closeDialog(); }); search.addEventListener("input", render);
rows.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const item = expenses.find(expense => expense.id === button.dataset.id);
    if (!item) return;
    if (button.dataset.action === "edit") openDialog(item);
    if (button.dataset.action === "delete") {
        const confirmed = window.NodixAlert?.confirm
            ? await window.NodixAlert.confirm({
                type: "confirm",
                title: "¿Eliminar gasto?",
                message: "Se eliminará este gasto. Esta acción no se puede deshacer.",
                confirmText: "Eliminar gasto"
            })
            : false;
        if (!confirmed) return;
        expenses = expenses.filter(expense => expense.id !== item.id);
        persist();
        render();
        showToast("Gasto eliminado");
    }
});
form.addEventListener("submit", event => { event.preventDefault(); message.textContent = ""; if (!form.reportValidity()) return; const values = Object.fromEntries(new FormData(form).entries()); const current = expenses.find(item => item.id === editingId); const wasEditing = Boolean(editingId); const record = normalize({ ...current, id: editingId || `GAS-${Date.now()}`, descripcion: values.descripcion.trim(), valorTotal: currencyApi.number(amountInput), fecha: values.fecha }); expenses = wasEditing ? expenses.map(item => item.id === editingId ? record : item) : [record, ...expenses]; persist(); closeDialog(); render(); showToast(wasEditing ? "Gasto actualizado" : "Gasto creado"); });
render();

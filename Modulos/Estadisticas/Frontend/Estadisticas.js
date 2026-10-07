"use strict";

const scopeApi = window.NodixBusinessScope;
const money = value => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value) || 0);
const number = value => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Number(value) || 0);
const safe = value => String(value || "").replace(/[&<>'"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[character]));
const business = scopeApi.getBusiness();
const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");
const periodLabel = document.getElementById("periodLabel");
const feedback = document.getElementById("reportFeedback");
const saleKeys = ["Nodix_ventas_v2", "Nodix_ventas_v1", "Nodix_ventas", "Nodix_sales_v1", "Nodix_sales"];
const expenseKeys = ["Nodix_gastos_v1", "Nodix_gastos"];
const articleKeys = ["Nodix_articulos_v2", "Nodix_articulos_v1", "Nodix_articulos"];
const categoryKeys = ["Nodix_categorias_v1", "Nodix_categorias"];
const refundKeys = ["Nodix_devoluciones_v1", "Nodix_reembolsos_v1"];
const closureKey = "Nodix_cierres_caja_v1";
const fallbackChartPalette = ["#FFDF00", "#FF8B2B", "#172238", "#5F7FC8", "#D96A9E"];
const getChartPalette = () => window.NodixTheme?.chartPalette || window.FIXELAR_APP?.theme?.chartPalette || fallbackChartPalette;

const closureDate = document.getElementById("closureDate");
const cashOpening = document.getElementById("cashOpening");
const cashCounted = document.getElementById("cashCounted");
const closureFeedback = document.getElementById("closureFeedback");
const closureStatus = document.getElementById("closureStatus");
let currentClosureSummary = null;
let currentData = null;

function parse(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }
function localDate(date = new Date()) { const copy = new Date(date); copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset()); return copy.toISOString().slice(0, 10); }
function shiftDate(value, amount) { const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + amount); return localDate(date); }
function dateFrom(value) { if (!value) return ""; if (typeof value === "number") return localDate(new Date(value < 100000000000 ? value * 1000 : value)); const text = String(value).trim(); const iso = text.match(/^\d{4}-\d{2}-\d{2}/); if (iso) return iso[0]; const parsed = new Date(text); return Number.isNaN(parsed.getTime()) ? "" : localDate(parsed); }
function numeric(...values) { for (const value of values) { const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, "")); if (Number.isFinite(parsed) && parsed !== 0) return parsed; } return 0; }
function recordsFromKeys(keys) {
    for (const key of keys) {
        const scoped = scopeApi?.readScoped?.(key)?.records;
        if (Array.isArray(scoped)) return scoped;
        const raw = parse(localStorage.getItem(key) || "[]", []);
        if (Array.isArray(raw)) return raw;
        if (raw && Array.isArray(raw[business.id])) return raw[business.id];
    }
    return [];
}
function belongsToBusiness(item) {
    const itemBusiness = item && (item.negocioId || item.businessId || item.idNegocio);
    if (!itemBusiness) return true;
    return String(itemBusiness).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") === business.id;
}
function extractItems(sale) { const value = sale.items || sale.detalle || sale.detalles || sale.productos || sale.articulos || sale.lines || sale.lineas; return Array.isArray(value) ? value : []; }
function normalizeItem(item, sale) { const quantity = numeric(item.cantidad, item.quantity, item.qty, item.unidades) || 1; const lineTotal = numeric(item.valorTotal, item.total, item.subtotal, item.importe, item.valor, item.amount); const unitPrice = numeric(item.precioVenta, item.precio, item.price, item.unitPrice); return { name: String(item.descripcion || item.nombre || item.name || item.articulo || "Artículo sin nombre").trim(), code: String(item.codigo || item.code || "").trim(), quantity, amount: lineTotal || unitPrice * quantity, cost: numeric(item.costo, item.cost) || 0, categoryId: String(item.categoriaId || item.categoryId || item.categoria || "").trim(), categoryName: String(item.categoriaNombre || item.categoryName || "").trim(), date: dateFrom(item.fecha || item.date || sale.date) }; }
function normalizeSale(sale, index) { const date = dateFrom(sale.fecha || sale.fechaVenta || sale.date || sale.createdAt || sale.created_at || sale.timestamp); const items = extractItems(sale).map(item => normalizeItem(item, { date })); const total = numeric(sale.total, sale.totalVenta, sale.valorTotal, sale.monto, sale.amount, sale.subtotal) || items.reduce((sum, item) => sum + item.amount, 0); return { id: String(sale.id || sale.idVenta || sale.numero || `VEN-${index}`), date, total, items }; }
function normalizeExpense(expense) { return { description: String(expense.descripcion || expense.description || "Gasto operativo").trim(), value: numeric(expense.valorTotal, expense.valor, expense.total, expense.amount), date: dateFrom(expense.fecha || expense.date || expense.createdAt) }; }
function normalizeClosureSale(sale, index) { const date = dateFrom(sale.fecha || sale.fechaVenta || sale.date || sale.createdAt || sale.created_at || sale.timestamp); const status = String(sale.estado || sale.status || "completed").trim().toLowerCase(); const payment = String(sale.metodoPago || sale.paymentMethod || sale.medioPago || "Efectivo").trim() || "Efectivo"; const total = numeric(sale.total, sale.totalVenta, sale.valorTotal, sale.monto, sale.amount, sale.subtotal); return { id: String(sale.id || sale.idVenta || sale.numero || `VEN-${index}`), date, total, payment, status }; }
function normalizeRefund(refund, index) { const date = dateFrom(refund.fecha || refund.fechaDevolucion || refund.date || refund.createdAt || refund.created_at); const status = String(refund.estado || refund.status || "completed").trim().toLowerCase(); const method = String(refund.medioPago || refund.metodoPago || refund.paymentMethod || "Efectivo").trim() || "Efectivo"; const source = String(refund.origen || refund.fuente || refund.source || method).trim() || method; return { id: String(refund.id || refund.idDevolucion || `DEV-${index}`), date, amount: numeric(refund.valor || refund.valorTotal || refund.monto || refund.amount || refund.total), difference: numeric(refund.diferencia || refund.difference), method, source, paymentMethod: String(refund.paymentMethod || refund.metodoPago || "").trim(), status }; }
function normalizeClosure(item, index) { return { id: String(item.id || `CIE-${index}`), date: dateFrom(item.fecha || item.date), opening: numeric(item.saldoInicial || item.opening), income: numeric(item.ingresos || item.income), refunds: numeric(item.devoluciones || item.refunds), expenses: numeric(item.gastos || item.expenses), expected: numeric(item.efectivoEsperado || item.expected), counted: numeric(item.efectivoContado || item.counted), difference: numeric(item.diferencia || item.difference), status: String(item.estado || item.status || "closed"), createdAt: String(item.createdAt || "") }; }
function readCategories() { return recordsFromKeys(categoryKeys).filter(belongsToBusiness).reduce((map, category) => { const id = String(category.id || category.idCategoria || ""); if (id) map[id] = String(category.nombre || category.name || "Sin categoría"); return map; }, {}); }
function readArticles() { return recordsFromKeys(articleKeys).filter(belongsToBusiness).reduce((map, article) => { const id = String(article.id || article.codigo || ""); if (id) map[id] = String(article.descripcion || article.nombre || article.name || id); return map; }, {}); }
function loadData() { const categories = readCategories(); const articles = readArticles(); const rawSales = recordsFromKeys(saleKeys).filter(belongsToBusiness); const sales = rawSales.map(normalizeSale).filter(sale => sale.date); const closureSales = rawSales.map(normalizeClosureSale).filter(sale => sale.date); const expenses = recordsFromKeys(expenseKeys).filter(belongsToBusiness).map(normalizeExpense).filter(expense => expense.date); const refunds = recordsFromKeys(refundKeys).filter(belongsToBusiness).map(normalizeRefund).filter(refund => refund.date); const closures = recordsFromKeys([closureKey]).filter(belongsToBusiness).map(normalizeClosure).filter(closure => closure.date); return { categories, articles, sales, closureSales, expenses, refunds, closures }; }
function formatDate(value) { if (!value) return "—"; return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`)); }
function periodDays(start, end) { return Math.max(1, Math.round((new Date(`${end}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000) + 1); }
function rangeLabel(start, end) { if (start === end) return `Reporte del ${formatDate(start)}`; return `${formatDate(start)} — ${formatDate(end)}`; }
function setDefaultDates() { const end = localDate(); startDate.value = shiftDate(end, -29); endDate.value = end; if (closureDate) closureDate.value = end; if (cashOpening) cashOpening.value = "0"; if (cashCounted) cashCounted.value = ""; }
function setQuickRange(value) { const end = localDate(); if (value === "today") { startDate.value = end; endDate.value = end; } else if (value === "month") { const date = new Date(`${end}T12:00:00`); startDate.value = localDate(new Date(date.getFullYear(), date.getMonth(), 1)); endDate.value = end; } else { startDate.value = shiftDate(end, -(Number(value) - 1)); endDate.value = end; } document.querySelectorAll("[data-range]").forEach(button => button.classList.toggle("active", button.dataset.range === value)); render(); }
function validateRange() { if (!startDate.value || !endDate.value) { feedback.textContent = "Selecciona una fecha inicial y una fecha final."; return false; } if (startDate.value > endDate.value) { feedback.textContent = "La fecha inicial no puede ser posterior a la fecha final."; return false; } feedback.textContent = `Mostrando información del ${rangeLabel(startDate.value, endDate.value)}.`; return true; }
function aggregateSales(data) { const sales = data.sales.filter(item => item.date >= startDate.value && item.date <= endDate.value); const expenses = data.expenses.filter(item => item.date >= startDate.value && item.date <= endDate.value); const items = sales.flatMap(sale => sale.items); return { sales, expenses, items, salesTotal: sales.reduce((sum, item) => sum + item.total, 0), expensesTotal: expenses.reduce((sum, item) => sum + item.value, 0) }; }
function normalizedText(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
function paymentGroup(value) { const payment = normalizedText(value); if (payment.includes("efect")) return "cash"; if (payment.includes("transfer")) return "transfer"; if (payment.includes("tarjet") || payment.includes("credit") || payment.includes("debit")) return "card"; return "other"; }
function isCancelledStatus(value) { return ["cancelled", "canceled", "anulada", "anulado", "cancelada", "cancelado", "rejected", "rechazada"].includes(normalizedText(value)); }
function isPendingRefund(value) { return ["pending", "pendiente", "pendiente de reembolso", "requested", "solicitada", "en proceso"].includes(normalizedText(value)); }
function isRejectedRefund(value) { return ["rejected", "rechazada", "cancelled", "cancelada"].includes(normalizedText(value)); }
function refundGroup(refund) { return paymentGroup(refund.source || refund.method); }
function closureSummary(data, date) {
    const daySales = data.closureSales.filter(sale => sale.date === date && !isCancelledStatus(sale.status));
    const dayRefunds = data.refunds.filter(refund => refund.date === date && !isRejectedRefund(refund.status));
    const completedRefunds = dayRefunds.filter(refund => !isPendingRefund(refund.status));
    const pendingRefunds = dayRefunds.filter(refund => isPendingRefund(refund.status));
    const dayExpenses = data.expenses.filter(expense => expense.date === date);
    const salesByPayment = { cash: 0, transfer: 0, card: 0, other: 0 };
    const refundsByPayment = { cash: 0, transfer: 0, card: 0, other: 0 };
    daySales.forEach(sale => { salesByPayment[paymentGroup(sale.payment)] += sale.total; });
    completedRefunds.filter(refund => refund.difference > 0).forEach(refund => { salesByPayment[paymentGroup(refund.paymentMethod || refund.method)] += refund.difference; });
    completedRefunds.forEach(refund => { refundsByPayment[refundGroup(refund)] += refund.amount; });
    const opening = numeric(cashOpening?.value);
    const countedValue = cashCounted?.value.trim() === "" ? null : numeric(cashCounted.value);
    const extraCharges = completedRefunds.filter(refund => refund.difference > 0).reduce((sum, refund) => sum + refund.difference, 0);
    const income = daySales.reduce((sum, sale) => sum + sale.total, 0) + extraCharges;
    const refundTotal = dayRefunds.reduce((sum, refund) => sum + refund.amount, 0);
    const expenseTotal = dayExpenses.reduce((sum, expense) => sum + expense.value, 0);
    const expected = opening + salesByPayment.cash - refundsByPayment.cash - expenseTotal;
    const difference = countedValue === null ? null : countedValue - expected;
    return { date, daySales, dayRefunds, completedRefunds, pendingRefunds, dayExpenses, salesByPayment, refundsByPayment, opening, counted: countedValue, income, refundTotal, expenseTotal, expected, difference };
}
function signedMoney(value) { const amount = Number(value) || 0; return `${amount > 0 ? "+" : amount < 0 ? "−" : ""}${money(Math.abs(amount))}`; }
function setClosureStatus(summary, closed = false) {
    if (!closureStatus) return;
    let state = "pending";
    let label = "Pendiente de conteo";
    let icon = "fa-clock";
    if (closed) { state = "closed"; label = "Cierre confirmado"; icon = "fa-lock"; }
    else if (summary.counted !== null && summary.difference === 0) { state = "balanced"; label = "Caja cuadrada"; icon = "fa-check"; }
    else if (summary.counted !== null && summary.difference < 0) { state = "shortage"; label = "Faltante por revisar"; icon = "fa-triangle-exclamation"; }
    else if (summary.counted !== null && summary.difference > 0) { state = "surplus"; label = "Sobrante por revisar"; icon = "fa-arrow-trend-up"; }
    closureStatus.className = `closure-status ${state}`;
    closureStatus.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i> ${label}`;
}
function renderClosureSummary(data = currentData) {
    if (!data || !closureDate?.value) return;
    currentClosureSummary = closureSummary(data, closureDate.value);
    const existing = data.closures.find(closure => closure.date === closureDate.value);
    const editingCount = cashOpening.matches(":focus") || cashCounted.matches(":focus");
    if (existing && !editingCount) { cashOpening.value = String(existing.opening || 0); cashCounted.value = String(existing.counted || 0); currentClosureSummary = closureSummary(data, closureDate.value); }
    const summary = currentClosureSummary;
    document.getElementById("closureIncome").textContent = money(summary.income);
    document.getElementById("closureIncomeCount").textContent = `${number(summary.daySales.length)} ${summary.daySales.length === 1 ? "venta" : "ventas"}`;
    document.getElementById("closureRefunds").textContent = money(summary.refundTotal);
    document.getElementById("closureRefundCount").textContent = `${number(summary.dayRefunds.length)} ${summary.dayRefunds.length === 1 ? "movimiento" : "movimientos"}`;
    document.getElementById("closureExpenses").textContent = money(summary.expenseTotal);
    document.getElementById("closureExpected").textContent = money(summary.expected);
    document.getElementById("closureDifference").textContent = summary.difference === null ? "—" : signedMoney(summary.difference);
    document.getElementById("closureDifferenceHint").textContent = summary.difference === null ? "Ingresa el efectivo contado" : summary.difference === 0 ? "La caja coincide" : "Revisa el conteo antes de cerrar";
    document.getElementById("closureCashSales").textContent = money(summary.salesByPayment.cash);
    document.getElementById("closureTransferSales").textContent = money(summary.salesByPayment.transfer);
    document.getElementById("closureCardSales").textContent = money(summary.salesByPayment.card);
    document.getElementById("closureOtherSales").textContent = money(summary.salesByPayment.other);
    document.getElementById("closureCashRefunds").textContent = money(summary.refundsByPayment.cash);
    document.getElementById("closureTransferRefunds").textContent = money(summary.refundsByPayment.transfer);
    document.getElementById("closureExpenseOutflow").textContent = money(summary.expenseTotal);
    document.getElementById("closurePendingRefunds").textContent = money(summary.pendingRefunds.reduce((sum, refund) => sum + refund.amount, 0));
    const differenceElement = document.getElementById("closureDifference");
    differenceElement.classList.toggle("is-negative", summary.difference !== null && summary.difference < 0);
    differenceElement.classList.toggle("is-positive", summary.difference !== null && summary.difference > 0);
    setClosureStatus(summary, Boolean(existing && !editingCount));
}
function renderClosureHistory(data = currentData) {
    if (!data) return;
    const rows = document.getElementById("closureRows");
    const empty = document.getElementById("closureHistoryEmpty");
    const closures = [...data.closures].sort((first, second) => String(second.date).localeCompare(String(first.date)));
    document.getElementById("closureCount").textContent = `${number(closures.length)} ${closures.length === 1 ? "cierre" : "cierres"}`;
    empty.hidden = closures.length > 0;
    rows.innerHTML = closures.map(closure => `<tr><td><strong>${safe(formatDate(closure.date))}</strong><small>${safe(closure.id)}</small></td><td>${safe(money(closure.income))}</td><td>${safe(money(closure.refunds))}</td><td>${safe(money(closure.expenses))}</td><td>${safe(money(closure.expected))}</td><td>${safe(money(closure.counted))}</td><td class="closure-difference-cell ${closure.difference < 0 ? "is-negative" : closure.difference > 0 ? "is-positive" : ""}">${safe(signedMoney(closure.difference))}</td><td><span class="closure-history-status ${closure.difference === 0 ? "balanced" : "review"}">${closure.difference === 0 ? "Cuadrada" : "Revisar"}</span></td></tr>`).join("");
}
function loadExistingClosure() { if (!currentData || !closureDate?.value) return; const existing = currentData.closures.find(closure => closure.date === closureDate.value); cashOpening.value = existing ? String(existing.opening || 0) : "0"; cashCounted.value = existing ? String(existing.counted || 0) : ""; renderClosureSummary(currentData); }
async function confirmCashClosure() {
    if (!closureDate.value || cashCounted.value.trim() === "") { closureFeedback.textContent = "Ingresa la fecha y el efectivo contado para confirmar el cierre."; cashCounted.focus(); return; }
    const summary = closureSummary(currentData, closureDate.value);
    const existing = currentData.closures.find(closure => closure.date === summary.date);
    if (summary.pendingRefunds.length) { closureFeedback.textContent = `Hay ${number(summary.pendingRefunds.length)} reembolso(s) pendiente(s) por ${money(summary.pendingRefunds.reduce((sum, refund) => sum + refund.amount, 0))}. El cierre puede continuar, pero quedarán registrados como pendientes.`; }
    if (existing && window.NodixAlert?.confirm) {
        const confirmed = await window.NodixAlert.confirm({ type: "confirm", title: "¿Actualizar este cierre?", message: "Ya existe un cierre para esta fecha. Se reemplazará con el conteo actual.", confirmText: "Actualizar cierre", cancelText: "Conservar cierre" });
        if (!confirmed) return;
    }
    const record = { id: existing?.id || `CIE-${Date.now()}`, negocioId: business.id, negocioNombre: business.name, fecha: summary.date, saldoInicial: summary.opening, ingresos: summary.income, devoluciones: summary.refundTotal, gastos: summary.expenseTotal, efectivoEsperado: summary.expected, efectivoContado: summary.counted, diferencia: summary.difference, estado: summary.difference === 0 ? "balanced" : "review", createdAt: new Date().toISOString() };
    const stored = existing ? currentData.closures.map(closure => closure.id === existing.id ? record : closure) : [record, ...currentData.closures];
    scopeApi.writeScoped(closureKey, stored);
    currentData.closures = stored.map(normalizeClosure);
    renderClosureHistory(currentData);
    currentClosureSummary = closureSummary(currentData, summary.date);
    setClosureStatus(currentClosureSummary, true);
    closureFeedback.textContent = `Cierre de ${formatDate(summary.date)} guardado correctamente.`;
    if (window.NodixAlert?.show) window.NodixAlert.show({ type: "success", title: "Cierre confirmado", message: `El cierre de ${formatDate(summary.date)} quedó registrado.`, confirmText: "Entendido" });
}
function updateMetrics(summary) { const total = summary.salesTotal; document.getElementById("totalSales").textContent = money(total); document.getElementById("transactionCount").textContent = number(summary.sales.length); document.getElementById("averageTicket").textContent = money(summary.sales.length ? total / summary.sales.length : 0); document.getElementById("totalExpenses").textContent = money(summary.expensesTotal); const net = total - summary.expensesTotal; const netElement = document.getElementById("netResult"); netElement.textContent = money(net); netElement.style.color = net < 0 ? "var(--danger)" : "var(--warning)"; document.getElementById("salesChange").textContent = summary.items.length ? `${number(summary.items.reduce((sum, item) => sum + item.quantity, 0))} uds.` : "—"; }
function buildBuckets(summary) { const days = periodDays(startDate.value, endDate.value); if (days <= 31) { const result = []; for (let index = 0; index < days; index += 1) { const date = shiftDate(startDate.value, index); result.push({ key: date, label: new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short" }).format(new Date(`${date}T12:00:00`)), value: summary.sales.filter(sale => sale.date === date).reduce((sum, sale) => sum + sale.total, 0) }); } return { result, label: "Diario" }; } if (days <= 180) { const result = []; for (let index = 0; index < days; index += 7) { const from = shiftDate(startDate.value, index); const to = shiftDate(from, Math.min(6, days - index - 1)); result.push({ key: from, label: `Sem. ${new Date(`${from}T12:00:00`).getDate()}`, value: summary.sales.filter(sale => sale.date >= from && sale.date <= to).reduce((sum, sale) => sum + sale.total, 0) }); } return { result, label: "Semanal" }; } const result = []; const cursor = new Date(`${startDate.value}T12:00:00`); while (localDate(cursor) <= endDate.value) { const from = localDate(cursor); const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1); const to = localDate(new Date(next.getTime() - 86400000)); result.push({ key: from, label: new Intl.DateTimeFormat("es-CO", { month: "short" }).format(cursor), value: summary.sales.filter(sale => sale.date >= from && sale.date <= to).reduce((sum, sale) => sum + sale.total, 0) }); cursor.setMonth(cursor.getMonth() + 1, 1); } return { result, label: "Mensual" }; }
function renderChart(summary) { const chart = document.getElementById("salesChart"); const empty = document.getElementById("trendEmpty"); const buckets = buildBuckets(summary); document.getElementById("trendGranularity").textContent = buckets.label; chart.innerHTML = ""; const max = Math.max(...buckets.result.map(bucket => bucket.value), 0); document.getElementById("axisHigh").textContent = money(max); document.getElementById("axisMid").textContent = money(max / 2); if (!summary.sales.length || !max) { chart.hidden = true; empty.hidden = false; document.getElementById("bestDay").textContent = "Sin datos suficientes"; return; } chart.hidden = false; empty.hidden = true; buckets.result.forEach(bucket => { const bar = document.createElement("div"); bar.className = "chart-bar"; const height = Math.max(4, Math.round((bucket.value / max) * 100)); bar.style.setProperty("--bar-height", `${height}%`); bar.innerHTML = `<span class="chart-bar-value">${safe(money(bucket.value))}</span><i class="chart-bar-fill" style="height:${height}%"></i><span class="chart-bar-label">${safe(bucket.label)}</span>`; chart.appendChild(bar); }); const best = buckets.result.reduce((current, item) => item.value > current.value ? item : current, buckets.result[0]); document.getElementById("bestDay").textContent = best && best.value ? `Mayor ingreso: ${best.label} · ${money(best.value)}` : "Sin datos suficientes"; }
function renderMix(summary, data) { const list = document.getElementById("mixList"); const empty = document.getElementById("mixEmpty"); const totals = {}; summary.items.forEach(item => { const label = item.categoryName || data.categories[item.categoryId] || "Sin categoría"; totals[label] = (totals[label] || 0) + item.amount; }); const entries = Object.entries(totals).sort((first, second) => second[1] - first[1]).slice(0, 5); const colors = getChartPalette(); document.getElementById("mixTotal").textContent = money(summary.salesTotal); if (!entries.length || !summary.salesTotal) { list.innerHTML = ""; document.getElementById("donutChart").style.background = "conic-gradient(#eef1f5 0 100%)"; empty.hidden = false; return; } empty.hidden = true; let current = 0; const stops = entries.map(([label, value], index) => { const percent = value / summary.salesTotal * 100; const stop = `${colors[index % colors.length]} ${current}% ${current + percent}%`; current += percent; return stop; }); document.getElementById("donutChart").style.background = `conic-gradient(${stops.join(",")})`; list.innerHTML = entries.map(([label, value], index) => `<div class="mix-item"><i class="mix-color" style="background:${colors[index % colors.length]}"></i><div><strong>${safe(label)}</strong><small>${Math.round(value / summary.salesTotal * 100)}% del ingreso</small></div><b>${safe(money(value))}</b></div>`).join(""); }
function renderProducts(summary, data) { const totals = {}; summary.items.forEach(item => { const key = item.code || item.name; if (!totals[key]) totals[key] = { name: item.name || data.articles[item.code] || "Artículo", code: item.code, quantity: 0, amount: 0 }; totals[key].quantity += item.quantity; totals[key].amount += item.amount; }); const entries = Object.values(totals).sort((first, second) => second.amount - first.amount).slice(0, 6); const body = document.getElementById("topProductsRows"); document.getElementById("topProductsCount").textContent = `${entries.length} ${entries.length === 1 ? "artículo" : "artículos"}`; document.getElementById("productsEmpty").hidden = entries.length > 0; body.innerHTML = entries.map(item => { const share = summary.salesTotal ? Math.round(item.amount / summary.salesTotal * 100) : 0; return `<tr><td><div class="product-cell"><i class="product-mark fa-solid fa-box" aria-hidden="true"></i><span><strong>${safe(item.name)}</strong><small>${safe(item.code || "Sin código")}</small></span></div></td><td>${number(item.quantity)}</td><td><strong>${safe(money(item.amount))}</strong></td><td><span class="share-bar"><i style="--share:${share}%"></i>${share}%</span></td></tr>`; }).join(""); }
function renderExpenses(summary) { const totals = {}; summary.expenses.forEach(item => { const key = item.description || "Gasto operativo"; totals[key] = (totals[key] || 0) + item.value; }); const entries = Object.entries(totals).sort((first, second) => second[1] - first[1]).slice(0, 6); const list = document.getElementById("expenseList"); document.getElementById("expenseCount").textContent = `${summary.expenses.length} ${summary.expenses.length === 1 ? "movimiento" : "movimientos"}`; document.getElementById("expensesEmpty").hidden = entries.length > 0; list.innerHTML = entries.map(([description, value]) => `<div class="expense-item"><i class="expense-icon fa-solid fa-receipt" aria-hidden="true"></i><div><strong>${safe(description)}</strong><small>Gasto registrado en el periodo</small></div><b>${safe(money(value))}</b></div>`).join(""); }
function render() { if (!validateRange()) return; const data = loadData(); currentData = data; const summary = aggregateSales(data); periodLabel.textContent = rangeLabel(startDate.value, endDate.value); updateMetrics(summary); renderChart(summary); renderMix(summary, data); renderProducts(summary, data); renderExpenses(summary); renderClosureSummary(data); renderClosureHistory(data); }

setDefaultDates();
document.querySelectorAll("[data-range]").forEach(button => button.addEventListener("click", () => setQuickRange(button.dataset.range)));
document.getElementById("applyReport").addEventListener("click", render);
document.getElementById("resetReport").addEventListener("click", () => { document.querySelectorAll("[data-range]").forEach(button => button.classList.toggle("active", button.dataset.range === "30")); setDefaultDates(); render(); });
startDate.addEventListener("change", () => document.querySelectorAll("[data-range]").forEach(button => button.classList.remove("active")));
endDate.addEventListener("change", () => document.querySelectorAll("[data-range]").forEach(button => button.classList.remove("active")));
closureDate?.addEventListener("change", loadExistingClosure);
cashOpening?.addEventListener("input", () => renderClosureSummary(currentData));
cashCounted?.addEventListener("input", () => renderClosureSummary(currentData));
document.getElementById("calculateClosure")?.addEventListener("click", () => { closureFeedback.textContent = "Resumen actualizado con los movimientos locales del día."; renderClosureSummary(currentData); });
document.getElementById("confirmClosure")?.addEventListener("click", confirmCashClosure);
window.addEventListener("storage", event => { if ([...saleKeys, ...expenseKeys, ...articleKeys, ...categoryKeys, ...refundKeys, closureKey].includes(event.key)) render(); });
render();

const shouldOpenClosure = new URLSearchParams(window.location.search).get("view") === "closure";
if (shouldOpenClosure) {
  const closureArea = document.getElementById("closureArea");
  if (closureArea) closureArea.open = true;
  setTimeout(() => document.getElementById("cashClosureSection")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
}

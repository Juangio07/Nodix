"use strict";

(function () {
    const scopeApi = window.NodixBusinessScope;
    const merchandiseKeys = ["Nodix_mercancia_v2", "Nodix_mercancia_v1"];
    const salesKeys = ["Nodix_ventas_v2", "Nodix_ventas_v1", "Nodix_ventas", "Nodix_sales_v1", "Nodix_sales"];

    function parse(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }
    function normalizeBusinessId(value) { return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"); }
    function belongsToBusiness(item, business) { const itemBusiness = item && (item.negocioId || item.businessId || item.idNegocio); return !itemBusiness || normalizeBusinessId(itemBusiness) === business.id; }
    function readRecords(keys) {
        const business = scopeApi.getBusiness();
        for (const key of keys) {
            const scoped = scopeApi.readScoped(key).records;
            if (Array.isArray(scoped) && scoped.length) return scoped.filter(item => belongsToBusiness(item, business));
            const raw = parse(localStorage.getItem(key) || "[]", []);
            const records = Array.isArray(raw) ? raw : (Array.isArray(raw[business.id]) ? raw[business.id] : []);
            if (records.length) return records.filter(item => belongsToBusiness(item, business));
        }
        return [];
    }
    function quantity(value) { return Math.max(0, Number(value) || 0); }
    function extractSaleItems(sale) { const value = sale.items || sale.detalle || sale.detalles || sale.productos || sale.articulos || sale.lines || sale.lineas; return Array.isArray(value) ? value : []; }
    function itemId(item) { return String(item.articuloId || item.articleId || item.idArticulo || item.productId || item.idProducto || "").trim(); }
    function itemCode(item) { return String(item.codigo || item.code || item.articuloCodigo || item.articleCode || "").trim().toLowerCase(); }
    function itemQuantity(item) { return quantity(item.cantidad || item.quantity || item.qty || item.unidades); }
    function sameArticle(item, articleId, articleCode) { const id = itemId(item); const code = itemCode(item); return (id && id === String(articleId || "")) || (!id && code && code === String(articleCode || "").trim().toLowerCase()); }
    function readMerchandise() { return readRecords(merchandiseKeys); }
    function readSales() { return readRecords(salesKeys); }
    function availableStock(articleId, articleCode, merchandise = readMerchandise(), sales = readSales()) {
        const incoming = merchandise.filter(item => String(item.articuloId || item.articleId || "") === String(articleId || "") || (!item.articuloId && !item.articleId && String(item.articuloCodigo || item.articleCode || "").trim().toLowerCase() === String(articleCode || "").trim().toLowerCase())).reduce((sum, item) => sum + itemQuantity(item), 0);
        const sold = sales.reduce((sum, sale) => sum + extractSaleItems(sale).filter(item => sameArticle(item, articleId, articleCode)).reduce((total, item) => total + itemQuantity(item), 0), 0);
        return Math.max(0, incoming - sold);
    }
    function averageCost(articleId, merchandise = readMerchandise()) {
        const linked = merchandise.filter(item => String(item.articuloId || item.articleId || "") === String(articleId || ""));
        const totalQuantity = linked.reduce((sum, item) => sum + itemQuantity(item), 0);
        const totalCost = linked.reduce((sum, item) => sum + itemQuantity(item) * (Number(item.costo || item.unitCost) || 0), 0);
        return totalQuantity ? totalCost / totalQuantity : 0;
    }

    window.NodixInventoryScope = { readMerchandise, readSales, availableStock, averageCost };
}());

"use strict";

(function () {
    const CONFIG_KEY = "Nodix_configuracion_empresa_v1";

    function parse(value, fallback) {
        try { return JSON.parse(value); } catch { return fallback; }
    }

    function normalizeId(value) {
        return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
    }

    function getBusiness() {
        const config = parse(localStorage.getItem(CONFIG_KEY) || "{}", {});
        const name = String(config.nombreEmpresa || config.nombre || "Negocio demo").trim() || "Negocio demo";
        const sourceId = config.idNegocio || config.nit || name;
        return { id: normalizeId(sourceId) || "negocio-demo", name, config };
    }

    function readScoped(key, legacyKey) {
        const business = getBusiness();
        const stored = parse(localStorage.getItem(key) || "{}", {});
        let records = Array.isArray(stored[business.id]) ? stored[business.id] : [];
        if (!records.length && legacyKey && !localStorage.getItem(key)) {
            const legacy = parse(localStorage.getItem(legacyKey) || "[]", []);
            if (Array.isArray(legacy) && legacy.length) {
                records = legacy;
                writeScoped(key, records);
            }
        }
        return { business, records };
    }

    function writeScoped(key, records) {
        const business = getBusiness();
        const stored = parse(localStorage.getItem(key) || "{}", {});
        stored[business.id] = Array.isArray(records) ? records : [];
        localStorage.setItem(key, JSON.stringify(stored));
        return business;
    }

    window.NodixBusinessScope = { getBusiness, readScoped, writeScoped };
}());

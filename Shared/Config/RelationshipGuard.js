"use strict";

(function () {
    const parse = value => { try { return JSON.parse(value); } catch { return null; } };
    const normalize = value => String(value ?? "").trim().toLowerCase();

    function businessId() {
        try { return window.NodixBusinessScope?.getBusiness?.().id || ""; } catch { return ""; }
    }

    function recordsFrom(key) {
        const stored = parse(localStorage.getItem(key) || "[]");
        const filterBusiness = records => {
            const id = businessId();
            return id ? records.filter(record => !record.negocioId || record.negocioId === id) : records;
        };
        if (Array.isArray(stored)) return filterBusiness(stored);
        const id = businessId();
        return id && Array.isArray(stored?.[id]) ? filterBusiness(stored[id]) : [];
    }

    function recordsFromKeys(keys) {
        for (const key of keys) {
            const records = recordsFrom(key);
            if (records.length) return records;
        }
        return [];
    }

    function lineValues(record, fields) {
        const lines = record.items || record.detalle || record.detalles || record.productos || record.articulos || record.lines || record.lineas || [];
        return Array.isArray(lines) ? lines.flatMap(line => fields.map(field => line[field])) : [];
    }

    const relations = {
        categorias: [
            { label: "artículo(s)", keys: ["Nodix_articulos_v2", "Nodix_articulos_v1"], values: record => [record.categoriaId, record.categoryId] },
            { label: "entrada(s) de mercancía", keys: ["Nodix_mercancia_v2", "Nodix_mercancia_v1"], values: record => [record.categoriaId, record.categoryId] }
        ],
        articulos: [
            { label: "entrada(s) de mercancía", keys: ["Nodix_mercancia_v2", "Nodix_mercancia_v1"], values: record => [record.articuloId, record.articleId, record.idArticulo, record.articuloCodigo, record.articleCode] },
            { label: "venta(s)", keys: ["Nodix_ventas_v2", "Nodix_ventas_v1", "Nodix_ventas", "Nodix_sales_v1", "Nodix_sales"], values: record => lineValues(record, ["articuloId", "articleId", "idArticulo", "productId", "codigo", "code"]) }
        ],
        clientes: [
            { label: "venta(s)", keys: ["Nodix_ventas_v2", "Nodix_ventas_v1", "Nodix_ventas", "Nodix_sales_v1", "Nodix_sales"], values: record => [record.clienteId, record.clientId, record.documentoCliente, record.clientDocument] }
        ],
        roles: [
            { label: "usuario(s)", keys: ["Nodix_usuarios_v1"], values: record => [record.idRol, record.roleId, record.rol] }
        ],
        usuarios: [
            { label: "venta(s)", keys: ["Nodix_ventas_v2", "Nodix_ventas_v1", "Nodix_ventas", "Nodix_sales_v1", "Nodix_sales"], values: record => [record.usuarioId, record.userId, record.idUsuario, record.usuario] }
        ]
    };

    function targetValues(entity, record) {
        if (entity === "categorias") return [record.id, record.nombre];
        if (entity === "articulos") return [record.id, record.codigo];
        if (entity === "clientes") return [record.id, record.documento];
        if (entity === "roles") return [record.id, record.nombre];
        if (entity === "usuarios") return [record.idUsuario, record.usuario, record.nombre];
        return [record.id];
    }

    function checkBeforeDeactivate(entity, record, operation = "deactivate") {
        const targets = targetValues(entity, record).map(normalize).filter(Boolean);
        const checks = relations[entity] || [];
        for (const relation of checks) {
            const count = recordsFromKeys(relation.keys).filter(item => relation.values(item).some(value => targets.includes(normalize(value)))).length;
            if (count) {
                const label = entity === "categorias" ? `la categoría “${record.nombre || "seleccionada"}”` : entity === "articulos" ? `el artículo “${record.descripcion || record.codigo || "seleccionado"}”` : entity === "clientes" ? `el cliente “${record.nombre || "seleccionado"}”` : entity === "roles" ? `el rol “${record.nombre || "seleccionado"}”` : `el usuario “${record.nombre || record.usuario || "seleccionado"}”`;
                const action = operation === "delete" ? "eliminar" : "inactivar";
                return { message: `No puedes ${action} ${label} porque tiene ${count} ${relation.label} asociados. Desvincula esos registros primero y vuelve a intentarlo.` };
            }
        }
        return null;
    }

    function notify(restriction) {
        if (!restriction) return;
        if (window.NodixAlert?.show) {
            window.NodixAlert.show({ type: "warning", title: "No se puede completar la acción", message: restriction.message, confirmText: "Entendido" });
            return;
        }
        console.warn("NodixAlert no está disponible:", restriction.message);
    }

    window.NodixRelationshipGuard = { checkBeforeDeactivate, notify };
}());

"use strict";

(function () {
    let layer = null;
    let activeResolver = null;

    function ensureLayer() {
        if (layer || !document.body) return layer;
        layer = document.createElement("div");
        layer.className = "nodix-alert-layer";
        layer.hidden = true;
        layer.innerHTML = `
            <div class="nodix-alert-backdrop" data-alert-cancel></div>
            <section class="nodix-alert-card" role="alertdialog" aria-modal="true" aria-labelledby="nodixAlertTitle" aria-describedby="nodixAlertMessage">
                <div class="nodix-alert-topline">
                    <span class="nodix-alert-icon" data-alert-icon><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i></span>
                    <button class="nodix-alert-close" type="button" data-alert-cancel aria-label="Cerrar alerta"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
                </div>
                <div class="nodix-alert-copy">
                    <span class="nodix-alert-kicker" data-alert-kicker>ADVERTENCIA</span>
                    <h2 id="nodixAlertTitle" data-alert-title>Acción bloqueada</h2>
                    <p id="nodixAlertMessage" data-alert-message></p>
                </div>
                <footer class="nodix-alert-actions">
                    <button class="nodix-alert-secondary" type="button" data-alert-cancel>Cancelar</button>
                    <button class="nodix-alert-primary" type="button" data-alert-confirm>Entendido</button>
                </footer>
            </section>`;
        document.body.appendChild(layer);
        layer.addEventListener("click", event => {
            if (event.target.closest("[data-alert-confirm]")) close(true);
            if (event.target.closest("[data-alert-cancel]")) close(false);
        });
        return layer;
    }

    function close(result = false) {
        const host = window.parent !== window ? window.parent.NodixAlert : null;
        if (host && host !== window.NodixAlert) {
            host.close(result);
            return;
        }
        if (!layer || layer.hidden) return;
        layer.classList.remove("is-visible");
        document.body.classList.remove("nodix-alert-open");
        setTimeout(() => { if (layer) layer.hidden = true; }, 160);
        const resolver = activeResolver;
        activeResolver = null;
        if (resolver) resolver(result);
    }

    function show(options = {}) {
        const config = typeof options === "string" ? { message: options } : options;
        const host = window.parent !== window ? window.parent.NodixAlert : null;
        if (host && host !== window.NodixAlert) return host.show(config);
        const target = ensureLayer();
        if (!target) {
            console.warn("NodixAlert no pudo montar la alerta:", config.message || "Ha ocurrido un problema.");
            return Promise.resolve(config.type === "confirm" ? false : true);
        }
        if (!target.hidden) close(false);
        const type = ["warning", "error", "success", "info", "confirm"].includes(config.type) ? config.type : "warning";
        const icon = { warning: "fa-triangle-exclamation", error: "fa-circle-xmark", success: "fa-circle-check", info: "fa-circle-info", confirm: "fa-circle-question" }[type];
        const kicker = { warning: "ADVERTENCIA", error: "ERROR", success: "ÉXITO", info: "INFORMACIÓN", confirm: "CONFIRMACIÓN" }[type];
        target.dataset.type = type;
        target.querySelector("[data-alert-icon]").innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i>`;
        target.querySelector("[data-alert-kicker]").textContent = config.kicker || kicker;
        target.querySelector("[data-alert-title]").textContent = config.title || (type === "confirm" ? "¿Confirmas esta acción?" : "Acción bloqueada");
        target.querySelector("[data-alert-message]").textContent = config.message || "Revisa la información e inténtalo nuevamente.";
        target.querySelector("[data-alert-confirm]").textContent = config.confirmText || (type === "confirm" ? "Confirmar" : "Entendido");
        target.querySelector(".nodix-alert-secondary").textContent = config.cancelText || "Cancelar";
        target.querySelectorAll("[data-alert-cancel]").forEach(button => { button.hidden = type !== "confirm" && button.classList.contains("nodix-alert-secondary"); });
        target.hidden = false;
        document.body.classList.add("nodix-alert-open");
        requestAnimationFrame(() => target.classList.add("is-visible"));
        setTimeout(() => target.querySelector("[data-alert-confirm]").focus(), 0);
        return new Promise(resolve => { activeResolver = resolve; });
    }

    document.addEventListener("keydown", event => {
        if (!layer || layer.hidden || event.key !== "Escape") return;
        event.preventDefault();
        close(false);
    });

    window.NodixAlert = { show, alert: options => show(options), confirm: options => show({ ...options, type: "confirm" }), close };
}());

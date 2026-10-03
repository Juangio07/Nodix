"use strict";

(function () {
    const formatter = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

    function parse(value) {
        const digits = String(value ?? "").replace(/[^0-9-]/g, "");
        return Math.max(0, Number(digits) || 0);
    }
    function format(value) { return Number(value) > 0 ? formatter.format(Number(value)) : ""; }
    function setValue(input, value) { if (!input) return; const amount = parse(value); input.dataset.numericValue = String(amount); input.value = format(amount); }
    function number(input) { return parse(input ? input.value : 0); }
    function bind(input) {
        if (!input) return;
        input.type = "text";
        input.inputMode = "numeric";
        input.autocomplete = "off";
        input.classList.add("currency-input");
        input.addEventListener("focus", () => { const amount = number(input); input.value = amount ? String(amount) : ""; });
        input.addEventListener("input", () => { const amount = number(input); input.dataset.numericValue = String(amount); });
        input.addEventListener("blur", () => setValue(input, number(input)));
    }

    window.NodixCurrencyInput = { bind, format, number, parse, setValue };
}());

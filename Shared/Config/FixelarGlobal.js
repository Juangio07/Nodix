"use strict";

/*
 * Aplicador global de identidad.
 * AppConfig.js define los datos; este archivo los conecta con el documento.
 */
(function () {
  const app = window.FIXELAR_APP;
  if (!app) return;

  const root = document.documentElement;
  const theme = app.theme || {};

  function applyCssVariables() {
    const variables = {
      "--brand-primary": theme.primary,
      "--brand-primary-hover": theme.primaryHover,
      "--brand-primary-light": theme.primaryLight,
      "--brand-primary-soft": theme.primarySoft,
      "--brand-on-primary": theme.onPrimary,
      "--nodix-primary-gradient": theme.primaryGradient,
      "--nodix-primary-gradient-hover": theme.primaryGradientHover,
      "--nodix-primary-border": theme.primaryBorder,
      "--nodix-primary-shadow": theme.primaryShadow,
      "--app-dark": theme.backgroundStart,
      "--app-graphite": theme.backgroundMiddle,
      "--surface-dark": theme.backgroundStart,
      "--surface-graphite": theme.backgroundMiddle,
      "--app-accent": theme.accentText,
      "--app-accent-light": theme.accentLight || theme.accentText,
      "--login-background-start": theme.backgroundStart,
      "--login-background-middle": theme.backgroundMiddle,
      "--login-background-end": theme.backgroundEnd,
      "--login-title": theme.title,
      "--login-accent": theme.accentText,
      "--login-muted": theme.mutedText
    };

    (theme.chartPalette || []).forEach((color, index) => {
      variables[`--nodix-chart-${index + 1}`] = color;
    });

    Object.entries(variables).forEach(([name, value]) => {
      if (value) root.style.setProperty(name, value);
    });
  }

  function applyLogos() {
    document.querySelectorAll(".acceso-showcase-logo, .acceso-imagotipo, .Nodix-imagotipo").forEach((element) => {
      element.src = app.logoFull;
      element.alt = app.name;
    });

    document.querySelectorAll(".Nodix-logo-mini").forEach((element) => {
      element.src = app.logoCompact;
      element.alt = app.name;
    });
  }

  function applyLoginCopy() {
    const login = app.login;
    if (!login) return;

    const title = document.querySelector(".encabezado h1");
    const message = document.querySelector(".encabezado p");
    const category = document.querySelector(".acceso-brand-copy .eyebrow");
    const slogan = document.querySelector(".acceso-brand-copy h2");
    const functionality = document.querySelector(".acceso-brand-copy p");
    const mobileCategory = document.querySelector(".acceso-mobile-intro .eyebrow");
    const mobileFunctionality = document.querySelector(".acceso-mobile-intro p");

    if (category && login.category) category.textContent = login.category;
    if (slogan && login.slogan) {
      const accent = login.sloganAccent;
      slogan.textContent = login.slogan;
      if (accent && login.slogan.endsWith(accent)) {
        slogan.innerHTML = `${login.slogan.slice(0, -accent.length)}<span>${accent}</span>`;
      }
    }
    if (functionality && login.functionality) functionality.textContent = login.functionality;
    if (mobileCategory && login.category) mobileCategory.textContent = login.category;
    if (mobileFunctionality && login.functionality) mobileFunctionality.textContent = login.functionality;
    if (title && login.title) title.textContent = login.title;
    if (message && login.message) message.textContent = login.message;
  }

  function applyIdentity() {
    document.title = document.title.replace(/Nodix/g, app.name);
    applyLogos();
    applyLoginCopy();
  }

  applyCssVariables();
  window.NodixTheme = theme;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyIdentity, { once: true });
  } else {
    applyIdentity();
  }
})();

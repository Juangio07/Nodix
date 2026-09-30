"use strict";
(function () {
  const app = window.FIXELAR_APP;
  if (!app) return;

  document.title = document.title.replace(/Nodix/g, app.name);
  if (app.theme) {
    const root = document.documentElement;
    Object.entries({
      "--brand-primary": app.theme.primary,
      "--brand-primary-hover": app.theme.primaryHover,
      "--brand-primary-light": app.theme.primaryLight,
      "--brand-primary-soft": app.theme.primarySoft,
      "--brand-on-primary": app.theme.onPrimary,
      "--app-dark": app.theme.backgroundStart,
      "--app-graphite": app.theme.backgroundMiddle,
      "--surface-dark": app.theme.backgroundStart,
      "--surface-graphite": app.theme.backgroundMiddle,
      "--app-accent": app.theme.accentText,
      "--app-accent-light": app.theme.accentLight || app.theme.accentText,
      "--login-background-start": app.theme.backgroundStart,
      "--login-background-middle": app.theme.backgroundMiddle,
      "--login-background-end": app.theme.backgroundEnd,
      "--login-title": app.theme.title,
      "--login-accent": app.theme.accentText,
      "--login-muted": app.theme.mutedText
    }).forEach(([name, value]) => { if (value) root.style.setProperty(name, value); });
  }
  document.querySelectorAll(".acceso-imagotipo, .Nodix-imagotipo").forEach((element) => {
    element.src = app.logoFull;
    element.alt = app.name;
  });
  document.querySelectorAll(".Nodix-logo-mini").forEach((element) => {
    element.src = app.logoCompact;
    element.alt = app.name;
  });

  const title = document.querySelector(".encabezado h1");
  const message = document.querySelector(".encabezado p");
  const category = document.querySelector(".acceso-brand-copy .eyebrow");
  const slogan = document.querySelector(".acceso-brand-copy h2");
  const functionality = document.querySelector(".acceso-brand-copy p");
  const mobileCategory = document.querySelector(".acceso-mobile-intro .eyebrow");
  const mobileFunctionality = document.querySelector(".acceso-mobile-intro p");
  if (category && app.login?.category) category.textContent = app.login.category;
  if (slogan && app.login?.slogan) {
    const accent = app.login.sloganAccent;
    slogan.textContent = app.login.slogan;
    if (accent && app.login.slogan.endsWith(accent)) {
      slogan.innerHTML = `${app.login.slogan.slice(0, -accent.length)}<span>${accent}</span>`;
    }
  }
  if (functionality && app.login?.functionality) functionality.textContent = app.login.functionality;
  if (mobileCategory && app.login?.category) mobileCategory.textContent = app.login.category;
  if (mobileFunctionality && app.login?.functionality) mobileFunctionality.textContent = app.login.functionality;
  if (title && app.login?.title) title.textContent = app.login.title;
  if (message && app.login?.message) message.textContent = app.login.message;

})();

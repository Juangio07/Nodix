"use strict";

/*
 * Fuente única de identidad de Nodix.
 * Este archivo contiene datos; la aplicación visual vive en FixelarGlobal.js.
 */
const NODIX_THEME = Object.freeze({
  primary: "#FFDF00",
  primaryHover: "#FF6A00",
  primaryLight: "#FFF8D6",
  primarySoft: "#FFF7E6",
  onPrimary: "#172238",
  primaryGradient: "linear-gradient(105deg, #FFDF00 0%, #FFC400 48%, #FF6A00 100%)",
  primaryGradientHover: "linear-gradient(105deg, #FFE500 0%, #FFCA00 48%, #FF6A00 100%)",
  primaryBorder: "#FFBD00",
  primaryShadow: "0 10px 24px rgb(255 106 0 / 18%)",
  backgroundStart: "#0B1020",
  backgroundMiddle: "#17143A",
  backgroundEnd: "#0B1020",
  sidebarStart: "#0B1020",
  sidebarEnd: "#17143A",
  title: "#FFFFFF",
  accentText: "#FF6A00",
  accentLight: "#FFC400",
  chartPalette: Object.freeze(["#FFDF00", "#FF8B2B", "#172238", "#5F7FC8", "#D96A9E"]),
  mutedText: "#B8C0D8"
});

window.FIXELAR_APP = Object.freeze({
  name: "Nodix",
  description: "Plataforma de gestión empresarial Nodix",
  logoFull: "../../../Assets/Logos/ImagotipoOscuro.png",
  logoCompact: "../../../Assets/Logos/Logo.png",
  theme: NODIX_THEME
});

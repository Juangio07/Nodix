"use strict";
const { app, BrowserWindow } = require("electron");
const path = require("node:path");

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: "#edf1f5",
    paintWhenInitiallyHidden: true,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "..", "Assets", "Iconos", "App.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // La ventana se prepara maximizada antes de cargar la interfaz para evitar
  // el salto visual que ocurría al maximizarla después del primer pintado.
  window.maximize();
  window.once("ready-to-show", () => {
    window.show();
  });
  return window.loadFile(path.join(__dirname, "..", "Modulos", "Acceso", "Frontend", "Acceso.html"));
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

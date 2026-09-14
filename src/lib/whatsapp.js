"use client";

import { useSyncExternalStore } from "react";
import { soloNumeros, telefonoEsValido, enlaceWhatsApp } from "./formato";

/**
 * Cómo abre WhatsApp el CRM. Hay tres formas y ninguna sirve para todos los
 * casos, así que cada equipo elige la suya y queda guardada en ese navegador.
 *
 *   app    → enlace whatsapp://, que se lo lleva la aplicación de escritorio.
 *            Es la mejor para campañas: la app ya está abierta y solo salta de
 *            conversación, sin recargar nada. Necesita WhatsApp instalado.
 *
 *   web    → web.whatsapp.com en una pestaña con nombre fijo, siempre la misma.
 *            Funciona en cualquier PC sin instalar nada, pero cada cliente
 *            recarga WhatsApp Web entero y eso son varios segundos por persona.
 *
 *   copiar → no abre nada. Copias el número y el mensaje y los pegas en el
 *            WhatsApp que ya tengas abierto. Cero recargas, más pasos a mano.
 *
 * Nota sobre "web": la pestaña se reutiliza porque lleva NOMBRE en vez de
 * "_blank". No se le puede poner rel="noopener", porque entonces el navegador
 * ignora el nombre y vuelven a acumularse pestañas sueltas (así lo define el
 * estándar). WhatsApp Web tampoco admite dos pestañas a la vez: la segunda
 * desconecta a la primera.
 */

export const MODO_APP = "app";
export const MODO_WEB = "web";
export const MODO_COPIAR = "copiar";

export const MODOS = [
  {
    id: MODO_APP,
    nombre: "App de escritorio",
    corto: "App",
    detalle: "No recarga nada, salta de chat al instante. Necesita WhatsApp instalado en esta PC.",
  },
  {
    id: MODO_WEB,
    nombre: "WhatsApp Web",
    corto: "Web",
    detalle: "Funciona sin instalar nada, en una sola pestaña. Se recarga con cada cliente.",
  },
  {
    id: MODO_COPIAR,
    nombre: "Solo copiar",
    corto: "Copiar",
    detalle: "No abre nada: copias número y mensaje y los pegas en tu WhatsApp ya abierto.",
  },
];

export const VENTANA_WHATSAPP = "sfida-whatsapp";
const CLAVE_MODO = "sfida-modo-whatsapp";

/* ------------------------------------------------------------ Preferencia */

// Store mínimo en vez de un useState por botón: si no, al cambiar el modo en
// la pantalla de campañas los botones ya montados se quedaban con el anterior.
let modoActual = null;
const oyentes = new Set();

function leerModo() {
  if (modoActual) return modoActual;
  try {
    const guardado = localStorage.getItem(CLAVE_MODO);
    modoActual = MODOS.some((m) => m.id === guardado) ? guardado : MODO_APP;
  } catch {
    modoActual = MODO_APP;
  }
  return modoActual;
}

export function cambiarModoWhatsApp(id) {
  if (!MODOS.some((m) => m.id === id)) return;
  modoActual = id;
  try { localStorage.setItem(CLAVE_MODO, id); } catch {}
  oyentes.forEach((avisar) => avisar());
}

/** El modo elegido en este equipo. En el servidor siempre devuelve "app". */
export function useModoWhatsApp() {
  return useSyncExternalStore(
    (avisar) => { oyentes.add(avisar); return () => oyentes.delete(avisar); },
    leerModo,
    () => MODO_APP
  );
}

/* ----------------------------------------------------------------- Enlaces */

function numeroConPais(telefono) {
  const d = soloNumeros(telefono);
  return d.length === 9 ? `51${d}` : d;
}

/** ¿Celular? Ahí wa.me es el que abre la app instalada. */
function enCelular() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
}

/** Enlace que se lleva la aplicación de escritorio (o la del celular). */
export function enlaceApp(telefono, texto) {
  if (!telefonoEsValido(telefono)) return null;
  return `whatsapp://send?phone=${numeroConPais(telefono)}&text=${encodeURIComponent(texto)}`;
}

/**
 * Enlace directo a WhatsApp Web, sin la pantalla intermedia de wa.me.
 * wa.me en PC muestra primero un "Continuar al chat": un clic extra por cliente.
 */
export function enlaceWhatsAppWeb(telefono, texto) {
  if (!telefonoEsValido(telefono)) return null;
  return `https://web.whatsapp.com/send?phone=${numeroConPais(telefono)}&text=${encodeURIComponent(texto)}`;
}

/** El enlace que corresponde al modo elegido. En celular siempre gana wa.me. */
export function enlacePorModo(modo, telefono, texto) {
  if (!telefonoEsValido(telefono)) return null;
  if (enCelular()) return enlaceWhatsApp(telefono, texto);
  if (modo === MODO_APP) return enlaceApp(telefono, texto);
  return enlaceWhatsAppWeb(telefono, texto);
}

/* ------------------------------------------------------------------ Abrir */

/**
 * Abre la conversación según el modo. Devuelve false si el navegador lo impidió.
 *
 * Con la app se usa location.href y no window.open: los protocolos externos
 * abiertos con window.open dejan una pestaña en blanco colgando. Asignar
 * location.href dispara el programa y deja la página donde estaba.
 */
export function abrirWhatsApp(telefono, texto, modo) {
  const enlace = enlacePorModo(modo, telefono, texto);
  if (!enlace) return false;

  if (modo === MODO_APP && !enCelular()) {
    window.location.href = enlace;
    return true;
  }

  const ventana = window.open(enlace, VENTANA_WHATSAPP);
  ventana?.focus();
  return !!ventana;
}

/**
 * Para los <a> de las listas: el href queda como respaldo (sirve para copiar
 * el enlace y para el celular) y el clic manda al modo elegido. La decisión se
 * toma en el clic, no al renderizar, para que el HTML del servidor y el del
 * navegador sean idénticos.
 */
export function alHacerClicWhatsApp(evento, telefono, texto, modo) {
  if (!telefonoEsValido(telefono)) return;
  evento.preventDefault();
  abrirWhatsApp(telefono, texto, modo);
}

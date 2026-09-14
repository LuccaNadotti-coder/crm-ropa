"use client";

import { soloNumeros, telefonoEsValido, enlaceWhatsApp } from "./formato";

/**
 * UNA sola pestaña de WhatsApp para toda la sesión.
 *
 * WhatsApp Web no admite dos pestañas a la vez: al abrir la segunda, la
 * primera queda "desconectada". Antes cada cliente se abría con
 * target="_blank", así que en una campaña de 40 clientes quedaban 40 pestañas
 * y había que ir cerrando la anterior a mano.
 *
 * Darle un NOMBRE a la ventana en vez de "_blank" hace que el navegador
 * REUTILICE siempre la misma pestaña: el cliente siguiente reemplaza al
 * anterior ahí mismo, y la sesión de WhatsApp Web nunca se corta.
 *
 * Ojo: no se puede combinar con rel="noopener". Si el enlace lleva noopener,
 * el navegador ignora el nombre y abre pestaña nueva (así lo define el
 * estándar). Por eso los enlaces de WhatsApp de la app van sin ese rel.
 */
export const VENTANA_WHATSAPP = "sfida-whatsapp";

/** ¿Estamos en un celular? Ahí conviene wa.me, que abre la app instalada. */
function enCelular() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
}

/**
 * Enlace directo a WhatsApp Web, sin la pantalla intermedia de wa.me.
 *
 * wa.me en PC muestra primero un "Continuar al chat" que hay que clickear:
 * un clic extra por cada cliente. web.whatsapp.com/send abre la conversación
 * de una.
 */
export function enlaceWhatsAppWeb(telefono, texto) {
  if (!telefonoEsValido(telefono)) return null;
  const d = soloNumeros(telefono);
  const conPais = d.length === 9 ? `51${d}` : d;
  return `https://web.whatsapp.com/send?phone=${conPais}&text=${encodeURIComponent(texto)}`;
}

/** El enlace que le conviene a este equipo: WhatsApp Web en PC, app en celular. */
export function enlaceParaEsteEquipo(telefono, texto) {
  return enCelular() ? enlaceWhatsApp(telefono, texto) : enlaceWhatsAppWeb(telefono, texto);
}

/** Abre (o reutiliza) la pestaña de WhatsApp. Devuelve false si el navegador la bloqueó. */
export function abrirWhatsApp(enlace) {
  if (!enlace) return false;
  const ventana = window.open(enlace, VENTANA_WHATSAPP);
  ventana?.focus();
  return !!ventana;
}

/**
 * Para usar en los <a> de las listas: mantiene el href de wa.me como respaldo
 * (sirve para copiar el enlace o abrirlo desde el celular) pero al hacer clic
 * manda a la pestaña reutilizable con el enlace bueno para este equipo.
 *
 * La decisión se toma en el clic, no al renderizar, para que el HTML que
 * genera el servidor y el del navegador sean idénticos.
 */
export function alHacerClicWhatsApp(evento, telefono, texto) {
  const enlace = enlaceParaEsteEquipo(telefono, texto);
  if (!enlace) return;
  evento.preventDefault();
  abrirWhatsApp(enlace);
}

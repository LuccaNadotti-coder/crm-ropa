"use client";

import { useEffect, useRef, useState } from "react";
import { iniciales, colorAvatar, soloNumeros, telefonoLegible } from "@/lib/formato";
import { copiarAlPortapapeles } from "@/lib/portapapeles";

/* ---------------------------------------------------------------- Avatar */

export function Avatar({ nombre, size = "md" }) {
  const medidas = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-9 h-9 text-xs",
    lg: "w-14 h-14 text-lg",
  }[size];
  return (
    <div
      className={`${medidas} ${colorAvatar(nombre)} flex shrink-0 items-center justify-center rounded-full font-bold text-white`}
      aria-hidden="true"
    >
      {iniciales(nombre)}
    </div>
  );
}

/* -------------------------------------------------------------- Insignia */

const TONOS = {
  neutro: "bg-cream text-ink-mute",
  laton: "bg-brass-soft text-brass-dark",
  vino: "bg-wine-soft text-wine-dark",
  exito: "bg-exito-soft text-exito",
  alerta: "bg-alerta-soft text-alerta",
  oscuro: "bg-ink text-white",
};

export function Insignia({ children, tono = "neutro", className = "" }) {
  return <span className={`insignia ${TONOS[tono]} ${className}`}>{children}</span>;
}

/* ------------------------------------------------------------------ KPI */

/**
 * El filete de color arriba es el mismo recurso que usa el dashboard
 * exportable, para que lo impreso y lo que se ve en pantalla se lean como
 * una sola cosa.
 */
export function TarjetaKpi({ etiqueta, valor, detalle, icono, tono = "ink", cargando }) {
  const colorValor = { ink: "text-ink", wine: "text-wine", brass: "text-brass-dark", exito: "text-exito" }[tono];
  const filete = { ink: "bg-ink", wine: "bg-wine", brass: "bg-brass", exito: "bg-exito" }[tono];
  return (
    <div className="carta relative overflow-hidden p-5">
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-[3px] ${filete} opacity-90`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="etiqueta">{etiqueta}</p>
          {cargando ? (
            <div className="esqueleto mt-2 h-9 w-20" />
          ) : (
            <p className={`mt-1.5 text-[32px] font-bold leading-none tracking-tight tabular-nums ${colorValor}`}>
              {valor}
            </p>
          )}
          {detalle && !cargando && <p className="mt-2 text-xs text-ink-mute">{detalle}</p>}
        </div>
        {icono && (
          <div className="shrink-0 rounded-lg bg-cream p-2 text-ink-mute">{icono}</div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Progreso */

export function Progreso({ valor, total, tono = "brass" }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  const color = { brass: "bg-brass", wine: "bg-wine", exito: "bg-exito" }[tono];
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-borde"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${valor} de ${total}`}
    >
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ---------------------------------------------------------- Estado vacío */

export function EstadoVacio({ titulo, texto, accion, icono }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icono && <div className="mb-3 text-ink-faint">{icono}</div>}
      <p className="font-semibold text-ink">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-sm text-ink-mute">{texto}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

/* ------------------------------------------------------------ Esqueletos */

export function FilasEsqueleto({ filas = 6, columnas = 5 }) {
  return (
    <div className="divide-y divide-borde/50">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <div className="esqueleto h-9 w-9 shrink-0 rounded-full" />
          {Array.from({ length: columnas }).map((_, j) => (
            <div key={j} className="esqueleto h-3.5 flex-1" style={{ maxWidth: j === 0 ? 180 : 110 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- Modal */

/**
 * Modal accesible: cierra con Escape, bloquea el scroll del fondo y devuelve
 * el foco al elemento que lo abrió.
 */
export function Modal({ abierto, onCerrar, titulo, descripcion, children, ancho = "max-w-2xl" }) {
  const panelRef = useRef(null);
  const focoPrevio = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    focoPrevio.current = document.activeElement;
    const alPresionar = (e) => { if (e.key === "Escape") onCerrar(); };
    document.addEventListener("keydown", alPresionar);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", alPresionar);
      document.body.style.overflow = overflowPrevio;
      focoPrevio.current?.focus?.();
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-aparecer"
        onClick={onCerrar}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`relative z-10 flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-alta animate-aparecer sm:rounded-xl2 ${ancho}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-borde px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-ink">{titulo}</h2>
            {descripcion && <p className="mt-0.5 text-sm text-ink-mute">{descripcion}</p>}
          </div>
          <button onClick={onCerrar} className="btn-icono -mr-2" aria-label="Cerrar">
            <IconoX />
          </button>
        </div>
        <div className="scroll-fino flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- Panel lateral */

export function PanelLateral({ abierto, onCerrar, titulo, children, pie }) {
  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (e) => { if (e.key === "Escape") onCerrar(); };
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-aparecer" onClick={onCerrar} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-alta animate-entrarPanel"
      >
        <div className="flex items-center justify-between gap-4 border-b border-borde px-5 py-4">
          <h2 className="text-base font-bold text-ink">{titulo}</h2>
          <button onClick={onCerrar} className="btn-icono -mr-2" aria-label="Cerrar">
            <IconoX />
          </button>
        </div>
        <div className="scroll-fino flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {pie && <div className="border-t border-borde px-5 py-4">{pie}</div>}
      </aside>
    </div>
  );
}

/* ---------------------------------------------------------- Confirmación */

/** Reemplaza a window.confirm(), que bloquea el navegador y no se puede estilizar. */
export function Confirmacion({ abierto, titulo, mensaje, textoConfirmar = "Eliminar", onConfirmar, onCancelar, procesando }) {
  return (
    <Modal abierto={abierto} onCerrar={onCancelar} titulo={titulo} ancho="max-w-md">
      <p className="text-sm leading-relaxed text-ink-mute">{mensaje}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onCancelar} className="btn-contorno" disabled={procesando}>Cancelar</button>
        <button onClick={onConfirmar} className="btn-peligro" disabled={procesando}>
          {procesando ? "Eliminando..." : textoConfirmar}
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------- Copiar */

/**
 * Botón "Copiar" con confirmación en el propio botón.
 *
 * Va al lado de los teléfonos: es la forma rápida de pasar un número a
 * WhatsApp Web ya abierto, sin que la app tenga que abrir otra pestaña.
 *
 * stopPropagation porque muchas de estas filas son clickeables (abren la
 * ficha del cliente) y copiar no debería abrir nada.
 */
export function BotonCopiar({
  texto,
  etiqueta = "Copiar",
  etiquetaCopiada = "Copiado",
  descripcion,
  soloIcono = false,
  variante = "chip", // "chip" dentro de listas y tablas; "boton" cuando va solo
  className = "",
}) {
  const [copiado, setCopiado] = useState(false);
  const [fallo, setFallo] = useState(false);
  const temporizador = useRef(null);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const copiar = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const listo = await copiarAlPortapapeles(texto);
    setCopiado(listo);
    setFallo(!listo);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => { setCopiado(false); setFallo(false); }, 1600);
  };

  if (!texto) return null;

  const titulo = fallo
    ? "El navegador no permitió copiar"
    : descripcion || `Copiar ${texto}`;

  const estado = copiado
    ? "border-exito/35 bg-exito-soft text-exito"
    : fallo
      ? "border-alerta/35 bg-alerta-soft text-alerta"
      : "border-borde bg-white text-ink-mute hover:border-brass hover:bg-cream hover:text-ink";

  // El chip es deliberadamente chico: va pegado al número dentro de celdas
  // angostas, y si crece parte el teléfono en varias líneas.
  const forma = variante === "boton"
    ? "btn btn-contorno gap-2"
    : `inline-flex items-center gap-1 rounded-md border px-2 py-[3px] text-[11px] font-semibold ${
        soloIcono ? "px-1.5" : ""
      }`;

  return (
    <button
      type="button"
      onClick={copiar}
      title={titulo}
      aria-label={titulo}
      className={`shrink-0 whitespace-nowrap align-middle transition-colors ${forma} ${
        variante === "boton" && copiado ? "border-exito/35 bg-exito-soft text-exito" : ""
      } ${variante === "chip" ? estado : ""} ${className}`}
    >
      {copiado ? <IconoCheck size={variante === "boton" ? 16 : 12} /> : <IconoCopiar size={variante === "boton" ? 16 : 12} />}
      {!soloIcono && <span>{fallo ? "No se pudo" : copiado ? etiquetaCopiada : etiqueta}</span>}
    </button>
  );
}

/**
 * Teléfono + botón de copiar, la combinación que se repite en casi todas las
 * pantallas. Se copia sin espacios porque así se pega directo en el buscador
 * de WhatsApp.
 *
 * whitespace-nowrap en todo el bloque: en la tabla de Clientes la columna es
 * angosta y sin esto el número salía partido en tres líneas (953 / 501 / 175).
 */
export function TelefonoCopiable({ telefono, className = "", soloIcono = false, legible = true }) {
  const digitos = soloNumeros(telefono);
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}>
      <span className="tabular-nums">{legible ? telefonoLegible(telefono) : digitos || "—"}</span>
      {digitos && (
        <BotonCopiar
          texto={digitos}
          soloIcono={soloIcono}
          descripcion={`Copiar el número ${telefonoLegible(telefono)}`}
        />
      )}
    </span>
  );
}

/* --------------------------------------------------------------- Campo */

export function Campo({ label, children, full, requerido, error, ayuda }) {
  return (
    <div className={`flex flex-col gap-1.5 ${full ? "md:col-span-2" : ""}`}>
      <label className="etiqueta">
        {label} {requerido && <span className="text-wine">*</span>}
      </label>
      {children}
      {error && <p className="text-xs font-medium text-wine">{error}</p>}
      {ayuda && !error && <p className="text-xs text-ink-faint">{ayuda}</p>}
    </div>
  );
}

/* --------------------------------------------------------------- Iconos */

const svg = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

export const IconoX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...svg}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const IconoBuscar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...svg}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const IconoUsuarios = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svg}><path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" /><circle cx="9" cy="7" r="3.5" /><path d="M22 20v-1.5a4 4 0 0 0-3-3.87M16 3.6a4 4 0 0 1 0 7.75" /></svg>
);
export const IconoTorta = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svg}><path d="M3 21h18M4 21v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6" /><path d="M12 13V9M12 6.5V5" /><circle cx="12" cy="4" r=".6" fill="currentColor" /><path d="M4 17c1.5 0 1.5-1.5 3-1.5s1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5 1.5-1.5 3-1.5" /></svg>
);
export const IconoCatalogo = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svg}><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H10a3 3 0 0 1 2 5.2V21a3 3 0 0 0-2-.8H5.5A1.5 1.5 0 0 1 4 18.7Z" /><path d="M20 4.5A1.5 1.5 0 0 0 18.5 3H14a3 3 0 0 0-2 5.2V21a3 3 0 0 1 2-.8h4.5a1.5 1.5 0 0 0 1.5-1.5Z" /></svg>
);
export const IconoInicio = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svg}><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-5.5h4V20" /></svg>
);
export const IconoSalir = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svg}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>
);
export const IconoMas = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svg}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconoExcel = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svg}><path d="M14 3H6a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5V8.5Z" /><path d="M14 3v5.5h5.5" /><path d="m9 12.5 4 5M13 12.5l-4 5" /></svg>
);
export const IconoWhatsApp = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23a8.2 8.2 0 0 1 8.23 8.24c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.09-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07s.9 2.4 1.02 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" /></svg>
);
export const IconoGrafico = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svg}><path d="M3 3v16.5A1.5 1.5 0 0 0 4.5 21H21" /><path d="M7.5 15.5v-3M12 15.5V8M16.5 15.5v-5.5" /></svg>
);
export const IconoAlerta = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svg}><path d="M12 9v4M12 16.5v.5" /><path d="M10.3 3.9 2.6 17.3A1.9 1.9 0 0 0 4.3 20h15.4a1.9 1.9 0 0 0 1.7-2.7L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z" /></svg>
);
export const IconoCheck = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svg}><path d="m20 6-11 11-5-5" /></svg>
);
export const IconoCopiar = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svg}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M15 5.5A1.5 1.5 0 0 0 13.5 4H6a2 2 0 0 0-2 2v7.5A1.5 1.5 0 0 0 5.5 15" /></svg>
);
export const IconoOjo = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svg}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IconoDescargar = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...svg}><path d="M12 3v11" /><path d="m7.5 10 4.5 4.5L16.5 10" /><path d="M4 17.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5" /></svg>
);
export const IconoFlecha = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...svg}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

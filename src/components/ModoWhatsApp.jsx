"use client";

import { telefonoEsValido, enlaceWhatsApp } from "@/lib/formato";
import {
  MODOS, MODO_COPIAR, VENTANA_WHATSAPP,
  useModoWhatsApp, cambiarModoWhatsApp, alHacerClicWhatsApp,
} from "@/lib/whatsapp";
import { BotonCopiar, IconoWhatsApp } from "./ui";

/**
 * Elige cómo abre WhatsApp este equipo. Se guarda por navegador, así que cada
 * tienda puede usar una forma distinta sin pisarse con las demás.
 */
export function SelectorModoWhatsApp({ compacto = false }) {
  const modo = useModoWhatsApp();
  const elegido = MODOS.find((m) => m.id === modo) || MODOS[0];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="etiqueta">Cómo abro WhatsApp</p>
        {!compacto && <span className="text-[11px] text-ink-faint">Se recuerda en esta PC</span>}
      </div>

      <div
        role="radiogroup"
        aria-label="Cómo abro WhatsApp"
        className="mt-1.5 flex rounded-lg border border-borde bg-white p-0.5"
      >
        {MODOS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={modo === m.id}
            title={m.detalle}
            onClick={() => cambiarModoWhatsApp(m.id)}
            className={`flex-1 rounded-md px-2 py-1.5 text-[12px] font-semibold transition-colors ${
              modo === m.id ? "bg-ink text-white" : "text-ink-mute hover:bg-cream hover:text-ink"
            }`}
          >
            {compacto ? m.corto : m.nombre}
          </button>
        ))}
      </div>

      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">{elegido.detalle}</p>
    </div>
  );
}

/**
 * El botón verde de las listas. Según el modo abre la conversación o, si el
 * equipo eligió "solo copiar", copia el mensaje listo para pegar.
 *
 * alEnviar corre en ambos casos: es lo que deja constancia del envío para el
 * tope diario, igual que cuando solo existía el enlace.
 */
export function BotonWhatsApp({
  telefono,
  texto,
  etiqueta = "WhatsApp",
  soloIcono = false,
  className = "",
  claseCopiar = "",
  claseEtiqueta = "",
  alEnviar,
  preparar,
}) {
  const modo = useModoWhatsApp();
  if (!telefonoEsValido(telefono)) return null;

  if (modo === MODO_COPIAR) {
    return (
      <BotonCopiar
        variante="libre"
        texto={texto}
        etiqueta="Copiar mensaje"
        etiquetaCopiada="Copiado"
        descripcion="Copiar el mensaje para pegarlo en el WhatsApp que ya tienes abierto"
        soloIcono={soloIcono}
        className={claseCopiar || className}
        alCopiar={alEnviar}
      />
    );
  }

  return (
    <a
      href={enlaceWhatsApp(telefono, texto)}
      // Ventana con nombre, no _blank, y sin rel="noopener" (ver lib/whatsapp.js).
      target={VENTANA_WHATSAPP}
      onClick={async (e) => {
        // preparar corre ANTES de abrir el chat porque es donde se copia la
        // tarjeta: el portapapeles solo acepta escrituras con la pestaña en
        // foco, y al abrir WhatsApp el foco se va. Son milisegundos, así que
        // el permiso del clic sigue vigente cuando toca abrir.
        if (preparar) {
          e.preventDefault();
          await preparar();
        }
        alEnviar?.();
        alHacerClicWhatsApp(e, telefono, texto, modo);
      }}
      className={className}
      aria-label={soloIcono ? etiqueta : undefined}
    >
      <IconoWhatsApp size={soloIcono ? 17 : 15} />
      {!soloIcono && <span className={claseEtiqueta}>{etiqueta}</span>}
    </a>
  );
}

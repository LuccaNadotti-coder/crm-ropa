"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { IconoCheck, IconoAlerta, IconoX } from "./ui";

// Sustituye a los alert() del navegador, que bloquean la página y no se ven bien.

const ContextoAvisos = createContext(null);

export function ProveedorAvisos({ children }) {
  const [avisos, setAvisos] = useState([]);

  const quitar = useCallback((id) => {
    setAvisos((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const mostrar = useCallback((texto, tipo = "exito", duracion = 4000) => {
    // Date.now() + contador: dos avisos en el mismo milisegundo no colisionan.
    const id = `${Date.now()}-${Math.round(performance.now() * 1000)}`;
    setAvisos((prev) => [...prev, { id, texto, tipo }]);
    if (duracion > 0) setTimeout(() => quitar(id), duracion);
    return id;
  }, [quitar]);

  const api = useMemo(() => ({
    exito: (t) => mostrar(t, "exito"),
    error: (t) => mostrar(t, "error", 7000),
    info: (t) => mostrar(t, "info"),
  }), [mostrar]);

  return (
    <ContextoAvisos.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-4 sm:items-end"
        role="status"
        aria-live="polite"
      >
        {avisos.map((a) => (
          <Aviso key={a.id} {...a} onCerrar={() => quitar(a.id)} />
        ))}
      </div>
    </ContextoAvisos.Provider>
  );
}

function Aviso({ texto, tipo, onCerrar }) {
  const estilos = {
    exito: "bg-ink text-white",
    error: "bg-wine text-white",
    info: "bg-brass-dark text-white",
  }[tipo];

  return (
    <div
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3 shadow-alta animate-aparecer ${estilos}`}
    >
      <span className="mt-0.5 shrink-0 opacity-90">
        {tipo === "error" ? <IconoAlerta size={17} /> : <IconoCheck size={17} />}
      </span>
      <p className="flex-1 text-sm font-medium leading-snug">{texto}</p>
      <button onClick={onCerrar} className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100" aria-label="Cerrar aviso">
        <IconoX />
      </button>
    </div>
  );
}

export function useAvisos() {
  const ctx = useContext(ContextoAvisos);
  if (!ctx) throw new Error("useAvisos debe usarse dentro de <ProveedorAvisos>");
  return ctx;
}

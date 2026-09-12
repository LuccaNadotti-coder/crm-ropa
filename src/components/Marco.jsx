"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { requireSession, cerrarSesion } from "@/lib/auth-helpers";
import {
  IconoInicio, IconoUsuarios, IconoTorta, IconoCatalogo, IconoSalir,
  IconoWhatsApp, IconoGrafico, Avatar,
} from "./ui";

const SECCIONES = [
  { href: "/",           etiqueta: "Resumen",    corta: "Resumen",  Icono: IconoInicio },
  { href: "/clientes",   etiqueta: "Clientes",   corta: "Clientes", Icono: IconoUsuarios },
  { href: "/catalogos",  etiqueta: "Catálogos",  corta: "Catálogo", Icono: IconoCatalogo },
  { href: "/campanas",   etiqueta: "Campañas",   corta: "Campaña",  Icono: IconoWhatsApp },
  { href: "/cumpleanos", etiqueta: "Cumpleaños", corta: "Cumple",   Icono: IconoTorta },
  { href: "/reportes",   etiqueta: "Reportes",   corta: "Reportes", Icono: IconoGrafico },
];

/**
 * Envuelve cada página: barra lateral en escritorio, barra inferior en celular,
 * y resuelve la sesión una sola vez. Antes cada pantalla repetía ese código y
 * había que volver al inicio para cambiar de sección.
 */
export default function Marco({ children, titulo, descripcion, acciones }) {
  const router = useRouter();
  const ruta = usePathname();
  const [perfil, setPerfil] = useState(null);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    (async () => {
      const resultado = await requireSession(router);
      if (resultado) setPerfil(resultado.perfil);
      setVerificando(false);
    })();
  }, [router]);

  if (verificando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-arena">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-borde border-t-brass" />
          <p className="text-sm text-ink-mute">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!perfil) return null; // requireSession ya redirigió a /login

  const esAdmin = perfil.rol === "admin";

  return (
    <div className="min-h-screen bg-arena">
      {/* ---------- Barra lateral (escritorio) ---------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-borde bg-white lg:flex">
        <div className="border-b border-borde px-5 py-5">
          <p className="text-base font-bold leading-tight tracking-tight text-ink">SFIDA</p>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brass">Investor CRM</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {SECCIONES.map(({ href, etiqueta, Icono }) => {
            const activo = href === "/" ? ruta === "/" : ruta.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={activo ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  activo ? "bg-ink text-white" : "text-ink-mute hover:bg-cream hover:text-ink"
                }`}
              >
                <Icono size={18} />
                {etiqueta}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-borde p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar nombre={perfil.nombre || "Usuario"} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{perfil.nombre || "Usuario"}</p>
              <p className="truncate text-[11px] text-ink-mute">
                {esAdmin ? "Todas las tiendas" : perfil.tienda}
              </p>
            </div>
          </div>
          <button
            onClick={() => cerrarSesion(router)}
            className="btn-fantasma btn-sm mt-1 w-full justify-start"
          >
            <IconoSalir size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ---------- Contenido ---------- */}
      <div className="lg:pl-60">
        {/* Cabecera móvil */}
        <div className="flex items-center justify-between border-b border-borde bg-white px-4 py-3 lg:hidden">
          <div>
            <p className="text-sm font-bold leading-none text-ink">SFIDA</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brass">Investor CRM</p>
          </div>
          <div className="flex items-center gap-2">
            <Insignia perfil={perfil} esAdmin={esAdmin} />
            <button onClick={() => cerrarSesion(router)} className="btn-icono" aria-label="Cerrar sesión">
              <IconoSalir size={17} />
            </button>
          </div>
        </div>

        <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-8">
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{titulo}</h1>
              {descripcion && <p className="mt-1 text-sm text-ink-mute">{descripcion}</p>}
            </div>
            {acciones && <div className="flex shrink-0 flex-wrap gap-2">{acciones(perfil)}</div>}
          </header>

          {typeof children === "function" ? children(perfil) : children}
        </main>
      </div>

      {/* ---------- Barra inferior (celular) ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-borde bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl">
          {SECCIONES.map(({ href, corta, Icono }) => {
            const activo = href === "/" ? ruta === "/" : ruta.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={activo ? "page" : undefined}
                aria-label={corta}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  activo ? "text-wine" : "text-ink-faint"
                }`}
              >
                <Icono size={20} />
                <span className="max-w-full truncate px-0.5">{corta}</span>
              </Link>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}

function Insignia({ perfil, esAdmin }) {
  return (
    <span className={`insignia ${esAdmin ? "bg-ink text-white" : "bg-brass-soft text-brass-dark"}`}>
      {esAdmin ? "Admin" : perfil.tienda?.replace(" SFIDA", "")}
    </span>
  );
}

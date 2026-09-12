"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { traerTodas } from "@/lib/db";
import { MESES, diaYMes, telefonoLegible } from "@/lib/formato";
import Marco from "@/components/Marco";
import {
  TarjetaKpi, Progreso, Insignia, Avatar, EstadoVacio,
  IconoUsuarios, IconoCatalogo, IconoTorta, IconoFlecha, IconoMas,
} from "@/components/ui";

export default function Resumen() {
  return (
    <Marco
      titulo="Resumen"
      descripcion="Cómo va el mes en tus tiendas."
      acciones={() => (
        <Link href="/clientes" className="btn-primario">
          <IconoMas />
          Nuevo cliente
        </Link>
      )}
    >
      {(perfil) => <Contenido perfil={perfil} />}
    </Marco>
  );
}

function Contenido({ perfil }) {
  const [clientes, setClientes] = useState([]);
  const [enviosMes, setEnviosMes] = useState({});
  const [cargando, setCargando] = useState(true);

  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth() + 1;
  const esAdmin = perfil.rol === "admin";

  useEffect(() => {
    (async () => {
      try {
        const [listaClientes, envios] = await Promise.all([
          traerTodas(() =>
            supabase.from("clientes").select("*").order("nombre").order("id")
          ),
          traerTodas(() =>
            supabase
              .from("envios_catalogo")
              .select("cliente_id, enviado")
              .eq("anio", anio)
              .eq("mes", mes)
              .order("cliente_id")
          ),
        ]);
        setClientes(listaClientes);
        const mapa = {};
        envios.forEach((e) => { mapa[e.cliente_id] = e.enviado; });
        setEnviosMes(mapa);
      } finally {
        setCargando(false);
      }
    })();
  }, [anio, mes]);

  const conCatalogo = clientes.filter((c) => enviosMes[c.id]).length;

  // Cumpleaños: se compara día y mes ignorando el año de nacimiento.
  const diasHasta = (fecha) => {
    if (!fecha) return null;
    const [, m, d] = String(fecha).slice(0, 10).split("-").map(Number);
    const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    let proximo = new Date(hoy.getFullYear(), m - 1, d);
    if (proximo < base) proximo = new Date(hoy.getFullYear() + 1, m - 1, d);
    return Math.round((proximo - base) / 86400000);
  };

  const cumpleProximos = clientes
    .map((c) => ({ ...c, dias: diasHasta(c.fecha_nacimiento) }))
    .filter((c) => c.dias !== null && c.dias <= 7)
    .sort((a, b) => a.dias - b.dias);

  const cumplenHoy = cumpleProximos.filter((c) => c.dias === 0).length;

  const nuevosEsteMes = clientes.filter((c) => {
    if (!c.created_at) return false;
    const f = new Date(c.created_at);
    return f.getFullYear() === anio && f.getMonth() + 1 === mes;
  }).length;

  const porTienda = Object.entries(
    clientes.reduce((acc, c) => {
      const t = c.tienda || "Sin tienda";
      if (!acc[t]) acc[t] = { total: 0, conCatalogo: 0 };
      acc[t].total++;
      if (enviosMes[c.id]) acc[t].conCatalogo++;
      return acc;
    }, {})
  ).sort((a, b) => b[1].total - a[1].total);

  const pendientes = clientes.length - conCatalogo;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKpi
          etiqueta="Clientes registrados"
          valor={clientes.length}
          detalle={esAdmin ? "En todas las tiendas" : perfil.tienda}
          icono={<IconoUsuarios />}
          cargando={cargando}
        />
        <TarjetaKpi
          etiqueta={`Catálogo de ${MESES[mes - 1]}`}
          valor={cargando ? "" : `${conCatalogo}`}
          detalle={`de ${clientes.length} clientes`}
          tono="brass"
          icono={<IconoCatalogo />}
          cargando={cargando}
        />
        <TarjetaKpi
          etiqueta="Cumpleaños esta semana"
          valor={cumpleProximos.length}
          detalle={cumplenHoy > 0 ? `${cumplenHoy} cumplen hoy` : "Ninguno hoy"}
          tono="wine"
          icono={<IconoTorta />}
          cargando={cargando}
        />
        <TarjetaKpi
          etiqueta="Nuevos este mes"
          valor={nuevosEsteMes}
          detalle={`Registrados en ${MESES[mes - 1]}`}
          tono="exito"
          icono={<IconoMas size={20} />}
          cargando={cargando}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Avance del catálogo */}
        <section className="carta p-5 lg:col-span-3">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="font-bold text-ink">Avance del catálogo</h2>
              <p className="text-sm text-ink-mute">{MESES[mes - 1]} {anio}</p>
            </div>
            <Link href="/catalogos" className="flex items-center gap-1 text-sm font-semibold text-wine hover:underline">
              Ir a catálogos <IconoFlecha />
            </Link>
          </div>

          {cargando ? (
            <div className="mt-6 space-y-4">
              {[1, 2, 3].map((i) => <div key={i} className="esqueleto h-10 w-full" />)}
            </div>
          ) : clientes.length === 0 ? (
            <EstadoVacio titulo="Aún no hay clientes" texto="Registra el primero para empezar a medir." />
          ) : (
            <>
              <div className="mt-5">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-ink">
                    {conCatalogo} de {clientes.length} enviados
                  </span>
                  <span className="text-2xl font-bold tabular-nums text-brass-dark">
                    {clientes.length ? Math.round((conCatalogo / clientes.length) * 100) : 0}%
                  </span>
                </div>
                <Progreso valor={conCatalogo} total={clientes.length} />
                {pendientes > 0 && (
                  <p className="mt-2 text-xs text-ink-mute">
                    Faltan <strong className="text-ink">{pendientes}</strong> clientes por recibir el catálogo de este mes.
                  </p>
                )}
              </div>

              {esAdmin && porTienda.length > 1 && (
                <div className="mt-6 space-y-3.5 border-t border-borde pt-5">
                  <p className="etiqueta">Por tienda</p>
                  {porTienda.map(([tienda, datos]) => (
                    <div key={tienda}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate font-medium text-ink">{tienda}</span>
                        <span className="shrink-0 tabular-nums text-ink-mute">
                          {datos.conCatalogo}/{datos.total}
                        </span>
                      </div>
                      <Progreso
                        valor={datos.conCatalogo}
                        total={datos.total}
                        tono={datos.conCatalogo === datos.total ? "exito" : "brass"}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* Cumpleaños */}
        <section className="carta flex flex-col p-5 lg:col-span-2">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-bold text-ink">Próximos cumpleaños</h2>
            <Link href="/cumpleanos" className="flex items-center gap-1 text-sm font-semibold text-wine hover:underline">
              Ver todos <IconoFlecha />
            </Link>
          </div>

          {cargando ? (
            <div className="mt-5 space-y-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="esqueleto h-12 w-full" />)}
            </div>
          ) : cumpleProximos.length === 0 ? (
            <EstadoVacio titulo="Sin cumpleaños esta semana" texto="Vuelve a revisar en unos días." />
          ) : (
            <ul className="mt-4 divide-y divide-borde/60">
              {cumpleProximos.slice(0, 6).map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <Avatar nombre={c.nombre} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{c.nombre}</p>
                    <p className="truncate text-xs text-ink-mute">
                      {diaYMes(c.fecha_nacimiento)} · {telefonoLegible(c.telefono)}
                    </p>
                  </div>
                  <Insignia tono={c.dias === 0 ? "vino" : "neutro"}>
                    {c.dias === 0 ? "Hoy" : c.dias === 1 ? "Mañana" : `${c.dias} días`}
                  </Insignia>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

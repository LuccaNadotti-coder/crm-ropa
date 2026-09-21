"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { traerTodas } from "@/lib/db";
import { registrarEnvio, ORIGEN } from "@/lib/envios";
import { TIENDAS } from "@/lib/peru-ubigeo";
import {
  MESES, paraBuscar, telefonoLegible, enlaceWhatsApp, haceCuanto, telefonoEsValido,
} from "@/lib/formato";
import { veTodasLasTiendas, puedeEditar, puedeEnviarWhatsApp } from "@/lib/permisos";
import { BotonWhatsApp } from "@/components/ModoWhatsApp";
import Marco from "@/components/Marco";
import { useAvisos } from "@/components/Avisos";
import {
  Avatar, Insignia, Progreso, EstadoVacio, FilasEsqueleto, TelefonoCopiable,
  IconoBuscar, IconoWhatsApp, IconoCatalogo, IconoX,
} from "@/components/ui";

const textoCatalogo = (c) =>
  `Hola ${c.nombre}, te compartimos nuestro nuevo catálogo con las últimas novedades y promociones. ¡Esperamos que te encante! 🛍️`;

export default function PaginaCatalogos() {
  return (
    <Marco
      titulo="Catálogos"
      descripcion="Marca qué clientes ya recibieron el catálogo de cada mes."
    >
      {(perfil) => <Contenido perfil={perfil} />}
    </Marco>
  );
}

function Contenido({ perfil }) {
  const avisos = useAvisos();
  const verTodo = veTodasLasTiendas(perfil);
  const puedeMarcar = puedeEditar(perfil);
  const mandarWhatsApp = puedeEnviarWhatsApp(perfil);

  const [clientes, setClientes] = useState([]);
  const [envios, setEnvios] = useState({});
  const [ultimos, setUltimos] = useState({});
  const [cargando, setCargando] = useState(true);
  const [cargandoEnvios, setCargandoEnvios] = useState(true);
  const [guardandoId, setGuardandoId] = useState(null);

  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio] = useState(new Date().getFullYear());
  const [busqueda, setBusqueda] = useState("");
  const [filtroTienda, setFiltroTienda] = useState("");
  const [estado, setEstado] = useState("no_enviados");

  /* -------------------------------------------------------------- Carga */

  useEffect(() => {
    (async () => {
      try {
        const data = await traerTodas(() =>
          supabase.from("clientes").select("*").order("nombre").order("id")
        );
        setClientes(data);
      } catch (e) {
        avisos.error("No se pudieron cargar los clientes: " + e.message);
      }
      setCargando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarEnvios = async () => {
    setCargandoEnvios(true);
    try {
      const delMes = await traerTodas(() =>
        supabase.from("envios_catalogo").select("cliente_id, enviado")
          .eq("anio", anio).eq("mes", mes).order("cliente_id")
      );
      const mapa = {};
      delMes.forEach((e) => { mapa[e.cliente_id] = e.enviado; });
      setEnvios(mapa);

      const historial = await traerTodas(() =>
        supabase.from("envios_catalogo").select("cliente_id, fecha_marcado")
          .eq("enviado", true)
          .order("fecha_marcado", { ascending: false }).order("cliente_id")
      );
      const ultimo = {};
      historial.forEach((e) => { if (!ultimo[e.cliente_id]) ultimo[e.cliente_id] = e.fecha_marcado; });
      setUltimos(ultimo);
    } catch (e) {
      avisos.error("No se pudieron cargar los envíos: " + e.message);
    }
    setCargandoEnvios(false);
  };

  useEffect(() => { cargarEnvios(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mes, anio]);

  /* ------------------------------------------------------------- Marcar */

  const marcar = async (cliente) => {
    if (!puedeMarcar) return;
    const nuevo = !envios[cliente.id];
    setGuardandoId(cliente.id);
    setEnvios((prev) => ({ ...prev, [cliente.id]: nuevo })); // respuesta inmediata

    const { error } = await supabase.from("envios_catalogo").upsert(
      { cliente_id: cliente.id, anio, mes, enviado: nuevo, fecha_marcado: new Date().toISOString() },
      { onConflict: "cliente_id,anio,mes" }
    );

    setGuardandoId(null);
    if (error) {
      setEnvios((prev) => ({ ...prev, [cliente.id]: !nuevo })); // se revierte
      avisos.error("No se pudo guardar: " + error.message);
    } else if (nuevo) {
      setUltimos((prev) => ({ ...prev, [cliente.id]: new Date().toISOString() }));
    }
  };

  /* ------------------------------------------------------------ Listado */

  const enAlcance = useMemo(() => {
    const q = paraBuscar(busqueda);
    return clientes.filter((c) => {
      if (filtroTienda && c.tienda !== filtroTienda) return false;
      if (!q) return true;
      return paraBuscar([c.nombre, c.telefono, c.distrito].join(" ")).includes(q);
    });
  }, [clientes, busqueda, filtroTienda]);

  const lista = useMemo(() => {
    let l = enAlcance;
    if (estado === "no_enviados") l = l.filter((c) => !envios[c.id]);
    if (estado === "enviados") l = l.filter((c) => envios[c.id]);

    if (estado === "no_enviados") {
      // Primero quienes llevan más tiempo sin recibir catálogo.
      l = [...l].sort((a, b) => {
        const fa = ultimos[a.id] ? new Date(ultimos[a.id]).getTime() : 0;
        const fb = ultimos[b.id] ? new Date(ultimos[b.id]).getTime() : 0;
        return fa - fb;
      });
    }
    return l;
  }, [enAlcance, envios, estado, ultimos]);

  const enviados = enAlcance.filter((c) => envios[c.id]).length;
  const pct = enAlcance.length ? Math.round((enviados / enAlcance.length) * 100) : 0;

  const porTienda = useMemo(() => {
    if (!verTodo || filtroTienda) return [];
    const acc = {};
    enAlcance.forEach((c) => {
      const t = c.tienda || "Sin tienda";
      if (!acc[t]) acc[t] = { total: 0, enviados: 0 };
      acc[t].total++;
      if (envios[c.id]) acc[t].enviados++;
    });
    return Object.entries(acc).sort((a, b) => b[1].total - a[1].total);
  }, [enAlcance, envios, verTodo, filtroTienda]);

  const textoUltimo = (id) => {
    const f = ultimos[id];
    if (!f) return "Nunca recibió catálogo";
    const cuando = haceCuanto(f);
    return cuando === "hoy" ? "Recibió catálogo hoy" : `Último catálogo ${cuando}`;
  };

  return (
    <>
      {/* Progreso del mes */}
      <div className="carta mb-5 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="etiqueta">Enviados en {MESES[mes - 1]} {anio}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-ink">
              {cargandoEnvios ? "—" : enviados}
              <span className="text-lg font-medium text-ink-faint"> / {enAlcance.length}</span>
            </p>
          </div>
          <p className="text-4xl font-bold tabular-nums text-brass-dark">{cargandoEnvios ? "—" : `${pct}%`}</p>
        </div>
        <div className="mt-4"><Progreso valor={enviados} total={enAlcance.length} tono={pct === 100 ? "exito" : "brass"} /></div>

        {porTienda.length > 1 && (
          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-borde pt-4 sm:grid-cols-2 lg:grid-cols-3">
            {porTienda.map(([tienda, d]) => (
              <div key={tienda}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate font-medium text-ink">{tienda}</span>
                  <span className="shrink-0 tabular-nums text-ink-mute">{d.enviados}/{d.total}</span>
                </div>
                <Progreso valor={d.enviados} total={d.total} tono={d.enviados === d.total ? "exito" : "brass"} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="carta mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
              <IconoBuscar />
            </span>
            <input className="input pl-9" placeholder="Buscar cliente..." value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar cliente" />
            {busqueda && (
              <button onClick={() => setBusqueda("")} className="absolute right-2 top-1/2 -translate-y-1/2 btn-icono" aria-label="Limpiar">
                <IconoX />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="input w-auto" value={mes} onChange={(e) => setMes(Number(e.target.value))} aria-label="Mes">
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m} {anio}</option>)}
            </select>
            <select className="input w-auto" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
              <option value="no_enviados">Pendientes</option>
              <option value="enviados">Ya enviados</option>
              <option value="todos">Todos</option>
            </select>
            {verTodo && (
              <select className="input w-auto" value={filtroTienda} onChange={(e) => setFiltroTienda(e.target.value)} aria-label="Tienda">
                <option value="">Todas las tiendas</option>
                {TIENDAS.map((t) => <option key={t}>{t}</option>)}
              </select>
            )}
          </div>
        </div>
        {estado === "no_enviados" && lista.length > 0 && (
          <p className="mt-3 text-xs text-ink-mute">
            Ordenados por prioridad: primero quienes llevan más tiempo sin recibir catálogo.
          </p>
        )}
      </div>

      {/* Lista */}
      <div className="carta overflow-hidden">
        {cargando || cargandoEnvios ? (
          <FilasEsqueleto filas={7} columnas={3} />
        ) : lista.length === 0 ? (
          <EstadoVacio
            icono={<IconoCatalogo size={34} />}
            titulo={estado === "no_enviados" ? "¡Todos al día!" : "Sin resultados"}
            texto={
              estado === "no_enviados"
                ? `Todos los clientes de esta vista ya recibieron el catálogo de ${MESES[mes - 1]}.`
                : "Prueba con otro filtro o búsqueda."
            }
          />
        ) : (
          <ul className="divide-y divide-borde/60">
            {lista.map((c) => {
              const marcado = !!envios[c.id];
              return (
                <li key={c.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${marcado ? "bg-exito-soft/40" : ""}`}>
                  <input
                    type="checkbox"
                    checked={marcado}
                    disabled={!puedeMarcar || guardandoId === c.id}
                    onChange={() => marcar(c)}
                    className="h-5 w-5 shrink-0 cursor-pointer accent-brass disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={
                      puedeMarcar
                        ? `Marcar catálogo de ${MESES[mes - 1]} para ${c.nombre}`
                        : `Catálogo de ${MESES[mes - 1]} de ${c.nombre}`
                    }
                    title={puedeMarcar ? undefined : "Cuenta de solo lectura"}
                  />
                  <Avatar nombre={c.nombre} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-medium ${marcado ? "text-ink-faint line-through" : "text-ink"}`}>
                      {c.nombre}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-ink-mute">
                      <TelefonoCopiable telefono={c.telefono} soloIcono />
                      <span className="truncate">
                        · {c.distrito || "—"}
                        {verTodo && c.tienda ? ` · ${c.tienda.replace(" SFIDA", "")}` : ""}
                      </span>
                    </p>
                    <p className={`truncate text-xs ${ultimos[c.id] ? "text-brass-dark" : "text-wine"}`}>
                      {textoUltimo(c.id)}
                    </p>
                  </div>
                  {marcado && <Insignia tono="exito" className="hidden sm:inline-flex">Enviado</Insignia>}
                  {mandarWhatsApp && (
                    <BotonWhatsApp
                      telefono={c.telefono}
                      texto={textoCatalogo(c)}
                      etiqueta="WhatsApp"
                      claseEtiqueta="hidden sm:inline"
                      className="btn-excel btn-sm shrink-0"
                      alEnviar={() => registrarEnvio(c, ORIGEN.CATALOGO)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

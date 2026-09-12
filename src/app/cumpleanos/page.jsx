"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { traerTodas } from "@/lib/db";
import { registrarEnvio } from "@/lib/envios";
import { TIENDAS } from "@/lib/peru-ubigeo";
import {
  paraBuscar, diaYMes, edadDesde, telefonoLegible, enlaceWhatsApp, telefonoEsValido,
} from "@/lib/formato";
import Marco from "@/components/Marco";
import { useAvisos } from "@/components/Avisos";
import {
  Avatar, Insignia, TarjetaKpi, EstadoVacio, FilasEsqueleto,
  IconoTorta, IconoWhatsApp, IconoBuscar, IconoX,
} from "@/components/ui";

const RANGOS = [
  { id: "hoy", etiqueta: "Hoy", dias: 0 },
  { id: "semana", etiqueta: "7 días", dias: 7 },
  { id: "quincena", etiqueta: "15 días", dias: 15 },
  { id: "mes", etiqueta: "30 días", dias: 30 },
];

export default function PaginaCumpleanos() {
  return (
    <Marco titulo="Cumpleaños" descripcion="Saluda a tiempo y registra lo que ya enviaste.">
      {(perfil) => <Contenido perfil={perfil} />}
    </Marco>
  );
}

function Contenido({ perfil }) {
  const avisos = useAvisos();
  const esAdmin = perfil.rol === "admin";

  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [rango, setRango] = useState("semana");
  const [busqueda, setBusqueda] = useState("");
  const [filtroTienda, setFiltroTienda] = useState("");
  const [marcandoId, setMarcandoId] = useState(null);

  const anio = new Date().getFullYear();

  const cargar = async () => {
    try {
      const data = await traerTodas(() =>
        supabase.from("vista_cumpleanos").select("*").order("dias_faltantes").order("id")
      );
      setClientes(data);
    } catch (e) {
      avisos.error("No se pudieron cargar los cumpleaños: " + e.message);
    }
    setCargando(false);
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const marcarTarea = async (cliente, campo) => {
    const yaHecho = cliente[campo] === anio;
    const nuevo = yaHecho ? null : anio;
    setMarcandoId(cliente.id + campo);

    // Se actualiza en pantalla de inmediato y se revierte si falla.
    setClientes((prev) => prev.map((c) => (c.id === cliente.id ? { ...c, [campo]: nuevo } : c)));

    const { error } = await supabase.from("clientes").update({ [campo]: nuevo }).eq("id", cliente.id);
    setMarcandoId(null);

    if (error) {
      setClientes((prev) => prev.map((c) => (c.id === cliente.id ? { ...c, [campo]: cliente[campo] } : c)));
      avisos.error("No se pudo guardar: " + error.message);
    }
  };

  const filtrados = useMemo(() => {
    const limite = RANGOS.find((r) => r.id === rango).dias;
    const q = paraBuscar(busqueda);
    return clientes.filter((c) => {
      if (c.dias_faltantes > limite) return false;
      if (filtroTienda && c.tienda !== filtroTienda) return false;
      if (!q) return true;
      return paraBuscar([c.nombre, c.telefono, c.distrito, c.asesora].join(" ")).includes(q);
    });
  }, [clientes, rango, busqueda, filtroTienda]);

  const hoy = clientes.filter((c) => c.dias_faltantes === 0);
  const semana = clientes.filter((c) => c.dias_faltantes <= 7);
  const pendientesSaludo = filtrados.filter(
    (c) => c.dias_faltantes === 0 && c.saludo_cumple_anio !== anio
  ).length;

  return (
    <>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TarjetaKpi etiqueta="Cumplen hoy" valor={hoy.length} tono="wine" icono={<IconoTorta />} cargando={cargando} />
        <TarjetaKpi etiqueta="Próximos 7 días" valor={semana.length} cargando={cargando} />
        <TarjetaKpi
          etiqueta="Saludos pendientes hoy"
          valor={pendientesSaludo}
          detalle={pendientesSaludo === 0 ? "Todo al día" : "Sin carta enviada"}
          tono={pendientesSaludo > 0 ? "brass" : "exito"}
          cargando={cargando}
        />
      </div>

      <div className="carta mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"><IconoBuscar /></span>
            <input className="input pl-9" placeholder="Buscar cliente..." value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar" />
            {busqueda && (
              <button onClick={() => setBusqueda("")} className="absolute right-2 top-1/2 -translate-y-1/2 btn-icono" aria-label="Limpiar"><IconoX /></button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-borde bg-white p-0.5">
              {RANGOS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRango(r.id)}
                  aria-pressed={rango === r.id}
                  className={`rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                    rango === r.id ? "bg-ink text-white" : "text-ink-mute hover:bg-cream"
                  }`}
                >
                  {r.etiqueta}
                </button>
              ))}
            </div>
            {esAdmin && (
              <select className="input w-auto" value={filtroTienda} onChange={(e) => setFiltroTienda(e.target.value)} aria-label="Tienda">
                <option value="">Todas las tiendas</option>
                {TIENDAS.map((t) => <option key={t}>{t}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {cargando ? (
        <div className="carta overflow-hidden"><FilasEsqueleto filas={6} columnas={3} /></div>
      ) : filtrados.length === 0 ? (
        <div className="carta">
          <EstadoVacio
            icono={<IconoTorta size={34} />}
            titulo="Sin cumpleaños en este rango"
            texto="Prueba ampliando el rango de días o quitando los filtros."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((c) => (
            <TarjetaCumple
              key={c.id}
              cliente={c}
              anio={anio}
              esAdmin={esAdmin}
              marcandoId={marcandoId}
              onMarcar={marcarTarea}
            />
          ))}
        </div>
      )}
    </>
  );
}

function TarjetaCumple({ cliente: c, anio, esAdmin, marcandoId, onMarcar }) {
  const esHoy = c.dias_faltantes === 0;
  const edad = edadDesde(c.fecha_nacimiento);
  const cumpleAnios = edad != null ? edad + (esHoy ? 0 : 1) : null;

  const texto = esHoy
    ? `Hola ${c.nombre}, ¡feliz cumpleaños de nuestra parte! 🎉 Tienes 10% de descuento toda esta semana.`
    : `Hola ${c.nombre}, ¡pronto es tu cumpleaños! 🎂 Te esperamos con un descuento especial.`;

  return (
    <article className={`carta flex flex-col p-5 ${esHoy ? "border-wine/30 bg-wine text-white" : ""}`}>
      <div className="flex items-start gap-3">
        <Avatar nombre={c.nombre} />
        <div className="min-w-0 flex-1">
          <h3 className={`truncate font-semibold leading-tight ${esHoy ? "text-white" : "text-ink"}`}>{c.nombre}</h3>
          <p className={`mt-0.5 truncate text-xs ${esHoy ? "text-white/75" : "text-ink-mute"}`}>
            {c.asesora || "Sin asesora"} · {c.distrito || "—"}
            {esAdmin && c.tienda ? ` · ${c.tienda.replace(" SFIDA", "")}` : ""}
          </p>
          <p className={`truncate text-xs tabular-nums ${esHoy ? "text-white/75" : "text-ink-mute"}`}>
            {telefonoLegible(c.telefono)}
          </p>
        </div>
        <Insignia tono={esHoy ? "neutro" : c.dias_faltantes <= 3 ? "vino" : "laton"} className="shrink-0">
          {esHoy ? "🎉 Hoy" : c.dias_faltantes === 1 ? "Mañana" : `${c.dias_faltantes} días`}
        </Insignia>
      </div>

      <p className={`mt-3 text-xs ${esHoy ? "text-white/80" : "text-ink-mute"}`}>
        {diaYMes(c.fecha_nacimiento)}
        {cumpleAnios != null ? ` · cumple ${cumpleAnios} años` : ""}
      </p>

      {telefonoEsValido(c.telefono) ? (
        <a
          href={enlaceWhatsApp(c.telefono, texto)}
          target="_blank" rel="noopener noreferrer"
          onClick={() => registrarEnvio(c, "cumpleanos")}
          className={`mt-4 ${esHoy ? "btn bg-white text-wine hover:bg-cream" : "btn-excel"}`}
        >
          <IconoWhatsApp />
          Enviar saludo
        </a>
      ) : (
        <p className={`mt-4 rounded-lg px-3 py-2.5 text-center text-xs ${esHoy ? "bg-white/15 text-white" : "bg-alerta-soft text-alerta"}`}>
          Teléfono inválido · no se puede enviar
        </p>
      )}

      <div className={`mt-4 space-y-2 border-t pt-3 ${esHoy ? "border-white/20" : "border-borde"}`}>
        <Casilla
          hecho={c.saludo_cumple_anio === anio}
          texto="Carta de cumpleaños enviada"
          oscuro={esHoy}
          cargando={marcandoId === c.id + "saludo_cumple_anio"}
          onCambiar={() => onMarcar(c, "saludo_cumple_anio")}
        />
        <Casilla
          hecho={c.promo_enviada_anio === anio}
          texto="Tarjeta de invitación / descuento"
          oscuro={esHoy}
          cargando={marcandoId === c.id + "promo_enviada_anio"}
          onCambiar={() => onMarcar(c, "promo_enviada_anio")}
        />
      </div>
    </article>
  );
}

function Casilla({ hecho, texto, oscuro, cargando, onCambiar }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 text-xs ${cargando ? "opacity-50" : ""}`}>
      <input
        type="checkbox"
        checked={hecho}
        disabled={cargando}
        onChange={onCambiar}
        className="h-4 w-4 shrink-0 cursor-pointer accent-brass"
      />
      <span className={hecho ? (oscuro ? "text-white/60 line-through" : "text-ink-faint line-through") : oscuro ? "text-white" : "text-ink-soft"}>
        {texto}
      </span>
    </label>
  );
}

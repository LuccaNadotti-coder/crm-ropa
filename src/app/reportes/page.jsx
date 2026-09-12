"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { traerTodas } from "@/lib/db";
import { TIENDAS } from "@/lib/peru-ubigeo";
import { MESES, MESES_CORTOS, fechaCorta, telefonoLegible } from "@/lib/formato";
import Marco from "@/components/Marco";
import { useAvisos } from "@/components/Avisos";
import { BarrasHorizontales, BarrasMensuales } from "@/components/Barras";
import {
  TarjetaKpi, Avatar, Insignia, EstadoVacio, FilasEsqueleto,
  IconoMas, IconoUsuarios, IconoExcel,
} from "@/components/ui";

export default function PaginaReportes() {
  return (
    <Marco titulo="Reportes" descripcion="Altas por mes, por tienda y por asesora.">
      {(perfil) => <Contenido perfil={perfil} />}
    </Marco>
  );
}

function Contenido({ perfil }) {
  const avisos = useAvisos();
  const esAdmin = perfil.rol === "admin";

  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mesSel, setMesSel] = useState(null);
  const [filtroTienda, setFiltroTienda] = useState("");
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await traerTodas(() =>
          supabase.from("clientes").select("*").order("created_at", { ascending: false }).order("id")
        );
        setClientes(data);
      } catch (e) {
        avisos.error("No se pudieron cargar los reportes: " + e.message);
      }
      setCargando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** "2026-08" a partir de created_at, en hora local. */
  const claveMes = (c) => {
    if (!c.created_at) return null;
    const f = new Date(c.created_at);
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}`;
  };

  const enAlcance = useMemo(
    () => (filtroTienda ? clientes.filter((c) => c.tienda === filtroTienda) : clientes),
    [clientes, filtroTienda]
  );

  /** Serie de los últimos 12 meses, incluyendo los meses sin altas. */
  const serie = useMemo(() => {
    if (enAlcance.length === 0) return [];
    const conteo = {};
    enAlcance.forEach((c) => {
      const k = claveMes(c);
      if (k) conteo[k] = (conteo[k] || 0) + 1;
    });
    const claves = Object.keys(conteo).sort();
    if (claves.length === 0) return [];

    const [aIni, mIni] = claves[0].split("-").map(Number);
    const hoy = new Date();
    const salida = [];
    let a = aIni, m = mIni;
    while (a < hoy.getFullYear() || (a === hoy.getFullYear() && m <= hoy.getMonth() + 1)) {
      const k = `${a}-${String(m).padStart(2, "0")}`;
      salida.push({
        clave: k,
        etiqueta: MESES_CORTOS[m - 1],
        etiquetaLarga: `${MESES[m - 1]} ${a}`,
        valor: conteo[k] || 0,
      });
      m++;
      if (m > 12) { m = 1; a++; }
    }
    return salida.slice(-12);
  }, [enAlcance]);

  const mesActivo = mesSel || serie[serie.length - 1]?.clave || null;
  const indiceActivo = serie.findIndex((s) => s.clave === mesActivo);
  const datosMes = serie[indiceActivo];
  const datosMesPrevio = indiceActivo > 0 ? serie[indiceActivo - 1] : null;

  const nuevos = useMemo(
    () => enAlcance.filter((c) => claveMes(c) === mesActivo),
    [enAlcance, mesActivo]
  );

  const variacion = useMemo(() => {
    if (!datosMesPrevio || datosMesPrevio.valor === 0) return null;
    return Math.round(((datosMes.valor - datosMesPrevio.valor) / datosMesPrevio.valor) * 100);
  }, [datosMes, datosMesPrevio]);

  const agrupar = (lista, campo, etiquetaVacia = "Sin definir") => {
    const acc = {};
    lista.forEach((c) => {
      const k = c[campo] || etiquetaVacia;
      acc[k] = (acc[k] || 0) + 1;
    });
    return Object.entries(acc)
      .map(([etiqueta, valor]) => ({ etiqueta, valor }))
      .sort((a, b) => b.valor - a.valor);
  };

  const exportarNuevos = async () => {
    if (nuevos.length === 0) return;
    setExportando(true);
    try {
      const XLSX = await import("xlsx");
      const filas = nuevos.map((c) => ({
        Nombre: c.nombre,
        DNI: c.dni_ruc || "",
        Telefono: c.telefono || "",
        "Fecha de alta": c.created_at ? new Date(c.created_at).toLocaleDateString("es-PE") : "",
        Tienda: c.tienda || "",
        Asesora: c.asesora || "",
        Genero: c.genero || "",
        "Tipo cliente": c.tipo_cliente || "",
        Talla: c.talla || "",
        Estilo: c.estilo || "",
        Distrito: c.distrito || "",
      }));
      const hoja = XLSX.utils.json_to_sheet(filas);
      hoja["!cols"] = Object.keys(filas[0]).map((k) => ({ wch: Math.max(12, k.length + 2) }));
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, "Nuevos");
      XLSX.writeFile(libro, `clientes-nuevos-${mesActivo}.xlsx`);
      avisos.exito(`Excel generado con ${filas.length} clientes nuevos.`);
    } catch (e) {
      avisos.error("No se pudo exportar: " + e.message);
    }
    setExportando(false);
  };

  if (cargando) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><div className="esqueleto h-28" /><div className="esqueleto h-28" /><div className="esqueleto h-28" /></div>
        <div className="carta overflow-hidden"><FilasEsqueleto filas={6} columnas={3} /></div>
      </div>
    );
  }

  if (clientes.length === 0) {
    return (
      <div className="carta">
        <EstadoVacio icono={<IconoUsuarios size={34} />} titulo="Todavía no hay datos" texto="Registra clientes para ver reportes." />
      </div>
    );
  }

  const diasDelMes = (() => {
    if (!mesActivo) return 30;
    const [a, m] = mesActivo.split("-").map(Number);
    const hoy = new Date();
    if (a === hoy.getFullYear() && m === hoy.getMonth() + 1) return hoy.getDate();
    return new Date(a, m, 0).getDate();
  })();

  return (
    <div className="space-y-5">
      {esAdmin && (
        <div className="carta flex flex-wrap items-center gap-3 p-4">
          <span className="etiqueta">Tienda</span>
          <select className="input w-auto" value={filtroTienda} onChange={(e) => setFiltroTienda(e.target.value)}>
            <option value="">Todas las tiendas</option>
            {TIENDAS.map((t) => <option key={t}>{t}</option>)}
          </select>
          <span className="text-sm text-ink-mute">
            {enAlcance.length} clientes en total
          </span>
        </div>
      )}

      {/* KPIs del mes seleccionado */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKpi
          etiqueta={`Altas en ${datosMes?.etiquetaLarga || "—"}`}
          valor={datosMes?.valor ?? 0}
          detalle={
            variacion === null
              ? "Sin mes previo para comparar"
              : `${variacion >= 0 ? "▲" : "▼"} ${Math.abs(variacion)}% vs ${datosMesPrevio.etiquetaLarga}`
          }
          icono={<IconoMas size={20} />}
        />
        <TarjetaKpi
          etiqueta="Promedio diario"
          valor={(datosMes ? datosMes.valor / diasDelMes : 0).toFixed(1)}
          detalle={`Sobre ${diasDelMes} días`}
          tono="brass"
        />
        <TarjetaKpi
          etiqueta="Total acumulado"
          valor={enAlcance.length}
          detalle={filtroTienda || "Todas las tiendas"}
          tono="exito"
          icono={<IconoUsuarios />}
        />
        <TarjetaKpi
          etiqueta="Asesoras activas"
          valor={new Set(nuevos.map((c) => c.asesora).filter(Boolean)).size}
          detalle="Registraron altas este mes"
          tono="wine"
        />
      </div>

      {/* Serie mensual */}
      <section className="carta p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold text-ink">Clientes nuevos por mes</h2>
          <p className="text-xs text-ink-mute">Toca un mes para ver su detalle</p>
        </div>
        <p className="mb-5 text-sm text-ink-mute">
          {filtroTienda || "Todas las tiendas"} · últimos {serie.length} meses
        </p>
        <BarrasMensuales datos={serie} seleccionado={mesActivo} onSeleccionar={setMesSel} />
      </section>

      {/* Desgloses del mes */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {esAdmin && !filtroTienda && (
          <Panel titulo="Altas por tienda" subtitulo={datosMes?.etiquetaLarga}>
            <BarrasHorizontales datos={agrupar(nuevos, "tienda", "Sin tienda")} total={nuevos.length} />
          </Panel>
        )}

        <Panel titulo="Altas por asesora" subtitulo={`${datosMes?.etiquetaLarga} · top 10`}>
          <BarrasHorizontales datos={agrupar(nuevos, "asesora", "Sin asesora")} total={nuevos.length} maxItems={10} />
        </Panel>

        <Panel titulo="Género" subtitulo={datosMes?.etiquetaLarga}>
          <BarrasHorizontales datos={agrupar(nuevos, "genero")} total={nuevos.length} />
        </Panel>

        <Panel titulo="Tipo de cliente" subtitulo={datosMes?.etiquetaLarga}>
          <BarrasHorizontales datos={agrupar(nuevos, "tipo_cliente")} total={nuevos.length} />
        </Panel>

        <Panel titulo="Tallas más registradas" subtitulo={`${datosMes?.etiquetaLarga} · top 8`}>
          <BarrasHorizontales datos={agrupar(nuevos, "talla")} total={nuevos.length} maxItems={8} />
        </Panel>

        <Panel titulo="Estilo" subtitulo={datosMes?.etiquetaLarga}>
          <BarrasHorizontales datos={agrupar(nuevos, "estilo")} total={nuevos.length} />
        </Panel>

        <Panel titulo="Distritos" subtitulo={`${datosMes?.etiquetaLarga} · top 8`}>
          <BarrasHorizontales datos={agrupar(nuevos, "distrito", "Sin distrito")} total={nuevos.length} maxItems={8} />
        </Panel>
      </div>

      {/* Lista de nuevos */}
      <section className="carta overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borde px-5 py-4">
          <div>
            <h2 className="font-bold text-ink">Clientes nuevos</h2>
            <p className="text-sm text-ink-mute">{datosMes?.etiquetaLarga} · {nuevos.length} registrados</p>
          </div>
          <button onClick={exportarNuevos} disabled={exportando || nuevos.length === 0} className="btn-excel btn-sm">
            <IconoExcel size={14} />
            {exportando ? "Generando..." : "Excel"}
          </button>
        </div>

        {nuevos.length === 0 ? (
          <EstadoVacio titulo="Sin altas este mes" texto="Elige otro mes en el gráfico de arriba." />
        ) : (
          <ul className="scroll-fino max-h-[420px] divide-y divide-borde/60 overflow-y-auto">
            {nuevos.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar nombre={c.nombre} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{c.nombre}</p>
                  <p className="truncate text-xs text-ink-mute">
                    {telefonoLegible(c.telefono)}
                    {c.asesora ? ` · ${c.asesora}` : ""}
                    {esAdmin && c.tienda ? ` · ${c.tienda.replace(" SFIDA", "")}` : ""}
                  </p>
                </div>
                <Insignia tono="neutro" className="shrink-0">
                  {c.created_at ? fechaCorta(new Date(c.created_at).toISOString()) : "—"}
                </Insignia>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Panel({ titulo, subtitulo, children }) {
  return (
    <section className="carta p-5">
      <h2 className="font-bold text-ink">{titulo}</h2>
      {subtitulo && <p className="mb-4 text-xs text-ink-mute">{subtitulo}</p>}
      {children}
    </section>
  );
}

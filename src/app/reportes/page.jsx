"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { traerTodas } from "@/lib/db";
import { TIENDAS } from "@/lib/peru-ubigeo";
import { MESES, MESES_CORTOS, fechaCortaEnLima, diaEnLima, telefonoEsValido } from "@/lib/formato";
import { enviosEntre, fechaHoyLima, ORIGEN } from "@/lib/envios";
import { veTodasLasTiendas } from "@/lib/permisos";
import { descargarArchivo } from "@/lib/portapapeles";
import { construirDashboardHtml } from "@/lib/dashboard-export";
import Marco from "@/components/Marco";
import { useAvisos } from "@/components/Avisos";
import { BarrasHorizontales, BarrasMensuales } from "@/components/Barras";
import {
  TarjetaKpi, Avatar, Insignia, EstadoVacio, FilasEsqueleto, TelefonoCopiable,
  IconoMas, IconoUsuarios, IconoExcel, IconoDescargar, IconoTorta,
} from "@/components/ui";

export default function PaginaReportes() {
  return (
    <Marco titulo="Reportes" descripcion="Altas por mes, por tienda y por asesora.">
      {(perfil) => <Contenido perfil={perfil} />}
    </Marco>
  );
}

/**
 * Días que faltan para el próximo cumpleaños, ignorando el año de nacimiento.
 * Se parte el texto a mano porque new Date("1990-04-23") se interpreta en UTC
 * y en Perú (UTC-5) daría el día anterior.
 */
function diasHastaCumple(fecha) {
  if (!fecha) return null;
  const [, m, d] = String(fecha).slice(0, 10).split("-").map(Number);
  if (!m || !d) return null;
  const hoy = new Date();
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  let proximo = new Date(hoy.getFullYear(), m - 1, d);
  if (proximo < base) proximo = new Date(hoy.getFullYear() + 1, m - 1, d);
  return Math.round((proximo - base) / 86400000);
}

/* ------------------------------------------------- Rango de fechas */

/** Un Date a "YYYY-MM-DD", que es como se guardan las fechas de envío. */
function comoIso(fecha) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

/** Día de un created_at, en hora de Lima, como "YYYY-MM-DD". */
function diaDe(timestamp) {
  return diaEnLima(timestamp);
}

/**
 * Atajos del selector de fechas. Se calculan al momento de tocarlos, no al
 * cargar la página, para que "hoy" siga siendo hoy si alguien deja el CRM
 * abierto de un día para otro.
 */
const ATAJOS = [
  {
    id: "mes",
    etiqueta: "Este mes",
    calcular: () => {
      const h = new Date();
      return { desde: comoIso(new Date(h.getFullYear(), h.getMonth(), 1)), hasta: comoIso(h) };
    },
  },
  {
    id: "mesPrevio",
    etiqueta: "Mes pasado",
    calcular: () => {
      const h = new Date();
      return {
        desde: comoIso(new Date(h.getFullYear(), h.getMonth() - 1, 1)),
        hasta: comoIso(new Date(h.getFullYear(), h.getMonth(), 0)),
      };
    },
  },
  {
    id: "30dias",
    etiqueta: "Últimos 30 días",
    calcular: () => {
      const h = new Date();
      return { desde: comoIso(new Date(h.getFullYear(), h.getMonth(), h.getDate() - 29)), hasta: comoIso(h) };
    },
  },
  {
    id: "anio",
    etiqueta: "Este año",
    calcular: () => {
      const h = new Date();
      return { desde: comoIso(new Date(h.getFullYear(), 0, 1)), hasta: comoIso(h) };
    },
  },
];

function Contenido({ perfil }) {
  const avisos = useAvisos();
  const verTodo = veTodasLasTiendas(perfil);

  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mesSel, setMesSel] = useState(null);
  const [filtroTienda, setFiltroTienda] = useState("");
  const [exportando, setExportando] = useState(false);
  const [armandoDashboard, setArmandoDashboard] = useState(false);

  // Rango del reporte de cumpleaños y altas. Arranca en el mes en curso.
  const [desde, setDesde] = useState(() => ATAJOS[0].calcular().desde);
  const [hasta, setHasta] = useState(() => fechaHoyLima());
  const [envios, setEnvios] = useState([]);
  const [cargandoEnvios, setCargandoEnvios] = useState(true);
  const [exportandoRango, setExportandoRango] = useState(false);
  const rangoAlReves = desde > hasta;

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

  // Los envíos se piden de nuevo cada vez que cambia el rango, no se filtran
  // en memoria: son una tabla que crece con cada WhatsApp y no tiene sentido
  // traerla completa para mostrar un mes.
  useEffect(() => {
    if (rangoAlReves) return;
    let vigente = true;
    setCargandoEnvios(true);
    (async () => {
      try {
        const filas = await enviosEntre(desde, hasta);
        if (vigente) setEnvios(filas);
      } catch (e) {
        if (vigente) avisos.error("No se pudieron cargar los envíos: " + e.message);
      }
      if (vigente) setCargandoEnvios(false);
    })();
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta, rangoAlReves]);

  /** "2026-08" a partir de created_at, en hora de Lima. */
  const claveMes = (c) => diaDe(c.created_at)?.slice(0, 7) || null;

  const enAlcance = useMemo(
    () => (filtroTienda ? clientes.filter((c) => c.tienda === filtroTienda) : clientes),
    [clientes, filtroTienda]
  );

  /* ---------------------------------------- Reporte del rango de fechas */

  const enviosEnAlcance = useMemo(
    () => (filtroTienda ? envios.filter((e) => e.tienda === filtroTienda) : envios),
    [envios, filtroTienda]
  );

  const [saludos, cupones, cumpleSinDetalle, campanas, catalogos] = useMemo(() => {
    const de = (origen) => enviosEnAlcance.filter((e) => e.origen === origen);
    return [
      de(ORIGEN.CUMPLE_SALUDO),
      de(ORIGEN.CUMPLE_CUPON),
      de(ORIGEN.CUMPLE_ANTIGUO),
      de(ORIGEN.CAMPANA),
      de(ORIGEN.CATALOGO),
    ];
  }, [enviosEnAlcance]);

  const anioActual = new Date().getFullYear();

  /**
   * Cuántos clientes recibieron su saludo / su invitación en el rango.
   *
   * Hay DOS formas de que quede constancia, y el reporte tiene que mirar las
   * dos, porque las tiendas usan las dos:
   *
   *   1. El botón verde, que anota una fila en envios_whatsapp.
   *   2. La casilla de la pantalla de Cumpleaños, tildada a mano. Esta es la
   *      que faltaba: antes el reporte solo miraba la 1, así que se veían diez
   *      casillas tildadas y el reporte decía 1.
   *
   * Se cuenta por cliente, no por fila: quien tocó el botón Y tildó la casilla
   * es una sola persona saludada, no dos. Lo mismo con los reintentos, cuando
   * el chat no abrió y se volvió a tocar el botón sobre la misma clienta: como
   * nadie cumple años dos veces en un rango, esa fila repetida es el mismo
   * saludo. Las campañas, en cambio, sí se cuentan por fila: ahí un cliente
   * puede recibir un mensaje por cada campaña del mes.
   *
   * Las tildes viejas no traen fecha (se guardaba solo el año, ver migración
   * v8), así que no se pueden ubicar dentro de un rango. Esas salen aparte,
   * en "sinFecha", en vez de desaparecer o de inventarles un día.
   */
  const contarCumple = (enviosDelTipo, campoAnio, campoFecha) => {
    const ids = new Set(enviosDelTipo.map((e) => e.cliente_id));
    let sinFecha = 0;

    enAlcance.forEach((c) => {
      if (c[campoAnio] !== anioActual) return;
      const fecha = c[campoFecha] ? String(c[campoFecha]).slice(0, 10) : null;
      if (fecha) {
        if (fecha >= desde && fecha <= hasta) ids.add(c.id);
      } else if (!ids.has(c.id)) {
        sinFecha++;
      }
    });

    return { ids, enRango: ids.size, sinFecha, clics: enviosDelTipo.length };
  };

  const saludoResumen = useMemo(
    () => contarCumple(saludos, "saludo_cumple_anio", "saludo_cumple_fecha"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saludos, enAlcance, desde, hasta, anioActual]
  );
  const cuponResumen = useMemo(
    () => contarCumple(cupones, "promo_enviada_anio", "promo_enviada_fecha"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cupones, enAlcance, desde, hasta, anioActual]
  );

  const saludosPersonas = saludoResumen.enRango;
  const cuponesPersonas = cuponResumen.enRango;
  const marcadosSinFecha = saludoResumen.sinFecha + cuponResumen.sinFecha;

  /** Las fichas de esos clientes, para poder agruparlas por tienda. */
  const fichasDe = (ids) => enAlcance.filter((c) => ids.has(c.id));

  /** "· 3 clics en total" solo cuando el botón se tocó más veces que clientes. */
  const detalleReintentos = ({ enRango, clics }) =>
    clics > enRango ? ` · ${clics} clics en total` : "";

  /** Clientes registrados dentro del rango elegido. */
  const nuevosRango = useMemo(() => {
    if (rangoAlReves) return [];
    return enAlcance.filter((c) => {
      const dia = diaDe(c.created_at);
      return dia && dia >= desde && dia <= hasta;
    });
  }, [enAlcance, desde, hasta, rangoAlReves]);

  /** Nombre y teléfono de cada cliente, para el detalle de los envíos. */
  const porId = useMemo(() => {
    const mapa = {};
    clientes.forEach((c) => { mapa[c.id] = c; });
    return mapa;
  }, [clientes]);

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
        "Fecha de alta": diaDe(c.created_at) || "",
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

  /**
   * Excel del rango elegido: una hoja con los totales, una con cada envío de
   * cumpleaños (fecha, tipo y cliente) y otra con los clientes nuevos.
   */
  const exportarRango = async () => {
    setExportandoRango(true);
    try {
      const XLSX = await import("xlsx");
      const alcance = filtroTienda || "Todas las tiendas";
      const libro = XLSX.utils.book_new();

      const agregar = (nombre, filas) => {
        const hoja = XLSX.utils.json_to_sheet(filas);
        if (filas.length > 0) {
          hoja["!cols"] = Object.keys(filas[0]).map((k) => ({ wch: Math.max(14, k.length + 2) }));
        }
        XLSX.utils.book_append_sheet(libro, hoja, nombre);
      };

      agregar("Resumen", [
        { Dato: "Desde", Valor: desde },
        { Dato: "Hasta", Valor: hasta },
        { Dato: "Alcance", Valor: alcance },
        { Dato: "Clientes saludados por su cumpleaños", Valor: saludosPersonas },
        { Dato: "Clientes invitados con el 15%", Valor: cuponesPersonas },
        ...(marcadosSinFecha > 0
          ? [{ Dato: "Casillas tildadas sin fecha (no entran en el rango)", Valor: marcadosSinFecha }]
          : []),
        ...(cumpleSinDetalle.length > 0
          ? [{ Dato: "Cumpleaños sin detalle (envíos antiguos)", Valor: cumpleSinDetalle.length }]
          : []),
        { Dato: "Mensajes de campaña enviados", Valor: campanas.length },
        ...(catalogos.length > 0 ? [{ Dato: "Catálogos enviados", Valor: catalogos.length }] : []),
        { Dato: "Clientes nuevos", Valor: nuevosRango.length },
        { Dato: "Clics en el botón verde (cumpleaños)", Valor: saludos.length + cupones.length + cumpleSinDetalle.length },
      ]);

      const etiquetaTipo = {
        [ORIGEN.CUMPLE_SALUDO]: "Saludo de cumpleaños",
        [ORIGEN.CUMPLE_CUPON]: "Cupón 15%",
        [ORIGEN.CUMPLE_ANTIGUO]: "Cumpleaños (sin detalle)",
      };
      const detalle = [...saludos, ...cupones, ...cumpleSinDetalle]
        .slice()
        .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
        .map((e) => ({
          Fecha: e.fecha || "",
          Tipo: etiquetaTipo[e.origen] || e.origen,
          Cliente: porId[e.cliente_id]?.nombre || "(cliente eliminado)",
          Telefono: porId[e.cliente_id]?.telefono || "",
          Tienda: e.tienda || "",
          Asesora: porId[e.cliente_id]?.asesora || "",
        }));
      agregar("Cumpleanos", detalle.length > 0 ? detalle : [{ Fecha: "", Tipo: "Sin envíos en el rango" }]);

      const nuevos = nuevosRango.map((c) => ({
        Nombre: c.nombre,
        DNI: c.dni_ruc || "",
        Telefono: c.telefono || "",
        "Fecha de alta": diaDe(c.created_at) || "",
        Tienda: c.tienda || "",
        Asesora: c.asesora || "",
        Genero: c.genero || "",
        Distrito: c.distrito || "",
      }));
      agregar("Clientes nuevos", nuevos.length > 0 ? nuevos : [{ Nombre: "Sin altas en el rango" }]);

      const sufijo = filtroTienda ? `-${filtroTienda.replace(/\s+/g, "-")}` : "";
      XLSX.writeFile(libro, `reporte-cumpleanos-${desde}_a_${hasta}${sufijo}.xlsx`);
      avisos.exito(`Excel generado: ${saludosPersonas + cuponesPersonas} clientes contactados por cumpleaños y ${nuevosRango.length} clientes nuevos.`);
    } catch (e) {
      avisos.error("No se pudo exportar: " + e.message);
    }
    setExportandoRango(false);
  };

  /**
   * Dashboard exportable: un solo archivo .html con los mismos KPIs, gráficos
   * y conteos por tienda que están en pantalla. Se abre en cualquier navegador
   * y con Ctrl+P queda un PDF para mandar por correo o WhatsApp.
   *
   * El avance del catálogo no vive en esta pantalla (la lista de altas no lo
   * necesita), así que se pide al momento de exportar: es una consulta más y
   * evita cargarlo cada vez que alguien entra a Reportes.
   */
  const exportarDashboard = async () => {
    if (!mesActivo) return;
    setArmandoDashboard(true);
    try {
      const [anioSel, mesNum] = mesActivo.split("-").map(Number);
      const envios = await traerTodas(() =>
        supabase.from("envios_catalogo").select("cliente_id, enviado")
          .eq("anio", anioSel).eq("mes", mesNum).eq("enviado", true).order("cliente_id")
      );
      const conCatalogo = new Set(envios.map((e) => e.cliente_id));

      // Conteo por tienda: cartera total, altas del mes y catálogo del mes.
      const acumulado = {};
      enAlcance.forEach((c) => {
        const t = c.tienda || "Sin tienda";
        if (!acumulado[t]) acumulado[t] = { tienda: t, clientes: 0, altas: 0, catalogo: 0 };
        acumulado[t].clientes++;
        if (conCatalogo.has(c.id)) acumulado[t].catalogo++;
      });
      nuevos.forEach((c) => {
        const t = c.tienda || "Sin tienda";
        if (acumulado[t]) acumulado[t].altas++;
      });
      const tiendas = Object.values(acumulado).sort((a, b) => b.clientes - a.clientes);

      const catalogoEnviado = enAlcance.filter((c) => conCatalogo.has(c.id)).length;
      const cumpleSemana = enAlcance.filter((c) => {
        const d = diasHastaCumple(c.fecha_nacimiento);
        return d !== null && d <= 7;
      }).length;
      const telefonosMalos = enAlcance.filter((c) => !telefonoEsValido(c.telefono)).length;
      const alcance = filtroTienda || "Todas las tiendas";

      const html = construirDashboardHtml({
        generado: new Date().toLocaleString("es-PE"),
        alcance,
        mesEtiqueta: datosMes?.etiquetaLarga || mesActivo,
        mesClave: mesActivo,
        kpis: [
          { etiqueta: "Clientes registrados", valor: enAlcance.length, detalle: alcance },
          {
            etiqueta: `Altas en ${datosMes?.etiquetaLarga || "el mes"}`,
            valor: datosMes?.valor ?? 0,
            detalle: variacion === null
              ? "Sin mes previo para comparar"
              : `${variacion >= 0 ? "▲" : "▼"} ${Math.abs(variacion)}% vs ${datosMesPrevio.etiquetaLarga}`,
            tono: "brass",
          },
          {
            etiqueta: "Promedio diario",
            valor: (datosMes ? datosMes.valor / diasDelMes : 0).toFixed(1),
            detalle: `Sobre ${diasDelMes} días`,
          },
          {
            etiqueta: "Asesoras activas",
            valor: new Set(nuevos.map((c) => c.asesora).filter(Boolean)).size,
            detalle: "Registraron altas este mes",
            tono: "wine",
          },
          {
            etiqueta: `Catálogo de ${MESES[mesNum - 1]}`,
            valor: `${catalogoEnviado} / ${enAlcance.length}`,
            detalle: `${enAlcance.length ? Math.round((catalogoEnviado / enAlcance.length) * 100) : 0}% de la cartera`,
            tono: "exito",
          },
          {
            etiqueta: "Cumpleaños esta semana",
            valor: cumpleSemana,
            detalle: "Próximos 7 días",
            tono: "wine",
          },
          {
            etiqueta: "Tiendas con cartera",
            valor: tiendas.length,
            detalle: tiendas.length === 1 ? "Alcance de una sola tienda" : "Con al menos un cliente",
          },
          {
            etiqueta: "Teléfonos no válidos",
            valor: telefonosMalos,
            detalle: telefonosMalos === 0 ? "Todos sirven para WhatsApp" : "No reciben WhatsApp",
            tono: telefonosMalos > 0 ? "wine" : "exito",
          },
        ],
        serie,
        tiendas,
        desgloses: [
          ...(verTodo && !filtroTienda
            ? [{ titulo: "Altas por tienda", subtitulo: datosMes?.etiquetaLarga, datos: agrupar(nuevos, "tienda", "Sin tienda"), total: nuevos.length }]
            : []),
          { titulo: "Altas por asesora", subtitulo: `${datosMes?.etiquetaLarga} · top 10`, datos: agrupar(nuevos, "asesora", "Sin asesora"), total: nuevos.length, maxItems: 10 },
          { titulo: "Género", subtitulo: datosMes?.etiquetaLarga, datos: agrupar(nuevos, "genero"), total: nuevos.length },
          { titulo: "Tipo de cliente", subtitulo: datosMes?.etiquetaLarga, datos: agrupar(nuevos, "tipo_cliente"), total: nuevos.length },
          { titulo: "Tallas más registradas", subtitulo: `${datosMes?.etiquetaLarga} · top 8`, datos: agrupar(nuevos, "talla"), total: nuevos.length, maxItems: 8 },
          { titulo: "Estilo", subtitulo: datosMes?.etiquetaLarga, datos: agrupar(nuevos, "estilo"), total: nuevos.length },
          { titulo: "Distritos", subtitulo: `${datosMes?.etiquetaLarga} · top 8`, datos: agrupar(nuevos, "distrito", "Sin distrito"), total: nuevos.length, maxItems: 8 },
        ],
      });

      const sufijo = filtroTienda ? `-${filtroTienda.replace(/\s+/g, "-")}` : "";
      descargarArchivo(`dashboard-sfida-${mesActivo}${sufijo}.html`, html);
      avisos.exito("Dashboard descargado. Ábrelo con doble clic; el botón de abajo lo guarda en PDF.");
    } catch (e) {
      avisos.error("No se pudo generar el dashboard: " + e.message);
    }
    setArmandoDashboard(false);
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
      <div className="carta flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {verTodo && (
            <select
              className="input w-auto"
              value={filtroTienda}
              onChange={(e) => setFiltroTienda(e.target.value)}
              aria-label="Filtrar por tienda"
            >
              <option value="">Todas las tiendas</option>
              {TIENDAS.map((t) => <option key={t}>{t}</option>)}
            </select>
          )}
          <p className="text-sm text-ink-mute">
            <strong className="tabular-nums text-ink">{enAlcance.length}</strong> clientes
            {filtroTienda ? ` en ${filtroTienda}` : " en total"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <p className="hidden text-right text-[11px] leading-tight text-ink-faint sm:block">
            Todos los gráficos de esta página<br />en un archivo que se imprime en PDF
          </p>
          <button
            onClick={exportarDashboard}
            disabled={armandoDashboard || !mesActivo}
            className="btn-primario shrink-0"
          >
            <IconoDescargar size={16} />
            {armandoDashboard ? "Armando..." : "Exportar dashboard"}
          </button>
        </div>
      </div>

      {/* Cumpleaños y altas entre dos fechas */}
      <section className="carta p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-bold text-ink">Cumpleaños y altas por fecha</h2>
            <p className="text-sm text-ink-mute">
              Elige el periodo que quieras medir · {filtroTienda || "todas las tiendas"}
            </p>
          </div>
          <button
            onClick={exportarRango}
            disabled={exportandoRango || rangoAlReves || cargandoEnvios}
            className="btn-excel shrink-0"
          >
            <IconoExcel size={16} />
            {exportandoRango ? "Generando..." : "Exportar"}
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-ink-mute">
            Desde
            <input
              type="date"
              className="input mt-1 w-auto"
              value={desde}
              max={hasta}
              onChange={(e) => setDesde(e.target.value)}
            />
          </label>
          <label className="text-xs font-semibold text-ink-mute">
            Hasta
            <input
              type="date"
              className="input mt-1 w-auto"
              value={hasta}
              min={desde}
              onChange={(e) => setHasta(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {ATAJOS.map((a) => (
              <button
                key={a.id}
                onClick={() => { const r = a.calcular(); setDesde(r.desde); setHasta(r.hasta); }}
                className="rounded-lg border border-borde px-3 py-1.5 text-[13px] font-semibold text-ink-mute hover:bg-cream"
              >
                {a.etiqueta}
              </button>
            ))}
          </div>
        </div>

        {rangoAlReves ? (
          <p className="rounded-lg bg-alerta-soft px-3 py-2.5 text-sm text-alerta">
            La fecha de inicio es posterior a la de fin. Corrige el rango para ver los números.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <TarjetaKpi
                etiqueta="Saludos de cumpleaños"
                valor={saludosPersonas}
                detalle={`Clientes saludados el mismo día${detalleReintentos(saludoResumen)}`}
                tono="wine"
                icono={<IconoTorta size={20} />}
                cargando={cargandoEnvios}
              />
              <TarjetaKpi
                etiqueta="Invitaciones con 15%"
                valor={cuponesPersonas}
                detalle={`Clientes invitados los días previos${detalleReintentos(cuponResumen)}`}
                tono="brass"
                cargando={cargandoEnvios}
              />
              <TarjetaKpi
                etiqueta="Clientes nuevos"
                valor={nuevosRango.length}
                detalle={filtroTienda || "Todas las tiendas"}
                tono="exito"
                icono={<IconoMas size={20} />}
              />
              <TarjetaKpi
                etiqueta="Mensajes de campaña"
                valor={campanas.length}
                detalle="Enviados en el mismo periodo"
                cargando={cargandoEnvios}
              />
            </div>

            <p className="mt-3 text-xs text-ink-faint">
              Cuentan tanto los WhatsApp abiertos con el botón verde como las casillas tildadas a
              mano en Cumpleaños. Si de un cliente hay las dos cosas, se cuenta una sola vez.
              {catalogos.length > 0 && ` Además se enviaron ${catalogos.length} catálogos en el mismo periodo.`}
            </p>

            {marcadosSinFecha > 0 && (
              <p className="mt-2 rounded-lg bg-brass-soft px-3 py-2.5 text-xs text-ink-soft">
                Hay <strong>{marcadosSinFecha}</strong> casillas tildadas este año que no guardaron
                el día en que se marcaron, así que no se pueden ubicar dentro de un rango y no
                entran en los números de arriba. Son de antes de esta versión del CRM: el dato del
                día nunca se llegó a guardar y no se puede recuperar. Las que se tilden de ahora en
                adelante sí quedan con fecha y cuentan normal.
              </p>
            )}

            {cumpleSinDetalle.length > 0 && (
              <p className="mt-2 text-xs text-ink-faint">
                Hay {cumpleSinDetalle.length} envíos de cumpleaños anteriores a esta versión del CRM,
                que no guardaban si fueron saludo o cupón. Salen aparte en el Excel.
              </p>
            )}

            {verTodo && !filtroTienda && (
              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Panel titulo="Saludos por tienda" subtitulo={`${desde} a ${hasta}`}>
                  <BarrasHorizontales datos={agrupar(fichasDe(saludoResumen.ids), "tienda", "Sin tienda")} total={saludosPersonas} />
                </Panel>
                <Panel titulo="Invitaciones por tienda" subtitulo={`${desde} a ${hasta}`}>
                  <BarrasHorizontales datos={agrupar(fichasDe(cuponResumen.ids), "tienda", "Sin tienda")} total={cuponesPersonas} />
                </Panel>
                <Panel titulo="Clientes nuevos por tienda" subtitulo={`${desde} a ${hasta}`}>
                  <BarrasHorizontales datos={agrupar(nuevosRango, "tienda", "Sin tienda")} total={nuevosRango.length} />
                </Panel>
              </div>
            )}
          </>
        )}
      </section>

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
        {verTodo && !filtroTienda && (
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
                  <p className="flex items-center gap-1.5 text-xs text-ink-mute">
                    <TelefonoCopiable telefono={c.telefono} soloIcono />
                    <span className="truncate">
                      {c.asesora ? `· ${c.asesora}` : ""}
                      {verTodo && c.tienda ? ` · ${c.tienda.replace(" SFIDA", "")}` : ""}
                    </span>
                  </p>
                </div>
                <Insignia tono="neutro" className="shrink-0">
                  {fechaCortaEnLima(c.created_at)}
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

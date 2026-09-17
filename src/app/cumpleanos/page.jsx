"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { traerTodas } from "@/lib/db";
import { registrarEnvio } from "@/lib/envios";
import { TIENDAS } from "@/lib/peru-ubigeo";
import {
  paraBuscar, diaYMes, edadDesde, enlaceWhatsApp, telefonoEsValido, nombrePila,
} from "@/lib/formato";
import { veTodasLasTiendas, puedeEditar, puedeEnviarWhatsApp } from "@/lib/permisos";
import { copiarImagenAlPortapapeles, descargarBlob } from "@/lib/portapapeles";
import {
  hayTarjeta, generarTarjeta, primerNombre, nombreArchivoTarjeta,
} from "@/lib/tarjeta-cumple";
import { BotonWhatsApp } from "@/components/ModoWhatsApp";
import Marco from "@/components/Marco";
import { useAvisos } from "@/components/Avisos";
import {
  Avatar, Insignia, TarjetaKpi, EstadoVacio, FilasEsqueleto, TelefonoCopiable, BotonCopiar,
  Modal, IconoTorta, IconoWhatsApp, IconoBuscar, IconoX, IconoDescargar, IconoCopiar,
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
  const verTodo = veTodasLasTiendas(perfil);
  const puedeMarcar = puedeEditar(perfil);
  const mandarWhatsApp = puedeEnviarWhatsApp(perfil);

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
    if (!puedeMarcar) return;
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
            {verTodo && (
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
              verTodo={verTodo}
              puedeMarcar={puedeMarcar}
              mandarWhatsApp={mandarWhatsApp}
              marcandoId={marcandoId}
              onMarcar={marcarTarea}
            />
          ))}
        </div>
      )}
    </>
  );
}

function TarjetaCumple({ cliente: c, anio, verTodo, puedeMarcar, mandarWhatsApp, marcandoId, onMarcar }) {
  const avisos = useAvisos();
  const esHoy = c.dias_faltantes === 0;
  const edad = edadDesde(c.fecha_nacimiento);
  const cumpleAnios = edad != null ? edad + (esHoy ? 0 : 1) : null;

  // En el mensaje va el nombre de pila, no el completo en mayúsculas: queda
  // igual que en la tarjeta y se lee como un saludo, no como un grito.
  const pila = nombrePila(c.nombre);
  const texto = esHoy
    ? `Hola ${pila}, buenos días.

Desde SFIDA queremos enviarle un saludo muy especial por su cumpleaños 🎉
Gracias por formar parte de nuestra familia y por confiar siempre en nosotros.
¡Que este nuevo año de vida esté lleno de alegría y éxitos! ✨`
    : `Hola ${pila}, buenos días.

En Sfida estamos celebrando por adelantado su cumpleaños 🎉 y queremos regalarle un 15% de promoción como agradecimiento por ser nuestra clienta.
¡Esperamos que lo disfrute y tenga un excelente día!`;

  /* ------------------------------------------------------------ Tarjeta */

  const [tarjetaDisponible, setTarjetaDisponible] = useState(false);
  const [vistaAbierta, setVistaAbierta] = useState(false);
  const [vistaUrl, setVistaUrl] = useState(null);
  const blobRef = useRef(null);

  useEffect(() => { hayTarjeta().then(setTarjetaDisponible); }, []);
  useEffect(() => () => { if (vistaUrl) URL.revokeObjectURL(vistaUrl); }, [vistaUrl]);

  /**
   * Deja la tarjeta copiada justo antes de abrir el chat. WhatsApp no admite
   * imágenes en el enlace, así que este es el único camino: copiar acá y que
   * la persona pegue con Ctrl+V.
   */
  const copiarTarjeta = async () => {
    if (!tarjetaDisponible) return;
    const blob = await generarTarjeta(c.nombre, c.dias_faltantes);
    if (!blob) return;
    blobRef.current = blob;
    if (await copiarImagenAlPortapapeles(blob)) {
      avisos.exito(`Tarjeta de ${primerNombre(c.nombre)} copiada. Pégala en el chat con Ctrl+V.`);
    } else {
      avisos.error("No se pudo copiar la tarjeta. Ábrela con “Ver tarjeta” y descárgala.");
    }
  };

  const abrirVista = async () => {
    const blob = blobRef.current || (await generarTarjeta(c.nombre, c.dias_faltantes));
    if (!blob) return;
    blobRef.current = blob;
    setVistaUrl((previo) => { if (previo) URL.revokeObjectURL(previo); return URL.createObjectURL(blob); });
    setVistaAbierta(true);
  };

  return (
    <article className={`carta flex flex-col p-5 ${esHoy ? "border-wine/30 bg-wine text-white" : ""}`}>
      <div className="flex items-start gap-3">
        <Avatar nombre={c.nombre} />
        <div className="min-w-0 flex-1">
          <h3 className={`truncate font-semibold leading-tight ${esHoy ? "text-white" : "text-ink"}`}>{c.nombre}</h3>
          <p className={`mt-0.5 truncate text-xs ${esHoy ? "text-white/75" : "text-ink-mute"}`}>
            {c.asesora || "Sin asesora"} · {c.distrito || "—"}
            {verTodo && c.tienda ? ` · ${c.tienda.replace(" SFIDA", "")}` : ""}
          </p>
          <p className={`flex items-center gap-1.5 text-xs ${esHoy ? "text-white/75" : "text-ink-mute"}`}>
            <TelefonoCopiable telefono={c.telefono} soloIcono />
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
        mandarWhatsApp ? (
          <BotonWhatsApp
            telefono={c.telefono}
            texto={texto}
            etiqueta={tarjetaDisponible ? "Copiar tarjeta y escribir" : "Enviar saludo"}
            className={`mt-4 ${esHoy ? "btn bg-white text-wine hover:bg-cream" : "btn-excel"}`}
            alEnviar={() => registrarEnvio(c, "cumpleanos")}
            preparar={tarjetaDisponible ? copiarTarjeta : undefined}
          />
        ) : (
          <BotonCopiar
            variante="boton"
            texto={texto}
            etiqueta="Copiar el saludo"
            etiquetaCopiada="Saludo copiado"
            className="mt-4 w-full"
          />
        )
      ) : (
        <p className={`mt-4 rounded-lg px-3 py-2.5 text-center text-xs ${esHoy ? "bg-white/15 text-white" : "bg-alerta-soft text-alerta"}`}>
          Teléfono inválido · no se puede enviar
        </p>
      )}

      {tarjetaDisponible && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            onClick={abrirVista}
            className={`text-[11px] font-semibold underline-offset-2 hover:underline ${
              esHoy ? "text-white/80" : "text-ink-mute"
            }`}
          >
            Ver tarjeta de {primerNombre(c.nombre)}
          </button>
          <span className={`text-[11px] ${esHoy ? "text-white/60" : "text-ink-faint"}`}>
            luego Ctrl+V en el chat
          </span>
        </div>
      )}

      <Modal
        abierto={vistaAbierta}
        onCerrar={() => setVistaAbierta(false)}
        titulo={`Tarjeta de ${primerNombre(c.nombre)}`}
        descripcion="Así le va a llegar. Cópiala y pégala en el chat con Ctrl+V."
        ancho="max-w-sm"
      >
        {vistaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vistaUrl}
            alt={`Tarjeta de cumpleaños de ${primerNombre(c.nombre)}`}
            className="mx-auto w-full max-w-[300px] rounded-lg border border-borde"
          />
        )}
        <div className="mt-5 flex gap-2">
          <button
            onClick={async () => {
              if (await copiarImagenAlPortapapeles(blobRef.current)) {
                avisos.exito("Tarjeta copiada. Pégala con Ctrl+V.");
                setVistaAbierta(false);
              } else {
                avisos.error("Este navegador no dejó copiar la imagen. Descárgala y arrástrala al chat.");
              }
            }}
            className="btn-primario flex-1"
          >
            <IconoCopiar size={16} />
            Copiar tarjeta
          </button>
          <button
            onClick={() => blobRef.current && descargarBlob(nombreArchivoTarjeta(c.nombre), blobRef.current)}
            className="btn-contorno"
          >
            <IconoDescargar size={16} />
            Descargar
          </button>
        </div>
      </Modal>

      <div className={`mt-4 space-y-2 border-t pt-3 ${esHoy ? "border-white/20" : "border-borde"}`}>
        <Casilla
          hecho={c.saludo_cumple_anio === anio}
          texto="Carta de cumpleaños enviada"
          oscuro={esHoy}
          cargando={marcandoId === c.id + "saludo_cumple_anio"}
          bloqueada={!puedeMarcar}
          onCambiar={() => onMarcar(c, "saludo_cumple_anio")}
        />
        <Casilla
          hecho={c.promo_enviada_anio === anio}
          texto="Tarjeta de invitación / descuento"
          oscuro={esHoy}
          cargando={marcandoId === c.id + "promo_enviada_anio"}
          bloqueada={!puedeMarcar}
          onCambiar={() => onMarcar(c, "promo_enviada_anio")}
        />
      </div>
    </article>
  );
}

function Casilla({ hecho, texto, oscuro, cargando, bloqueada, onCambiar }) {
  return (
    <label
      className={`flex items-center gap-2 text-xs ${cargando ? "opacity-50" : ""} ${
        bloqueada ? "cursor-default" : "cursor-pointer"
      }`}
      title={bloqueada ? "Cuenta de solo lectura" : undefined}
    >
      <input
        type="checkbox"
        checked={hecho}
        disabled={cargando || bloqueada}
        onChange={onCambiar}
        className="h-4 w-4 shrink-0 cursor-pointer accent-brass disabled:cursor-not-allowed"
      />
      <span className={hecho ? (oscuro ? "text-white/60 line-through" : "text-ink-faint line-through") : oscuro ? "text-white" : "text-ink-soft"}>
        {texto}
      </span>
    </label>
  );
}

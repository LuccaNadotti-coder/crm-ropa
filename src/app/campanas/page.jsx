"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { traerTodas } from "@/lib/db";
import { TIENDAS } from "@/lib/peru-ubigeo";
import {
  MESES, paraBuscar, telefonoLegible, enlaceWhatsApp, diaYMes, telefonoEsValido,
  nombreDeTrato,
} from "@/lib/formato";
import {
  TOPE_DIARIO, enviosDeHoyPorTienda, registrarEnvio, restantesHoy,
} from "@/lib/envios";
import { veTodasLasTiendas, puedeEnviarWhatsApp, esAdmin } from "@/lib/permisos";
import {
  adjuntoActual, subirAdjunto, quitarAdjunto, enlaceCorto, pesoLegible, TIPOS_ACEPTADOS,
} from "@/lib/adjunto-campana";
import { abrirWhatsApp, useModoWhatsApp, MODO_COPIAR, MODO_APP } from "@/lib/whatsapp";
import { SelectorModoWhatsApp } from "@/components/ModoWhatsApp";
import Marco from "@/components/Marco";
import { useAvisos } from "@/components/Avisos";
import {
  Avatar, Insignia, Campo, Progreso, EstadoVacio, FilasEsqueleto, Modal,
  BotonCopiar, TelefonoCopiable,
  IconoWhatsApp, IconoUsuarios, IconoCheck, IconoFlecha, IconoAlerta, IconoOjo,
} from "@/components/ui";

const TALLAS = ["XS", "S", "M", "L", "XL", "2XL", "26", "28", "30", "32", "34"];
const GENEROS = ["Caballero", "Dama", "Ambos"];
const TIPOS = ["Minorista", "Mayorista"];
const ESTILOS = ["Clásico", "Casual", "Elegante", "Ejecutivo", "Romántico"];

const CLAVE_GUARDADO = "sfida-campana-en-curso";

const PLANTILLAS = [
  {
    id: "catalogo",
    nombre: "Catálogo del mes",
    texto: "Hola {nombre}, te compartimos nuestro nuevo catálogo con las últimas novedades y promociones. ¡Esperamos que te encante! 🛍️",
  },
  {
    id: "promocion",
    nombre: "Promoción / descuento",
    texto: "Hola {nombre}, tenemos una promoción especial pensada para ti en {tienda}. Pásate esta semana y aprovéchala. ✨",
  },
  {
    id: "novedades",
    nombre: "Nueva colección",
    texto: "Hola {nombre}, ya llegó la nueva colección a {tienda}. Aparta la tuya antes de que se agote. 👗",
  },
  {
    id: "reactivacion",
    nombre: "Te extrañamos",
    texto: "Hola {nombre}, hace tiempo que no te vemos por {tienda}. Tenemos novedades que te van a gustar. ¿Te comparto el catálogo? 💛",
  },
  { id: "personalizado", nombre: "Mensaje personalizado", texto: "" },
];

export default function PaginaCampanas() {
  return (
    <Marco
      titulo="Campañas"
      descripcion="Arma una lista y envía por WhatsApp uno por uno sin perder el hilo."
    >
      {(perfil) =>
        // El supervisor no ve esta sección en el menú, pero podría llegar por
        // la URL guardada: enviar registra en la base y él es de solo lectura.
        puedeEnviarWhatsApp(perfil)
          ? <Contenido perfil={perfil} />
          : <SinPermiso />
      }
    </Marco>
  );
}

function SinPermiso() {
  return (
    <div className="carta">
      <EstadoVacio
        icono={<IconoOjo size={32} />}
        titulo="Sección de solo escritura"
        texto="Tu cuenta es de observación: puede ver y exportar todo, pero no enviar campañas. Los resultados de los envíos sí los ves en Reportes y Catálogos."
      />
    </div>
  );
}

function Contenido({ perfil }) {
  const avisos = useAvisos();
  const verTodo = veTodasLasTiendas(perfil);
  const modo = useModoWhatsApp();
  const soloCopiar = modo === MODO_COPIAR;

  const [clientes, setClientes] = useState([]);
  const [enviosMes, setEnviosMes] = useState({});
  const [cargando, setCargando] = useState(true);

  const [f, setF] = useState({
    tienda: "", talla: "", tipo: "", genero: "", estilo: "", catalogo: "", busqueda: "",
  });
  const [plantillaId, setPlantillaId] = useState("catalogo");
  const [mensaje, setMensaje] = useState(PLANTILLAS[0].texto);
  const [marcarCatalogo, setMarcarCatalogo] = useState(true);

  // Archivo de la campaña: uno solo para todas las tiendas.
  const [adjunto, setAdjunto] = useState(null);
  const [adjuntarEnlace, setAdjuntarEnlace] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const archivoRef = useRef(null);
  const puedeCambiarAdjunto = esAdmin(perfil);

  const [enCurso, setEnCurso] = useState(false);
  const [indice, setIndice] = useState(0);
  const [contactados, setContactados] = useState([]);
  const [cola, setCola] = useState([]);
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [restauracion, setRestauracion] = useState(null);
  const [enviadosHoy, setEnviadosHoy] = useState({});

  const anio = new Date().getFullYear();
  const mes = new Date().getMonth() + 1;

  /* -------------------------------------------------------------- Carga */

  useEffect(() => {
    (async () => {
      try {
        const [lista, envios, deHoy] = await Promise.all([
          traerTodas(() => supabase.from("clientes").select("*").order("nombre").order("id")),
          traerTodas(() =>
            supabase.from("envios_catalogo").select("cliente_id, enviado")
              .eq("anio", anio).eq("mes", mes).order("cliente_id")
          ),
          enviosDeHoyPorTienda(),
        ]);
        setClientes(lista);
        const mapa = {};
        envios.forEach((e) => { mapa[e.cliente_id] = e.enviado; });
        setEnviosMes(mapa);
        setEnviadosHoy(deHoy);
      } catch (e) {
        avisos.error("No se pudieron cargar los clientes: " + e.message);
      }
      setCargando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El adjunto se pide aparte: es una sola consulta al almacenamiento y no
  // tiene por qué demorar la lista de clientes.
  useEffect(() => { adjuntoActual().then(setAdjunto); }, []);

  const elegirArchivo = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setSubiendo(true);
    try {
      const nuevo = await subirAdjunto(archivo);
      setAdjunto(nuevo);
      setAdjuntarEnlace(true);
      avisos.exito("Archivo subido. Todas las tiendas van a mandar este mismo.");
    } catch (err) {
      avisos.error(
        err.message?.includes("Bucket not found")
          ? "Falta preparar el almacenamiento en Supabase (migración v6)."
          : "No se pudo subir el archivo: " + err.message
      );
    }
    setSubiendo(false);
  };

  const sacarArchivo = async () => {
    setSubiendo(true);
    try {
      await quitarAdjunto();
      setAdjunto(null);
      avisos.exito("La campaña queda sin archivo.");
    } catch (err) {
      avisos.error("No se pudo quitar el archivo: " + err.message);
    }
    setSubiendo(false);
  };

  // Si el navegador se cerró a mitad de una campaña, se puede retomar.
  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE_GUARDADO) || "null");
      if (guardado?.cola?.length && guardado.indice < guardado.cola.length) {
        setRestauracion(guardado);
      }
    } catch {
      localStorage.removeItem(CLAVE_GUARDADO);
    }
  }, []);

  const guardarProgreso = (datos) => {
    try { localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(datos)); } catch {}
  };
  const limpiarProgreso = () => {
    try { localStorage.removeItem(CLAVE_GUARDADO); } catch {}
  };

  /* ---------------------------------------------------------- Selección */

  const destinatarios = useMemo(() => {
    const q = paraBuscar(f.busqueda);
    return clientes.filter((c) => {
      // Sin un celular válido el enlace de WhatsApp no abre nada: mejor dejarlos
      // fuera que hacerte perder tiempo en la cola de envío.
      if (!telefonoEsValido(c.telefono)) return false;
      if (f.tienda && c.tienda !== f.tienda) return false;
      if (f.talla && c.talla !== f.talla) return false;
      if (f.tipo && c.tipo_cliente !== f.tipo) return false;
      if (f.genero && c.genero !== f.genero) return false;
      if (f.estilo && c.estilo !== f.estilo) return false;
      if (f.catalogo === "pendientes" && enviosMes[c.id]) return false;
      if (f.catalogo === "enviados" && !enviosMes[c.id]) return false;
      if (q && !paraBuscar([c.nombre, c.telefono, c.distrito].join(" ")).includes(q)) return false;
      return true;
    });
  }, [clientes, f, enviosMes]);

  const telefonoInvalido = clientes.filter((c) => !telefonoEsValido(c.telefono));

  /** Cuántos destinatarios pone cada tienda y cuánto cupo le queda hoy. */
  const tiendasEnLista = useMemo(() => {
    const porTienda = {};
    destinatarios.forEach((c) => {
      const t = c.tienda || "Sin tienda";
      porTienda[t] = (porTienda[t] || 0) + 1;
    });
    return Object.entries(porTienda)
      .map(([tienda, enLista]) => ({
        tienda,
        enLista,
        usados: enviadosHoy[tienda] || 0,
        quedan: restantesHoy(enviadosHoy, tienda),
      }))
      .sort((a, b) => b.enLista - a.enLista);
  }, [destinatarios, enviadosHoy]);

  // Lo máximo que se puede mandar hoy: nadie puede pasar del tope de su tienda.
  const cupoTotal = tiendasEnLista.reduce(
    (suma, t) => suma + Math.min(t.enLista, t.quedan), 0
  );

  const armarMensaje = (c) => {
    // {nombre} es el nombre de pila, igual que en los saludos de cumpleaños:
    // "Hola ABANTO ALVA INGRID JENNIFER" se lee como un formulario, no como un
    // mensaje de la tienda.
    const base = (mensaje || "")
      .replaceAll("{nombre}", nombreDeTrato(c) || c.nombre || "")
      .replaceAll("{tienda}", (c.tienda || "SFIDA").replace(" SFIDA", ""))
      .replaceAll("{cumple}", diaYMes(c.fecha_nacimiento));
    if (!adjunto || !adjuntarEnlace) return base;
    return `${base}\n\n${adjunto.esPdf ? "Descárgalo aquí" : "Míralo aquí"}: ${enlaceCorto()}`;
  };

  const cambiarPlantilla = (id) => {
    setPlantillaId(id);
    const p = PLANTILLAS.find((x) => x.id === id);
    if (p && p.id !== "personalizado") setMensaje(p.texto);
  };

  /* ------------------------------------------------------------- Envío */

  const iniciar = () => {
    if (destinatarios.length === 0) return;
    if (!mensaje.trim()) {
      avisos.error("Escribe el mensaje antes de iniciar.");
      return;
    }
    const nueva = destinatarios.map((c) => c.id);
    setCola(nueva);
    setIndice(0);
    setContactados([]);
    setEnCurso(true);
    guardarProgreso({ cola: nueva, indice: 0, contactados: [], mensaje, marcarCatalogo, anio, mes });
  };

  const retomar = () => {
    // Una campaña guardada puede ser de hace días: si algún cliente se eliminó
    // desde entonces, su id ya no existe y la cola se quedaría trabada en él.
    const vigentes = new Set(clientes.map((c) => c.id));
    const yaContactados = (restauracion.contactados || []).filter((id) => vigentes.has(id));
    const colaLimpia = restauracion.cola.filter((id) => vigentes.has(id));
    const pendientes = restauracion.cola.slice(restauracion.indice);
    const saltoHasta = colaLimpia.findIndex((id) => pendientes.includes(id));

    setCola(colaLimpia);
    setIndice(saltoHasta === -1 ? colaLimpia.length : saltoHasta);
    setContactados(yaContactados);
    setMensaje(restauracion.mensaje || mensaje);
    setMarcarCatalogo(!!restauracion.marcarCatalogo);
    setEnCurso(true);
    setRestauracion(null);
  };

  const descartarRestauracion = () => {
    limpiarProgreso();
    setRestauracion(null);
  };

  const porId = useMemo(() => Object.fromEntries(clientes.map((c) => [c.id, c])), [clientes]);
  const actual = enCurso && indice < cola.length ? porId[cola[indice]] : null;

  const avanzar = (nuevosContactados) => {
    const siguiente = indice + 1;
    setIndice(siguiente);
    guardarProgreso({ cola, indice: siguiente, contactados: nuevosContactados, mensaje, marcarCatalogo, anio, mes });
    if (siguiente >= cola.length) {
      setEnCurso(false);
      setResumenAbierto(true);
      limpiarProgreso();
    }
  };

  /**
   * Da por contactado al cliente actual y pasa al siguiente.
   *
   * En los modos "app" y "web" además abre la conversación; en modo copiar no
   * abre nada, porque el usuario ya pegó el mensaje a mano y este botón es solo
   * la confirmación de que lo mandó.
   */
  const enviar = async () => {
    if (!actual) return;
    if (!telefonoEsValido(actual.telefono)) {
      avisos.error(`${actual.nombre} no tiene un teléfono válido.`);
      avanzar(contactados);
      return;
    }

    // Se abre primero: window.open solo funciona dentro del clic del usuario.
    if (!soloCopiar) abrirWhatsApp(actual.telefono, armarMensaje(actual), modo);

    const nuevos = [...contactados, actual.id];
    setContactados(nuevos);

    // El conteo sube de inmediato en pantalla; el registro va en paralelo.
    const tiendaActual = actual.tienda || "Sin tienda";
    setEnviadosHoy((prev) => ({ ...prev, [tiendaActual]: (prev[tiendaActual] || 0) + 1 }));
    registrarEnvio(actual, "campana").then((ok) => {
      if (!ok) avisos.error("El envío se hizo, pero no se pudo registrar en el conteo del día.");
    });

    if (marcarCatalogo && !enviosMes[actual.id]) {
      const { error } = await supabase.from("envios_catalogo").upsert(
        { cliente_id: actual.id, anio, mes, enviado: true, fecha_marcado: new Date().toISOString() },
        { onConflict: "cliente_id,anio,mes" }
      );
      if (error) avisos.error(`No se pudo marcar el catálogo de ${actual.nombre}: ${error.message}`);
      else setEnviosMes((prev) => ({ ...prev, [actual.id]: true }));
    }

    avanzar(nuevos);
  };

  const saltar = () => avanzar(contactados);

  const terminar = () => {
    setEnCurso(false);
    setResumenAbierto(true);
    limpiarProgreso();
  };

  /* -------------------------------------------------------------- Vista */

  if (cargando) {
    return <div className="carta overflow-hidden"><FilasEsqueleto filas={6} columnas={3} /></div>;
  }

  if (enCurso && actual) {
    const tiendaActual = actual.tienda || "Sin tienda";
    return (
      <ModoEnvio
        cliente={actual}
        mensaje={armarMensaje(actual)}
        indice={indice}
        total={cola.length}
        contactados={contactados.length}
        marcarCatalogo={marcarCatalogo}
        mesNombre={MESES[mes - 1]}
        usadosHoy={enviadosHoy[tiendaActual] || 0}
        restantes={restantesHoy(enviadosHoy, tiendaActual)}
        tienda={tiendaActual}
        modo={modo}
        onEnviar={enviar}
        onSaltar={saltar}
        onTerminar={terminar}
      />
    );
  }

  return (
    <>
      {restauracion && (
        <div className="carta mb-5 flex flex-wrap items-center justify-between gap-4 border-brass bg-brass-soft/50 p-4">
          <div>
            <p className="font-semibold text-ink">Tienes una campaña sin terminar</p>
            <p className="text-sm text-ink-mute">
              Ibas en el {restauracion.indice} de {restauracion.cola.length} destinatarios.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={descartarRestauracion} className="btn-contorno btn-sm">Descartar</button>
            <button onClick={retomar} className="btn-laton btn-sm">Retomar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Configuración */}
        <div className="space-y-5 lg:col-span-3">
          <section className="carta p-5">
            <h2 className="font-bold text-ink">1. ¿A quiénes?</h2>
            <p className="mb-4 text-sm text-ink-mute">Combina los filtros para armar la lista.</p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {verTodo && (
                <Campo label="Tienda">
                  <select className="input" value={f.tienda} onChange={(e) => setF({ ...f, tienda: e.target.value })}>
                    <option value="">Todas</option>
                    {TIENDAS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Campo>
              )}
              <Campo label={`Catálogo de ${MESES[mes - 1]}`}>
                <select className="input" value={f.catalogo} onChange={(e) => setF({ ...f, catalogo: e.target.value })}>
                  <option value="">Todos</option>
                  <option value="pendientes">Solo pendientes</option>
                  <option value="enviados">Solo ya enviados</option>
                </select>
              </Campo>
              <Campo label="Talla">
                <select className="input" value={f.talla} onChange={(e) => setF({ ...f, talla: e.target.value })}>
                  <option value="">Todas</option>
                  {TALLAS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Campo>
              <Campo label="Tipo">
                <select className="input" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
                  <option value="">Todos</option>
                  {TIPOS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Campo>
              <Campo label="Género">
                <select className="input" value={f.genero} onChange={(e) => setF({ ...f, genero: e.target.value })}>
                  <option value="">Todos</option>
                  {GENEROS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Campo>
              <Campo label="Estilo">
                <select className="input" value={f.estilo} onChange={(e) => setF({ ...f, estilo: e.target.value })}>
                  <option value="">Todos</option>
                  {ESTILOS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Campo>
              <Campo label="Buscar" full>
                <input className="input" placeholder="Nombre, teléfono o distrito..." value={f.busqueda}
                  onChange={(e) => setF({ ...f, busqueda: e.target.value })} />
              </Campo>
            </div>
          </section>

          <section className="carta p-5">
            <h2 className="font-bold text-ink">2. ¿Qué les mando?</h2>
            <p className="mb-4 text-sm text-ink-mute">
              Usa <code className="rounded bg-cream px-1 text-xs">{"{nombre}"}</code>,{" "}
              <code className="rounded bg-cream px-1 text-xs">{"{tienda}"}</code> o{" "}
              <code className="rounded bg-cream px-1 text-xs">{"{cumple}"}</code> y se reemplazan solos.
            </p>

            <div className="mb-4 flex flex-wrap gap-2">
              {PLANTILLAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => cambiarPlantilla(p.id)}
                  aria-pressed={plantillaId === p.id}
                  className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                    plantillaId === p.id ? "bg-ink text-white" : "border border-borde bg-white text-ink-mute hover:bg-cream"
                  }`}
                >
                  {p.nombre}
                </button>
              ))}
            </div>

            <textarea
              className="input min-h-[110px] resize-y"
              value={mensaje}
              onChange={(e) => { setMensaje(e.target.value); setPlantillaId("personalizado"); }}
              placeholder="Escribe tu mensaje..."
              maxLength={900}
            />
            <p className="mt-1 text-right text-xs text-ink-faint">{mensaje.length}/900</p>

            {destinatarios[0] && mensaje && (
              <div className="mt-4">
                <p className="etiqueta">Vista previa con {destinatarios[0].nombre}</p>
                <div className="mt-1.5 rounded-lg rounded-tl-none bg-exito-soft p-3 text-sm leading-relaxed text-ink-soft">
                  {armarMensaje(destinatarios[0])}
                </div>
              </div>
            )}

            {/* Archivo de la campaña */}
            <div className="mt-4 rounded-lg border border-borde p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="etiqueta">Archivo de la campaña</p>
                  {adjunto ? (
                    <p className="mt-0.5 truncate text-sm text-ink-soft">
                      {adjunto.esPdf ? "📄" : "🖼️"} {adjunto.nombre}
                      {adjunto.tamano ? ` · ${pesoLegible(adjunto.tamano)}` : ""}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-sm text-ink-mute">
                      {puedeCambiarAdjunto
                        ? "Sube una imagen o un PDF y el mensaje llevará su enlace."
                        : "El administrador todavía no subió ninguno."}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {adjunto && (
                    <a href={adjunto.url} target="_blank" rel="noopener noreferrer" className="btn-contorno btn-sm">
                      <IconoOjo size={14} />
                      Ver
                    </a>
                  )}
                  {puedeCambiarAdjunto && (
                    <>
                      <input
                        ref={archivoRef}
                        type="file"
                        accept={TIPOS_ACEPTADOS}
                        onChange={elegirArchivo}
                        className="hidden"
                      />
                      <button
                        onClick={() => archivoRef.current?.click()}
                        disabled={subiendo}
                        className="btn-contorno btn-sm"
                      >
                        {subiendo ? "Subiendo..." : adjunto ? "Cambiar" : "Subir archivo"}
                      </button>
                      {adjunto && (
                        <button onClick={sacarArchivo} disabled={subiendo} className="btn-contorno btn-sm">
                          Quitar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {adjunto && (
                <label className="mt-3 flex cursor-pointer items-start gap-2.5 border-t border-borde pt-3">
                  <input
                    type="checkbox"
                    checked={adjuntarEnlace}
                    onChange={(e) => setAdjuntarEnlace(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brass"
                  />
                  <span className="text-sm text-ink-soft">
                    Agregar el enlace del archivo al final del mensaje
                    <span className="block text-xs text-ink-faint">
                      {enlaceCorto()} · si más adelante cambias el archivo, el mismo enlace muestra el nuevo.
                    </span>
                  </span>
                </label>
              )}
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg bg-cream p-3">
              <input type="checkbox" checked={marcarCatalogo} onChange={(e) => setMarcarCatalogo(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brass" />
              <span className="text-sm text-ink-soft">
                Marcar el catálogo de <strong>{MESES[mes - 1]}</strong> como enviado a cada cliente al que le escriba.
              </span>
            </label>
          </section>
        </div>

        {/* Resumen y arranque */}
        <div className="lg:col-span-2">
          <div className="carta sticky top-6 p-5">
            <h2 className="font-bold text-ink">3. Revisar y enviar</h2>

            <div className="my-4 rounded-xl bg-ink p-5 text-center text-white">
              <p className="text-5xl font-bold tabular-nums">{destinatarios.length}</p>
              <p className="mt-1 text-sm text-white/70">
                {destinatarios.length === 1 ? "destinatario" : "destinatarios"}
              </p>
              {cupoTotal < destinatarios.length && (
                <p className="mt-3 border-t border-white/15 pt-3 text-xs text-white/70">
                  Hoy puedes mandar <strong className="text-white">{cupoTotal}</strong>.
                  El resto queda para mañana.
                </p>
              )}
            </div>

            {/* Cupo por tienda: el tope es por número, y cada tienda usa el suyo. */}
            <div className="mb-4 space-y-2">
              <p className="etiqueta">Cupo de hoy · {TOPE_DIARIO} por tienda</p>
              {tiendasEnLista.map(({ tienda, enLista, usados, quedan }) => (
                <div key={tienda} className="flex items-center gap-2 text-xs">
                  <span className="w-28 shrink-0 truncate text-ink" title={tienda}>
                    {tienda.replace(" SFIDA", "")}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-borde">
                    <div
                      className={`h-full rounded-full transition-all ${quedan === 0 ? "bg-wine" : "bg-brass-dark"}`}
                      style={{ width: `${Math.min(100, (usados / TOPE_DIARIO) * 100)}%` }}
                    />
                  </div>
                  <span className={`w-14 shrink-0 text-right tabular-nums ${quedan === 0 ? "font-bold text-wine" : "text-ink-mute"}`}>
                    {quedan === 0 ? "lleno" : `${quedan} más`}
                  </span>
                  <span className="w-10 shrink-0 text-right tabular-nums text-ink-faint">
                    ({enLista})
                  </span>
                </div>
              ))}
            </div>

            {telefonoInvalido.length > 0 && (
              <details className="mb-3 rounded-lg bg-alerta-soft p-3">
                <summary className="cursor-pointer text-xs font-semibold text-alerta">
                  {telefonoInvalido.length} {telefonoInvalido.length === 1 ? "cliente queda fuera" : "clientes quedan fuera"} por teléfono inválido
                </summary>
                <ul className="mt-2 space-y-1 text-xs text-ink-mute">
                  {telefonoInvalido.map((c) => (
                    <li key={c.id} className="flex justify-between gap-2">
                      <span className="truncate">{c.nombre}</span>
                      <span className="shrink-0 tabular-nums">{c.telefono || "—"}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-ink-faint">
                  Un celular peruano son 9 dígitos y empieza en 9. Corrígelos en Clientes.
                </p>
              </details>
            )}

            <div className="mb-4 border-t border-borde pt-4">
              <SelectorModoWhatsApp />
            </div>

            <button
              onClick={iniciar}
              disabled={destinatarios.length === 0 || !mensaje.trim() || cupoTotal === 0}
              className="btn-excel w-full"
            >
              <IconoWhatsApp />
              {cupoTotal === 0 ? "Sin cupo por hoy" : "Iniciar campaña"}
            </button>

            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              WhatsApp no permite enviar en bloque desde fuera de su app. Esto te prepara cada
              conversación con el mensaje ya escrito y va llevando la cuenta: tú solo das
              enviar y pasas al siguiente. Cada tienda escribe desde el WhatsApp que tenga
              abierto en su propio equipo, y el tope de {TOPE_DIARIO} es por tienda y por día.
            </p>

            {destinatarios.length > 0 && (
              <div className="mt-5 border-t border-borde pt-4">
                <p className="etiqueta mb-2">Primeros de la lista</p>
                <ul className="space-y-2">
                  {destinatarios.slice(0, 5).map((c) => (
                    <li key={c.id} className="flex items-center gap-2">
                      <Avatar nombre={c.nombre} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink">{c.nombre}</p>
                        <p className="text-xs text-ink-faint">
                          <TelefonoCopiable telefono={c.telefono} soloIcono />
                        </p>
                      </div>
                      {enviosMes[c.id] && <Insignia tono="exito">Ya recibió</Insignia>}
                    </li>
                  ))}
                </ul>
                {destinatarios.length > 5 && (
                  <p className="mt-2 text-xs text-ink-faint">y {destinatarios.length - 5} más...</p>
                )}
              </div>
            )}

            {destinatarios.length === 0 && (
              <EstadoVacio
                icono={<IconoUsuarios size={30} />}
                titulo="Nadie coincide"
                texto="Afloja los filtros para incluir más clientes."
              />
            )}
          </div>
        </div>
      </div>

      <Modal
        abierto={resumenAbierto}
        onCerrar={() => setResumenAbierto(false)}
        titulo="Campaña terminada"
        ancho="max-w-md"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-exito-soft text-exito">
            <IconoCheck size={28} />
          </div>
          <p className="text-3xl font-bold tabular-nums text-ink">{contactados.length}</p>
          <p className="text-sm text-ink-mute">
            {contactados.length === 1 ? "cliente contactado" : "clientes contactados"}
            {cola.length > contactados.length && ` · ${cola.length - contactados.length} saltados`}
          </p>
          {marcarCatalogo && contactados.length > 0 && (
            <p className="mt-3 text-sm text-ink-mute">
              Su catálogo de {MESES[mes - 1]} quedó marcado como enviado.
            </p>
          )}
          <button onClick={() => setResumenAbierto(false)} className="btn-primario mt-6 w-full">
            Listo
          </button>
        </div>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------ Modo envío */

function ModoEnvio({
  cliente, mensaje, indice, total, contactados, marcarCatalogo, mesNombre,
  usadosHoy, restantes, tienda, modo, onEnviar, onSaltar, onTerminar,
}) {
  const botonRef = useRef(null);
  const enTope = restantes <= 0;
  const soloCopiar = modo === MODO_COPIAR;

  // El botón queda enfocado para poder avanzar con Enter sin usar el mouse.
  useEffect(() => { botonRef.current?.focus(); }, [cliente?.id]);

  return (
    <div className="mx-auto max-w-xl">
      <div className="carta p-6">
        <div className="mb-5">
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="font-semibold text-ink">
              {indice + 1} de {total}
            </span>
            <span className="text-ink-mute">{contactados} enviados</span>
          </div>
          <Progreso valor={indice} total={total} tono="exito" />

          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-cream px-3 py-2 text-xs">
            <span className="truncate text-ink-mute">
              Tope de hoy · <strong className="text-ink">{tienda}</strong>
            </span>
            <span className={`shrink-0 font-bold tabular-nums ${enTope ? "text-wine" : "text-ink"}`}>
              {usadosHoy} / {TOPE_DIARIO}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 border-y border-borde py-5">
          <Avatar nombre={cliente.nombre} size="lg" />
          <div className="min-w-0">
            <p className="text-lg font-bold leading-tight text-ink">{cliente.nombre}</p>
            <p className="text-sm text-ink-mute">
              <TelefonoCopiable telefono={cliente.telefono} />
            </p>
            <p className="truncate text-xs text-ink-faint">
              {cliente.tienda || "—"}{cliente.distrito ? ` · ${cliente.distrito}` : ""}
            </p>
          </div>
        </div>

        <div className="my-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="etiqueta">
              {soloCopiar ? "Mensaje para pegar" : "Mensaje que se va a enviar"}
            </p>
            <BotonCopiar texto={mensaje} etiqueta="Copiar mensaje" etiquetaCopiada="Copiado" />
          </div>
          <div className="whitespace-pre-wrap rounded-lg rounded-tl-none bg-exito-soft p-4 text-sm leading-relaxed text-ink-soft">
            {mensaje}
          </div>
        </div>

        {marcarCatalogo && !enTope && (
          <p className="mb-4 flex items-center gap-2 text-xs text-ink-mute">
            <IconoCheck size={14} />
            Al enviar se marcará su catálogo de {mesNombre}.
          </p>
        )}

        {enTope && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-alerta-soft p-3">
            <span className="mt-0.5 shrink-0 text-alerta"><IconoAlerta size={16} /></span>
            <div className="text-xs leading-relaxed text-ink-soft">
              <p className="font-semibold text-alerta">
                {tienda} ya llegó a sus {TOPE_DIARIO} mensajes de hoy.
              </p>
              <p className="mt-1">
                Seguir desde este número sube el riesgo de que WhatsApp lo
                restrinja. Puedes saltar a clientes de otra tienda o continuar
                mañana: la campaña queda guardada donde la dejes.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onSaltar} className="btn-contorno">Saltar</button>
          <button
            ref={botonRef}
            onClick={onEnviar}
            disabled={enTope}
            className="btn-excel flex-1"
          >
            {!soloCopiar && <IconoWhatsApp />}
            {enTope
              ? "Tope alcanzado"
              : soloCopiar
                ? "Ya se lo envié · siguiente"
                : "Abrir WhatsApp y seguir"}
            {!enTope && <IconoFlecha />}
          </button>
        </div>

        <div className="mt-4 border-t border-borde pt-4">
          <SelectorModoWhatsApp compacto />
          <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
            {soloCopiar
              ? "El CRM no abre nada: copia el número y el mensaje, pégalos en tu WhatsApp y confirma con el botón verde para que el envío quede contado."
              : modo === MODO_APP
                ? "Se abre la app de escritorio, que no recarga nada. Si no pasa nada al hacer clic, es que no está instalada en esta PC: cambia a WhatsApp Web."
                : "Todos los clientes usan la misma pestaña de WhatsApp Web, pero se recarga con cada uno. Con la app de escritorio el salto es instantáneo."}
          </p>
        </div>
      </div>

      <button onClick={onTerminar} className="btn-fantasma mx-auto mt-4 block">
        Terminar campaña
      </button>
    </div>
  );
}

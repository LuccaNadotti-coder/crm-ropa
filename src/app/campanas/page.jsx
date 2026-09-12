"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { traerTodas } from "@/lib/db";
import { TIENDAS } from "@/lib/peru-ubigeo";
import {
  MESES, paraBuscar, telefonoLegible, enlaceWhatsApp, diaYMes,
} from "@/lib/formato";
import Marco from "@/components/Marco";
import { useAvisos } from "@/components/Avisos";
import {
  Avatar, Insignia, Campo, Progreso, EstadoVacio, FilasEsqueleto, Modal,
  IconoWhatsApp, IconoUsuarios, IconoCheck, IconoFlecha,
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
      {(perfil) => <Contenido perfil={perfil} />}
    </Marco>
  );
}

function Contenido({ perfil }) {
  const avisos = useAvisos();
  const esAdmin = perfil.rol === "admin";

  const [clientes, setClientes] = useState([]);
  const [enviosMes, setEnviosMes] = useState({});
  const [cargando, setCargando] = useState(true);

  const [f, setF] = useState({
    tienda: "", talla: "", tipo: "", genero: "", estilo: "", catalogo: "", busqueda: "",
  });
  const [plantillaId, setPlantillaId] = useState("catalogo");
  const [mensaje, setMensaje] = useState(PLANTILLAS[0].texto);
  const [marcarCatalogo, setMarcarCatalogo] = useState(true);

  const [enCurso, setEnCurso] = useState(false);
  const [indice, setIndice] = useState(0);
  const [contactados, setContactados] = useState([]);
  const [cola, setCola] = useState([]);
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [restauracion, setRestauracion] = useState(null);

  const anio = new Date().getFullYear();
  const mes = new Date().getMonth() + 1;

  /* -------------------------------------------------------------- Carga */

  useEffect(() => {
    (async () => {
      try {
        const [lista, envios] = await Promise.all([
          traerTodas(() => supabase.from("clientes").select("*").order("nombre").order("id")),
          traerTodas(() =>
            supabase.from("envios_catalogo").select("cliente_id, enviado")
              .eq("anio", anio).eq("mes", mes).order("cliente_id")
          ),
        ]);
        setClientes(lista);
        const mapa = {};
        envios.forEach((e) => { mapa[e.cliente_id] = e.enviado; });
        setEnviosMes(mapa);
      } catch (e) {
        avisos.error("No se pudieron cargar los clientes: " + e.message);
      }
      setCargando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (!c.telefono) return false; // sin teléfono no hay WhatsApp posible
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

  const sinTelefono = clientes.length - clientes.filter((c) => c.telefono).length;

  const armarMensaje = (c) =>
    (mensaje || "")
      .replaceAll("{nombre}", c.nombre || "")
      .replaceAll("{tienda}", (c.tienda || "SFIDA").replace(" SFIDA", ""))
      .replaceAll("{cumple}", diaYMes(c.fecha_nacimiento));

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
    setCola(restauracion.cola);
    setIndice(restauracion.indice);
    setContactados(restauracion.contactados || []);
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

  const enviar = async () => {
    if (!actual) return;
    const enlace = enlaceWhatsApp(actual.telefono, armarMensaje(actual));
    if (!enlace) {
      avisos.error(`${actual.nombre} no tiene un teléfono válido.`);
      avanzar(contactados);
      return;
    }

    // Se abre primero: window.open solo funciona dentro del clic del usuario.
    window.open(enlace, "_blank", "noopener,noreferrer");

    const nuevos = [...contactados, actual.id];
    setContactados(nuevos);

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
    return (
      <ModoEnvio
        cliente={actual}
        mensaje={armarMensaje(actual)}
        indice={indice}
        total={cola.length}
        contactados={contactados.length}
        marcarCatalogo={marcarCatalogo}
        mesNombre={MESES[mes - 1]}
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
              {esAdmin && (
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
            </div>

            {sinTelefono > 0 && (
              <p className="mb-3 text-xs text-ink-mute">
                {sinTelefono} {sinTelefono === 1 ? "cliente queda fuera" : "clientes quedan fuera"} por no tener teléfono.
              </p>
            )}

            <button onClick={iniciar} disabled={destinatarios.length === 0 || !mensaje.trim()} className="btn-excel w-full">
              <IconoWhatsApp />
              Iniciar campaña
            </button>

            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              WhatsApp no permite enviar en bloque desde fuera de su app. Esto te abre cada
              conversación con el mensaje ya escrito y va llevando la cuenta: tú solo das
              enviar y pasas al siguiente.
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
                        <p className="truncate text-xs text-ink-faint">{telefonoLegible(c.telefono)}</p>
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
  onEnviar, onSaltar, onTerminar,
}) {
  const botonRef = useRef(null);

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
        </div>

        <div className="flex items-center gap-4 border-y border-borde py-5">
          <Avatar nombre={cliente.nombre} size="lg" />
          <div className="min-w-0">
            <p className="text-lg font-bold leading-tight text-ink">{cliente.nombre}</p>
            <p className="text-sm tabular-nums text-ink-mute">{telefonoLegible(cliente.telefono)}</p>
            <p className="truncate text-xs text-ink-faint">
              {cliente.tienda || "—"}{cliente.distrito ? ` · ${cliente.distrito}` : ""}
            </p>
          </div>
        </div>

        <div className="my-5">
          <p className="etiqueta mb-2">Mensaje que se va a enviar</p>
          <div className="whitespace-pre-wrap rounded-lg rounded-tl-none bg-exito-soft p-4 text-sm leading-relaxed text-ink-soft">
            {mensaje}
          </div>
        </div>

        {marcarCatalogo && (
          <p className="mb-4 flex items-center gap-2 text-xs text-ink-mute">
            <IconoCheck size={14} />
            Al enviar se marcará su catálogo de {mesNombre}.
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={onSaltar} className="btn-contorno">Saltar</button>
          <button ref={botonRef} onClick={onEnviar} className="btn-excel flex-1">
            <IconoWhatsApp />
            Abrir WhatsApp y seguir
            <IconoFlecha />
          </button>
        </div>
      </div>

      <button onClick={onTerminar} className="btn-fantasma mx-auto mt-4 block">
        Terminar campaña
      </button>
    </div>
  );
}

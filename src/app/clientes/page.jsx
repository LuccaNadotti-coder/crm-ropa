"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { traerTodas, enLotes } from "@/lib/db";
import { PERU, DEPARTAMENTOS, TIENDAS } from "@/lib/peru-ubigeo";
import {
  paraBuscar, normalizarTexto, normalizarOpcional, soloNumeros, soloLetras,
  fechaCorta, diaYMes, edadDesde, telefonoLegible, enlaceWhatsApp, telefonoEsValido,
  MESES, MESES_CORTOS,
} from "@/lib/formato";
import Marco from "@/components/Marco";
import { useAvisos } from "@/components/Avisos";
import {
  Avatar, Insignia, Campo, Modal, PanelLateral, Confirmacion, EstadoVacio, FilasEsqueleto,
  IconoBuscar, IconoMas, IconoExcel, IconoWhatsApp, IconoUsuarios, IconoX,
} from "@/components/ui";

const TALLAS = ["XS", "S", "M", "L", "XL", "2XL", "26", "28", "30", "32", "34"];
const GENEROS = ["Caballero", "Dama", "Ambos"];
const TIPOS = ["Minorista", "Mayorista"];
const ESTILOS = ["Clásico", "Casual", "Elegante", "Ejecutivo", "Romántico"];
const POR_PAGINA = 40;

const formVacio = {
  nombre: "", dni_ruc: "", telefono: "", fecha_nacimiento: "", genero: "",
  tipo_cliente: "", talla: "", estilo: "", departamento: "", distrito: "",
  tienda: "", asesora: "", observaciones: "",
};

export default function PaginaClientes() {
  return <Marco titulo="Clientes" descripcion="Registro de clientes de las tiendas SFIDA.">
    {(perfil) => <Contenido perfil={perfil} />}
  </Marco>;
}

function Contenido({ perfil }) {
  const avisos = useAvisos();
  const esAdmin = perfil.rol === "admin";

  const [clientes, setClientes] = useState([]);
  const [enviosMes, setEnviosMes] = useState({});
  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [filtroTienda, setFiltroTienda] = useState("");
  const [filtroTalla, setFiltroTalla] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [orden, setOrden] = useState({ campo: "nombre", asc: true });
  const [pagina, setPagina] = useState(1);

  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [fichaDe, setFichaDe] = useState(null);
  const [porEliminar, setPorEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [exportando, setExportando] = useState(false);

  const anio = new Date().getFullYear();
  const mesActual = new Date().getMonth() + 1;

  /* ------------------------------------------------------------- Carga */

  const cargar = async () => {
    setCargando(true);
    try {
      const [lista, envios] = await Promise.all([
        traerTodas(() => supabase.from("clientes").select("*").order("nombre").order("id")),
        traerTodas(() =>
          supabase.from("envios_catalogo").select("cliente_id, enviado")
            .eq("anio", anio).eq("mes", mesActual).order("cliente_id")
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
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  /* ------------------------------------------------------ Filtro y orden */

  const filtrados = useMemo(() => {
    const q = paraBuscar(busqueda);
    const lista = clientes.filter((c) => {
      if (filtroTienda && c.tienda !== filtroTienda) return false;
      if (filtroTalla && c.talla !== filtroTalla) return false;
      if (filtroTipo && c.tipo_cliente !== filtroTipo) return false;
      if (!q) return true;
      return paraBuscar(
        [c.nombre, c.telefono, c.dni_ruc, c.distrito, c.asesora].join(" ")
      ).includes(q);
    });

    const { campo, asc } = orden;
    return [...lista].sort((a, b) => {
      let va = a[campo] ?? "";
      let vb = b[campo] ?? "";
      if (campo === "fecha_nacimiento") {
        // Se ordena por día del año, no por edad: sirve para ver próximos cumpleaños.
        va = String(va).slice(5); vb = String(vb).slice(5);
      }
      const cmp = String(va).localeCompare(String(vb), "es", { numeric: true, sensitivity: "base" });
      return asc ? cmp : -cmp;
    });
  }, [clientes, busqueda, filtroTienda, filtroTalla, filtroTipo, orden]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  useEffect(() => { setPagina(1); }, [busqueda, filtroTienda, filtroTalla, filtroTipo]);

  const hayFiltros = busqueda || filtroTienda || filtroTalla || filtroTipo;
  const limpiarFiltros = () => {
    setBusqueda(""); setFiltroTienda(""); setFiltroTalla(""); setFiltroTipo("");
  };

  const ordenarPor = (campo) =>
    setOrden((o) => ({ campo, asc: o.campo === campo ? !o.asc : true }));

  /* ---------------------------------------------------------- Eliminar */

  const confirmarEliminar = async () => {
    setEliminando(true);
    const { error } = await supabase.from("clientes").delete().eq("id", porEliminar.id);
    setEliminando(false);
    if (error) {
      avisos.error("No se pudo eliminar: " + error.message);
    } else {
      avisos.exito(`${porEliminar.nombre} fue eliminado.`);
      setPorEliminar(null);
      setFichaDe(null);
      cargar();
    }
  };

  /* ------------------------------------------------------------ Excel */

  const exportarExcel = async () => {
    if (filtrados.length === 0) return;
    setExportando(true);
    try {
      const XLSX = await import("xlsx");

      // Por lotes: mandar los ~700 ids en una sola URL la hace tan larga que el
      // servidor la rechaza con 400 y el Excel salía sin datos de catálogo.
      const envios = [];
      for (const lote of enLotes(filtrados.map((c) => c.id))) {
        const filas = await traerTodas(() =>
          supabase.from("envios_catalogo").select("cliente_id, mes, enviado")
            .eq("anio", anio).in("cliente_id", lote).order("cliente_id").order("mes")
        );
        envios.push(...filas);
      }

      const porCliente = {};
      envios.forEach((e) => {
        (porCliente[e.cliente_id] ||= {})[e.mes] = e.enviado;
      });

      const filas = filtrados.map((c) => {
        const fila = {
          Nombre: c.nombre,
          DNI: c.dni_ruc || "",
          Telefono: c.telefono || "",
          "Fecha nacimiento": c.fecha_nacimiento || "",
          Edad: edadDesde(c.fecha_nacimiento) ?? "",
          Genero: c.genero || "",
          "Tipo cliente": c.tipo_cliente || "",
          Talla: c.talla || "",
          Estilo: c.estilo || "",
          Departamento: c.departamento || "",
          Distrito: c.distrito || "",
          Tienda: c.tienda || "",
          Asesora: c.asesora || "",
          "Carta cumpleaños enviada": c.saludo_cumple_anio === anio ? "Sí" : "No",
          "Tarjeta invitación/descuento enviada": c.promo_enviada_anio === anio ? "Sí" : "No",
        };
        MESES.forEach((nombreMes, i) => {
          fila[`Catálogo ${nombreMes}`] = porCliente[c.id]?.[i + 1] ? "Sí" : "No";
        });
        fila["Catálogos enviados"] = Object.values(porCliente[c.id] || {}).filter(Boolean).length;
        fila.Observaciones = c.observaciones || "";
        return fila;
      });

      const hoja = XLSX.utils.json_to_sheet(filas);
      hoja["!cols"] = Object.keys(filas[0]).map((k) => ({
        wch: Math.min(38, Math.max(10, k.length + 2)),
      }));
      hoja["!autofilter"] = { ref: XLSX.utils.encode_range({
        s: { c: 0, r: 0 }, e: { c: Object.keys(filas[0]).length - 1, r: filas.length },
      }) };

      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, "Clientes");
      const sufijo = filtroTienda ? `-${filtroTienda.replace(/\s+/g, "-")}` : "";
      XLSX.writeFile(libro, `clientes${sufijo}-${anio}.xlsx`);
      avisos.exito(`Excel generado con ${filas.length} clientes.`);
    } catch (e) {
      avisos.error("No se pudo exportar: " + e.message);
    }
    setExportando(false);
  };

  /* ------------------------------------------------------------- Vista */

  return (
    <>
      {/* Barra de herramientas */}
      <div className="carta mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
              <IconoBuscar />
            </span>
            <input
              className="input pl-9"
              placeholder="Buscar por nombre, teléfono, DNI, distrito o asesora..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar clientes"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 btn-icono"
                aria-label="Limpiar búsqueda"
              >
                <IconoX />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {esAdmin && (
              <select className="input w-auto" value={filtroTienda} onChange={(e) => setFiltroTienda(e.target.value)} aria-label="Filtrar por tienda">
                <option value="">Todas las tiendas</option>
                {TIENDAS.map((t) => <option key={t}>{t}</option>)}
              </select>
            )}
            <select className="input w-auto" value={filtroTalla} onChange={(e) => setFiltroTalla(e.target.value)} aria-label="Filtrar por talla">
              <option value="">Talla</option>
              {TALLAS.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select className="input w-auto" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} aria-label="Filtrar por tipo">
              <option value="">Tipo</option>
              {TIPOS.map((t) => <option key={t}>{t}</option>)}
            </select>
            <button onClick={exportarExcel} disabled={exportando || filtrados.length === 0} className="btn-excel">
              <IconoExcel />
              {exportando ? "Generando..." : "Excel"}
            </button>
            <button
              onClick={() => { setEditando(null); setFormAbierto(true); }}
              className="btn-primario"
            >
              <IconoMas />
              Nuevo
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-mute">
          <span>
            <strong className="tabular-nums text-ink">{filtrados.length}</strong>
            {filtrados.length === clientes.length ? " clientes" : ` de ${clientes.length} clientes`}
          </span>
          {hayFiltros && (
            <button onClick={limpiarFiltros} className="font-semibold text-wine hover:underline">
              Quitar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla / tarjetas */}
      <div className="carta overflow-hidden">
        {cargando ? (
          <FilasEsqueleto filas={8} />
        ) : filtrados.length === 0 ? (
          <EstadoVacio
            icono={<IconoUsuarios size={34} />}
            titulo={hayFiltros ? "Ningún cliente coincide" : "Todavía no hay clientes"}
            texto={hayFiltros ? "Prueba con otro término o quita los filtros." : "Registra el primero para empezar."}
            accion={
              hayFiltros
                ? <button onClick={limpiarFiltros} className="btn-contorno">Quitar filtros</button>
                : <button onClick={() => { setEditando(null); setFormAbierto(true); }} className="btn-primario"><IconoMas />Nuevo cliente</button>
            }
          />
        ) : (
          <>
            {/* Escritorio */}
            <div className="scroll-fino hidden max-h-[65vh] overflow-auto md:block">
              <table className="tabla-crm">
                <thead>
                  <tr>
                    <Th campo="nombre" orden={orden} onOrdenar={ordenarPor}>Cliente</Th>
                    <Th campo="telefono" orden={orden} onOrdenar={ordenarPor}>Teléfono</Th>
                    <Th campo="fecha_nacimiento" orden={orden} onOrdenar={ordenarPor}>Cumpleaños</Th>
                    <Th campo="talla" orden={orden} onOrdenar={ordenarPor}>Talla</Th>
                    <Th campo="distrito" orden={orden} onOrdenar={ordenarPor}>Distrito</Th>
                    {esAdmin && <Th campo="tienda" orden={orden} onOrdenar={ordenarPor}>Tienda</Th>}
                    <th>Catálogo {MESES_CORTOS[mesActual - 1]}</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((c) => (
                    <tr key={c.id} className="cursor-pointer" onClick={() => setFichaDe(c)}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar nombre={c.nombre} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">{c.nombre}</p>
                            <p className="truncate text-xs text-ink-faint">{c.dni_ruc || "Sin DNI"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="tabular-nums">
                        {telefonoEsValido(c.telefono) ? (
                          <span className="text-ink-mute">{telefonoLegible(c.telefono)}</span>
                        ) : (
                          <span className="font-medium text-wine" title="No es un celular válido: WhatsApp no abrirá.">
                            {c.telefono || "—"} ⚠
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-ink-mute">{diaYMes(c.fecha_nacimiento)}</td>
                      <td>{c.talla ? <Insignia tono="laton">{c.talla}</Insignia> : <span className="text-ink-faint">—</span>}</td>
                      <td className="text-ink-mute">{c.distrito || "—"}</td>
                      {esAdmin && <td className="whitespace-nowrap text-ink-mute">{c.tienda || "—"}</td>}
                      <td>
                        {enviosMes[c.id]
                          ? <Insignia tono="exito">Enviado</Insignia>
                          : <Insignia tono="neutro">Pendiente</Insignia>}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {telefonoEsValido(c.telefono) && (
                            <a
                              href={enlaceWhatsApp(c.telefono, `Hola ${c.nombre}, te saludamos de SFIDA.`)}
                              target="_blank" rel="noopener noreferrer"
                              className="btn-icono text-exito" aria-label={`WhatsApp a ${c.nombre}`}
                            >
                              <IconoWhatsApp size={17} />
                            </a>
                          )}
                          <button
                            onClick={() => { setEditando(c); setFormAbierto(true); }}
                            className="btn-fantasma btn-sm"
                          >
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Celular */}
            <ul className="divide-y divide-borde/60 md:hidden">
              {visibles.map((c) => (
                <li key={c.id}>
                  <button onClick={() => setFichaDe(c)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-cream">
                    <Avatar nombre={c.nombre} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{c.nombre}</p>
                      <p className="truncate text-xs text-ink-mute">
                        {telefonoLegible(c.telefono)} · {c.distrito || "Sin distrito"}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {c.talla && <Insignia tono="laton">{c.talla}</Insignia>}
                        {enviosMes[c.id] && <Insignia tono="exito">Catálogo enviado</Insignia>}
                        {esAdmin && c.tienda && <Insignia>{c.tienda.replace(" SFIDA", "")}</Insignia>}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between gap-3 border-t border-borde px-4 py-3">
                <p className="text-sm text-ink-mute">
                  Página <strong className="text-ink">{paginaSegura}</strong> de {totalPaginas}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={paginaSegura === 1} className="btn-contorno btn-sm">
                    Anterior
                  </button>
                  <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={paginaSegura === totalPaginas} className="btn-contorno btn-sm">
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <FormularioCliente
        abierto={formAbierto}
        cliente={editando}
        perfil={perfil}
        onCerrar={() => { setFormAbierto(false); setEditando(null); }}
        onGuardado={(nombre, eraNuevo) => {
          setFormAbierto(false); setEditando(null);
          avisos.exito(eraNuevo ? `${nombre} fue registrado.` : `${nombre} fue actualizado.`);
          cargar();
        }}
      />

      <FichaCliente
        cliente={fichaDe}
        esAdmin={esAdmin}
        anio={anio}
        onCerrar={() => setFichaDe(null)}
        onEditar={(c) => { setFichaDe(null); setEditando(c); setFormAbierto(true); }}
        onEliminar={(c) => setPorEliminar(c)}
      />

      <Confirmacion
        abierto={!!porEliminar}
        titulo="Eliminar cliente"
        mensaje={`Se eliminará a ${porEliminar?.nombre} y su historial de catálogos. Esta acción no se puede deshacer.`}
        onConfirmar={confirmarEliminar}
        onCancelar={() => setPorEliminar(null)}
        procesando={eliminando}
      />
    </>
  );
}

/* ------------------------------------------------------ Encabezado orden */

function Th({ campo, orden, onOrdenar, children }) {
  const activo = orden.campo === campo;
  return (
    <th>
      <button
        onClick={() => onOrdenar(campo)}
        className={`flex items-center gap-1 transition-colors hover:text-ink ${activo ? "text-ink" : ""}`}
      >
        {children}
        <span className={`text-[9px] ${activo ? "opacity-100" : "opacity-25"}`}>
          {activo && !orden.asc ? "▼" : "▲"}
        </span>
      </button>
    </th>
  );
}

/* ------------------------------------------------------------ Formulario */

function FormularioCliente({ abierto, cliente, perfil, onCerrar, onGuardado }) {
  const avisos = useAvisos();
  const [form, setForm] = useState(formVacio);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setErrores({});
    if (cliente) {
      setForm({ ...formVacio, ...Object.fromEntries(
        Object.keys(formVacio).map((k) => [k, cliente[k] ?? ""])
      ) });
    } else {
      setForm({ ...formVacio, tienda: perfil.rol === "tienda" ? perfil.tienda : "" });
    }
  }, [abierto, cliente, perfil]);

  const cambiar = (campo, valor) => {
    let v = valor;
    if (campo === "telefono" || campo === "dni_ruc") v = soloNumeros(valor);
    if (campo === "nombre" || campo === "asesora") v = soloLetras(valor);
    setForm((f) => {
      const nuevo = { ...f, [campo]: v };
      if (campo === "departamento") nuevo.distrito = "";
      return nuevo;
    });
    setErrores((e) => ({ ...e, [campo]: null }));
  };

  const validar = () => {
    const e = {};
    if (!normalizarTexto(form.nombre)) e.nombre = "El nombre es obligatorio.";
    if (!form.telefono) e.telefono = "El teléfono es obligatorio.";
    else if (form.telefono.length < 9) e.telefono = "Debe tener 9 dígitos.";
    if (!form.fecha_nacimiento) e.fecha_nacimiento = "La fecha de nacimiento es obligatoria.";
    else if (form.fecha_nacimiento > new Date().toISOString().slice(0, 10))
      e.fecha_nacimiento = "No puede ser una fecha futura.";
    if (!form.tienda) e.tienda = "Selecciona la tienda.";
    if (form.dni_ruc && ![8, 11].includes(form.dni_ruc.length))
      e.dni_ruc = "El DNI tiene 8 dígitos y el RUC 11.";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async (ev) => {
    ev.preventDefault();
    if (!validar()) return;
    setGuardando(true);

    const { data: repetido, error: errorCheck } = await supabase.rpc("existe_telefono", {
      telefono_buscar: form.telefono,
      cliente_id_excluir: cliente?.id || null,
    });

    if (errorCheck) {
      setGuardando(false);
      avisos.error("No se pudo validar el teléfono: " + errorCheck.message);
      return;
    }
    if (repetido) {
      setGuardando(false);
      setErrores({ telefono: "Ya existe un cliente con este teléfono." });
      return;
    }

    // Se normaliza aquí para que no vuelvan a entrar nombres con espacios
    // de sobra o tabulaciones al pegar desde Excel o WhatsApp.
    const datos = {
      ...form,
      nombre: normalizarTexto(form.nombre),
      asesora: normalizarOpcional(form.asesora),
      observaciones: normalizarOpcional(form.observaciones),
      dni_ruc: form.dni_ruc || null,
      genero: form.genero || null,
      tipo_cliente: form.tipo_cliente || null,
      talla: form.talla || null,
      estilo: form.estilo || null,
      departamento: form.departamento || null,
      distrito: form.distrito || null,
    };

    const { error } = cliente
      ? await supabase.from("clientes").update(datos).eq("id", cliente.id)
      : await supabase.from("clientes").insert([datos]);

    setGuardando(false);
    if (error) avisos.error("No se pudo guardar: " + error.message);
    else onGuardado(datos.nombre, !cliente);
  };

  const distritos = form.departamento ? PERU[form.departamento] || [] : [];

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={cliente ? "Editar cliente" : "Nuevo cliente"}
      descripcion={cliente ? cliente.nombre : "Los campos con * son obligatorios."}
      ancho="max-w-3xl"
    >
      <form onSubmit={guardar} id="form-cliente">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Campo label="Nombre completo" requerido error={errores.nombre} full>
            <input className={`input ${errores.nombre ? "input-error" : ""}`} value={form.nombre}
              onChange={(e) => cambiar("nombre", e.target.value)} placeholder="MARÍA PÉREZ LÓPEZ" autoFocus />
          </Campo>

          <Campo label="Teléfono (WhatsApp)" requerido error={errores.telefono}>
            <input className={`input ${errores.telefono ? "input-error" : ""}`} value={form.telefono}
              onChange={(e) => cambiar("telefono", e.target.value)} placeholder="987654321"
              inputMode="numeric" type="tel" maxLength={11} />
          </Campo>

          <Campo label="DNI / RUC" error={errores.dni_ruc}>
            <input className={`input ${errores.dni_ruc ? "input-error" : ""}`} value={form.dni_ruc}
              onChange={(e) => cambiar("dni_ruc", e.target.value)} placeholder="12345678"
              inputMode="numeric" type="tel" maxLength={11} />
          </Campo>

          <Campo label="Fecha de nacimiento" requerido error={errores.fecha_nacimiento}>
            <input type="date" className={`input ${errores.fecha_nacimiento ? "input-error" : ""}`}
              value={form.fecha_nacimiento} max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => cambiar("fecha_nacimiento", e.target.value)} />
          </Campo>

          <Campo label="Tienda" requerido error={errores.tienda}>
            {perfil.rol === "tienda" ? (
              <input className="input" value={form.tienda} disabled />
            ) : (
              <select className={`input ${errores.tienda ? "input-error" : ""}`} value={form.tienda}
                onChange={(e) => cambiar("tienda", e.target.value)}>
                <option value="">Seleccionar</option>
                {TIENDAS.map((t) => <option key={t}>{t}</option>)}
              </select>
            )}
          </Campo>

          <Campo label="Género">
            <select className="input" value={form.genero} onChange={(e) => cambiar("genero", e.target.value)}>
              <option value="">Seleccionar</option>
              {GENEROS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Campo>

          <Campo label="Tipo de cliente">
            <select className="input" value={form.tipo_cliente} onChange={(e) => cambiar("tipo_cliente", e.target.value)}>
              <option value="">Seleccionar</option>
              {TIPOS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Campo>

          <Campo label="Talla">
            <select className="input" value={form.talla} onChange={(e) => cambiar("talla", e.target.value)}>
              <option value="">Seleccionar</option>
              {TALLAS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Campo>

          <Campo label="Estilo">
            <select className="input" value={form.estilo} onChange={(e) => cambiar("estilo", e.target.value)}>
              <option value="">Seleccionar</option>
              {ESTILOS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Campo>

          <Campo label="Departamento">
            <select className="input" value={form.departamento} onChange={(e) => cambiar("departamento", e.target.value)}>
              <option value="">Seleccionar</option>
              {DEPARTAMENTOS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Campo>

          <Campo label="Distrito">
            <select className="input" value={form.distrito} onChange={(e) => cambiar("distrito", e.target.value)} disabled={!form.departamento}>
              <option value="">{form.departamento ? "Seleccionar" : "Elige un departamento primero"}</option>
              {distritos.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Campo>

          <Campo label="Asesora">
            <input className="input" value={form.asesora} onChange={(e) => cambiar("asesora", e.target.value)} placeholder="JOHANA" />
          </Campo>

          <Campo label="Observaciones" full ayuda="Preferencias, tallas alternativas, notas de venta.">
            <textarea className="input min-h-[80px] resize-y" value={form.observaciones}
              onChange={(e) => cambiar("observaciones", e.target.value)} />
          </Campo>
        </div>
      </form>

      <div className="mt-6 flex justify-end gap-3 border-t border-borde pt-5">
        <button type="button" onClick={onCerrar} className="btn-contorno">Cancelar</button>
        <button type="submit" form="form-cliente" disabled={guardando} className="btn-vino">
          {guardando ? "Guardando..." : cliente ? "Guardar cambios" : "Registrar cliente"}
        </button>
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------------- Ficha */

function FichaCliente({ cliente, esAdmin, anio, onCerrar, onEditar, onEliminar }) {
  const [historial, setHistorial] = useState(null);

  useEffect(() => {
    if (!cliente) { setHistorial(null); return; }
    let vigente = true;
    (async () => {
      const { data } = await supabase
        .from("envios_catalogo")
        .select("mes, enviado, fecha_marcado")
        .eq("cliente_id", cliente.id).eq("anio", anio);
      if (vigente) setHistorial(data || []);
    })();
    return () => { vigente = false; };
  }, [cliente, anio]);

  if (!cliente) return null;

  const mapa = {};
  (historial || []).forEach((e) => { mapa[e.mes] = e.enviado; });
  const totalEnviados = Object.values(mapa).filter(Boolean).length;
  const edad = edadDesde(cliente.fecha_nacimiento);

  return (
    <PanelLateral
      abierto={!!cliente}
      onCerrar={onCerrar}
      titulo="Ficha del cliente"
      pie={
        <div className="flex gap-3">
          <button onClick={() => onEditar(cliente)} className="btn-vino flex-1">Editar</button>
          {esAdmin && (
            <button onClick={() => onEliminar(cliente)} className="btn-contorno text-wine">Eliminar</button>
          )}
        </div>
      }
    >
      <div className="flex items-center gap-4">
        <Avatar nombre={cliente.nombre} size="lg" />
        <div className="min-w-0">
          <h3 className="text-lg font-bold leading-tight text-ink">{cliente.nombre}</h3>
          <p className="text-sm text-ink-mute">{cliente.tienda || "Sin tienda"}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {cliente.tipo_cliente && <Insignia tono="oscuro">{cliente.tipo_cliente}</Insignia>}
            {cliente.talla && <Insignia tono="laton">Talla {cliente.talla}</Insignia>}
          </div>
        </div>
      </div>

      {telefonoEsValido(cliente.telefono) ? (
        <a
          href={enlaceWhatsApp(cliente.telefono, `Hola ${cliente.nombre}, te saludamos de SFIDA.`)}
          target="_blank" rel="noopener noreferrer"
          className="btn-excel mt-5 w-full"
        >
          <IconoWhatsApp />
          Escribir por WhatsApp
        </a>
      ) : (
        <p className="mt-5 rounded-lg bg-alerta-soft px-3 py-2.5 text-xs text-alerta">
          El teléfono <strong>{cliente.telefono || "(vacío)"}</strong> no es un celular válido, así
          que WhatsApp no abrirá. Un celular peruano son 9 dígitos y empieza en 9.
        </p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4">
        <Dato titulo="Teléfono" valor={telefonoLegible(cliente.telefono)} />
        <Dato titulo="DNI / RUC" valor={cliente.dni_ruc} />
        <Dato titulo="Cumpleaños" valor={`${fechaCorta(cliente.fecha_nacimiento)}${edad != null ? ` (${edad} años)` : ""}`} />
        <Dato titulo="Género" valor={cliente.genero} />
        <Dato titulo="Estilo" valor={cliente.estilo} />
        <Dato titulo="Asesora" valor={cliente.asesora} />
        <Dato titulo="Departamento" valor={cliente.departamento} />
        <Dato titulo="Distrito" valor={cliente.distrito} />
      </dl>

      {cliente.observaciones && (
        <div className="mt-6">
          <p className="etiqueta">Observaciones</p>
          <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-cream p-3 text-sm leading-relaxed text-ink-soft">
            {cliente.observaciones}
          </p>
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <p className="etiqueta">Catálogos {anio}</p>
          <p className="text-sm font-semibold text-brass-dark">{totalEnviados} de 12</p>
        </div>
        {historial === null ? (
          <div className="esqueleto mt-2 h-16 w-full" />
        ) : (
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {MESES_CORTOS.map((m, i) => (
              <div
                key={m}
                title={`${MESES[i]}: ${mapa[i + 1] ? "enviado" : "no enviado"}`}
                className={`rounded-md py-1.5 text-center text-[11px] font-semibold ${
                  mapa[i + 1] ? "bg-exito text-white" : "bg-cream text-ink-faint"
                }`}
              >
                {m}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 space-y-2 border-t border-borde pt-5">
        <Marca hecho={cliente.saludo_cumple_anio === anio} texto="Carta de cumpleaños enviada" />
        <Marca hecho={cliente.promo_enviada_anio === anio} texto="Tarjeta de invitación / descuento enviada" />
      </div>
    </PanelLateral>
  );
}

function Dato({ titulo, valor }) {
  return (
    <div>
      <dt className="etiqueta">{titulo}</dt>
      <dd className="mt-0.5 text-sm text-ink">{valor || <span className="text-ink-faint">—</span>}</dd>
    </div>
  );
}

function Marca({ hecho, texto }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${hecho ? "bg-exito" : "bg-borde"}`}>
        {hecho ? "✓" : ""}
      </span>
      <span className={hecho ? "text-ink" : "text-ink-faint"}>{texto}</span>
    </div>
  );
}

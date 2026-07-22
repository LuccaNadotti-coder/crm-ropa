"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth-helpers";
import { TIENDAS } from "@/lib/peru-ubigeo";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function CatalogosPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [envios, setEnvios] = useState({});         // { cliente_id: true/false }  -> del mes seleccionado
  const [ultimosEnvios, setUltimosEnvios] = useState({}); // { cliente_id: fecha }  -> el más reciente, cualquier mes
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio] = useState(new Date().getFullYear());
  const [query, setQuery] = useState("");
  const [filtroTienda, setFiltroTienda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("no_enviados"); // no_enviados | enviados | todos

  useEffect(() => {
    (async () => {
      const resultado = await requireSession(router);
      if (!resultado) return;
      setPerfil(resultado.perfil);
      cargarClientes();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (perfil) cargarEnvios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, perfil]);

  const cargarClientes = async () => {
    const { data, error } = await supabase.from("clientes").select("*").order("nombre");
    if (!error) setClientes(data || []);
    setLoading(false);
  };

  const cargarEnvios = async () => {
    const { data: delMes } = await supabase
      .from("envios_catalogo")
      .select("cliente_id, enviado")
      .eq("anio", anio)
      .eq("mes", mes);
    const mapaMes = {};
    (delMes || []).forEach((e) => { mapaMes[e.cliente_id] = e.enviado; });
    setEnvios(mapaMes);

    const { data: historial } = await supabase
      .from("envios_catalogo")
      .select("cliente_id, fecha_marcado")
      .eq("enviado", true)
      .order("fecha_marcado", { ascending: false });
    const ultimo = {};
    (historial || []).forEach((e) => {
      if (!ultimo[e.cliente_id]) ultimo[e.cliente_id] = e.fecha_marcado;
    });
    setUltimosEnvios(ultimo);
  };

  const marcarEnvio = async (clienteId) => {
    const nuevoValor = !envios[clienteId];
    setEnvios((prev) => ({ ...prev, [clienteId]: nuevoValor }));
    const { error } = await supabase.from("envios_catalogo").upsert(
      { cliente_id: clienteId, anio, mes, enviado: nuevoValor, fecha_marcado: new Date().toISOString() },
      { onConflict: "cliente_id,anio,mes" }
    );
    if (error) {
      setEnvios((prev) => ({ ...prev, [clienteId]: !nuevoValor }));
      alert("No se pudo guardar: " + error.message);
    } else {
      cargarEnvios();
    }
  };

  const waLinkCatalogo = (c) => {
    const digits = (c.telefono || "").replace(/\D/g, "");
    const texto = `Hola ${c.nombre}, te compartimos nuestro nuevo catálogo con las últimas novedades y promociones. ¡Esperamos que te encante! 🛍️`;
    return `https://wa.me/51${digits}?text=${encodeURIComponent(texto)}`;
  };

  const textoUltimoEnvio = (clienteId) => {
    const fecha = ultimosEnvios[clienteId];
    if (!fecha) return "Nunca recibió catálogo";
    const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
    if (dias === 0) return "Recibió catálogo hoy";
    return `Último catálogo hace ${dias} día${dias === 1 ? "" : "s"}`;
  };

  let lista = clientes
    .filter((c) => [c.nombre, c.telefono, c.distrito].join(" ").toLowerCase().includes(query.toLowerCase()))
    .filter((c) => (filtroTienda ? c.tienda === filtroTienda : true));

  if (filtroEstado === "no_enviados") lista = lista.filter((c) => !envios[c.id]);
  if (filtroEstado === "enviados") lista = lista.filter((c) => envios[c.id]);

  if (filtroEstado === "no_enviados") {
    lista = [...lista].sort((a, b) => {
      const fa = ultimosEnvios[a.id] ? new Date(ultimosEnvios[a.id]).getTime() : 0;
      const fb = ultimosEnvios[b.id] ? new Date(ultimosEnvios[b.id]).getTime() : 0;
      return fa - fb;
    });
  }

  const totalFiltrado = clientes
    .filter((c) => [c.nombre, c.telefono, c.distrito].join(" ").toLowerCase().includes(query.toLowerCase()))
    .filter((c) => (filtroTienda ? c.tienda === filtroTienda : true));
  const enviados = totalFiltrado.filter((c) => envios[c.id]).length;

  if (!perfil) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F3F1EC]">
        <p className="text-gray-400">Cargando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F3F1EC] p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-gray-500 hover:text-ink">← Inicio</Link>
        <h1 className="text-3xl font-bold mt-2 mb-1 text-ink">Catálogos</h1>
        <p className="text-gray-500 text-sm mb-6">Marca qué clientes ya recibieron el catálogo de cada mes.</p>

        <div className="flex flex-wrap gap-3 mb-4">
          <select className="input bg-white w-40" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>{m} {anio}</option>
            ))}
          </select>
          <select className="input bg-white w-44" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="no_enviados">No enviados (sugerido)</option>
            <option value="enviados">Ya enviados</option>
            <option value="todos">Todos</option>
          </select>
          {perfil.rol === "admin" && (
            <select className="input bg-white w-40" value={filtroTienda} onChange={(e) => setFiltroTienda(e.target.value)}>
              <option value="">Todas las tiendas</option>
              {TIENDAS.map((t) => <option key={t}>{t}</option>)}
            </select>
          )}
          <input
            className="input bg-white flex-1 min-w-[180px]"
            placeholder="Buscar cliente..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <div className="text-3xl font-bold text-wine">{enviados} / {totalFiltrado.length}</div>
          <div className="text-sm text-gray-400 mt-1">Enviados en {MESES[mes - 1]}</div>
        </div>

        {filtroEstado === "no_enviados" && lista.length > 0 && (
          <p className="text-xs text-gray-400 mb-3">
            Ordenados: primero quienes tienen más tiempo esperando su catálogo.
          </p>
        )}

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <p className="p-8 text-center text-gray-400">Cargando clientes...</p>
          ) : lista.length === 0 ? (
            <p className="p-8 text-center text-gray-400">Sin resultados.</p>
          ) : (
            lista.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-4 border-b last:border-b-0">
                <input
                  type="checkbox"
                  checked={!!envios[c.id]}
                  onChange={() => marcarEnvio(c.id)}
                  className="accent-brass w-5 h-5 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${envios[c.id] ? "line-through text-gray-400" : "text-ink"}`}>{c.nombre}</div>
                  <div className="text-xs text-gray-400">{c.telefono || "Sin teléfono"} · {c.distrito || "—"}</div>
                  <div className="text-xs text-brass mt-0.5">{textoUltimoEnvio(c.id)}</div>
                </div>
                <a
                  href={waLinkCatalogo(c)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-wine underline flex-shrink-0"
                >
                  WhatsApp →
                </a>
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #D8D0BE;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 0.9rem;
        }
        .input:focus {
          outline: 2px solid #B8925A;
        }
      `}</style>
    </main>
  );
}
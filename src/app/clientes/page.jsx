"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth-helpers";
import { PERU, DEPARTAMENTOS, TIENDAS } from "@/lib/peru-ubigeo";

const emptyForm = {
  nombre: "",
  dni_ruc: "",
  telefono: "",
  fecha_nacimiento: "",
  genero: "",
  tipo_cliente: "",
  talla: "",
  estilo: "",
  departamento: "",
  distrito: "",
  tienda: "",
  asesora: "",
  observaciones: "",
};

export default function ClientesPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [filtroTienda, setFiltroTienda] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const resultado = await requireSession(router);
      if (!resultado) return;
      setPerfil(resultado.perfil);
      if (resultado.perfil.rol === "tienda") {
        setForm((f) => ({ ...f, tienda: resultado.perfil.tienda }));
      }
      cargarClientes();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const cargarClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("nombre", { ascending: true });
    if (!error) setClientes(data || []);
    setLoading(false);
  };

  const handleChange = (campo, valor) => {
    setForm((f) => {
      const actualizado = { ...f, [campo]: valor };
      if (campo === "departamento") actualizado.distrito = "";
      return actualizado;
    });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!form.nombre || !form.telefono || !form.fecha_nacimiento) {
      setMsg("Completa nombre, teléfono y fecha de nacimiento.");
      return;
    }
    if (!form.tienda) {
      setMsg("Selecciona la tienda.");
      return;
    }

    setSaving(true);
    let error;

    if (editingId) {
      ({ error } = await supabase.from("clientes").update(form).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("clientes").insert([form]));
    }

    setSaving(false);

    if (error) {
      setMsg("No se pudo guardar: " + error.message);
    } else {
      setMsg(editingId ? "Cliente actualizado." : "Cliente guardado.");
      setForm(perfil.rol === "tienda" ? { ...emptyForm, tienda: perfil.tienda } : emptyForm);
      setEditingId(null);
      cargarClientes();
    }
  };

  const editar = (c) => {
    setForm({ ...emptyForm, ...c });
    setEditingId(c.id);
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelarEdicion = () => {
    setForm(perfil?.rol === "tienda" ? { ...emptyForm, tienda: perfil.tienda } : emptyForm);
    setEditingId(null);
    setMsg("");
  };

  const eliminar = async (c) => {
    if (!confirm(`¿Eliminar a ${c.nombre}? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("clientes").delete().eq("id", c.id);
    if (!error) cargarClientes();
  };

  const exportarExcel = async () => {
    if (filtrados.length === 0) return;
    const XLSX = await import("xlsx");
    const filas = filtrados.map((c) => ({
      Nombre: c.nombre,
      DNI: c.dni_ruc,
      Telefono: c.telefono,
      "Fecha nacimiento": c.fecha_nacimiento,
      Genero: c.genero,
      "Tipo cliente": c.tipo_cliente,
      Talla: c.talla,
      Estilo: c.estilo,
      Departamento: c.departamento,
      Distrito: c.distrito,
      Tienda: c.tienda,
      Asesora: c.asesora,
      "Carta cumpleaños enviada": c.saludo_cumple_anio === new Date().getFullYear() ? "Sí" : "No",
      "Tarjeta descuento/catálogo enviada": c.promo_enviada_anio === new Date().getFullYear() ? "Sí" : "No",
      Observaciones: c.observaciones,
    }));
    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Clientes");
    XLSX.writeFile(libro, "clientes.xlsx");
  };

  const filtrados = clientes
    .filter((c) =>
      [c.nombre, c.telefono, c.dni_ruc, c.distrito].join(" ").toLowerCase().includes(query.toLowerCase())
    )
    .filter((c) => (filtroTienda ? c.tienda === filtroTienda : true));

  if (!perfil) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F3F1EC]">
        <p className="text-gray-400">Cargando...</p>
      </main>
    );
  }

  const distritosDisponibles = form.departamento ? PERU[form.departamento] || [] : [];

  return (
    <main className="min-h-screen bg-[#F3F1EC] p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-sm text-gray-500 hover:text-ink">← Inicio</Link>
        <h1 className="text-3xl font-bold mt-2 mb-6 text-ink">Clientes</h1>

        {editingId && (
          <div className="bg-wine text-white rounded-xl px-4 py-3 mb-4 flex justify-between items-center text-sm">
            <span>Editando a {form.nombre}</span>
            <button onClick={cancelarEdicion} className="border border-white rounded-md px-3 py-1 text-xs">
              Cancelar edición
            </button>
          </div>
        )}

        <form onSubmit={guardar} className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo label="Nombre completo *">
              <input className="input" value={form.nombre} onChange={(e) => handleChange("nombre", e.target.value)} placeholder="María Pérez" />
            </Campo>
            <Campo label="DNI / RUC">
              <input className="input" value={form.dni_ruc} onChange={(e) => handleChange("dni_ruc", e.target.value)} placeholder="12345678" />
            </Campo>
            <Campo label="Teléfono (WhatsApp) *">
              <input className="input" value={form.telefono} onChange={(e) => handleChange("telefono", e.target.value)} placeholder="999 999 999" />
            </Campo>
            <Campo label="Fecha de nacimiento *">
              <input type="date" className="input" value={form.fecha_nacimiento} onChange={(e) => handleChange("fecha_nacimiento", e.target.value)} />
            </Campo>
            <Campo label="Género">
              <select className="input" value={form.genero} onChange={(e) => handleChange("genero", e.target.value)}>
                <option value="">Seleccionar</option>
                <option>Caballero</option>
                <option>Dama</option>
                <option>Ambos</option>
              </select>
            </Campo>
            <Campo label="Tipo de cliente">
              <select className="input" value={form.tipo_cliente} onChange={(e) => handleChange("tipo_cliente", e.target.value)}>
                <option value="">Seleccionar</option>
                <option>Minorista</option>
                <option>Mayorista</option>
              </select>
            </Campo>
            <Campo label="Talla">
              <input className="input" value={form.talla} onChange={(e) => handleChange("talla", e.target.value)} placeholder="M, 32..." />
            </Campo>
            <Campo label="Estilo">
              <input className="input" value={form.estilo} onChange={(e) => handleChange("estilo", e.target.value)} placeholder="Casual, formal..." />
            </Campo>
            <Campo label="Departamento">
              <select className="input" value={form.departamento} onChange={(e) => handleChange("departamento", e.target.value)}>
                <option value="">Seleccionar</option>
                {DEPARTAMENTOS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Campo>
            <Campo label="Distrito">
              <select
                className="input"
                value={form.distrito}
                onChange={(e) => handleChange("distrito", e.target.value)}
                disabled={!form.departamento}
              >
                <option value="">{form.departamento ? "Seleccionar" : "Elige un departamento primero"}</option>
                {distritosDisponibles.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Campo>
            <Campo label="Tienda *">
              {perfil.rol === "tienda" ? (
                <input className="input bg-gray-100" value={form.tienda} disabled />
              ) : (
                <select className="input" value={form.tienda} onChange={(e) => handleChange("tienda", e.target.value)}>
                  <option value="">Seleccionar</option>
                  {TIENDAS.map((t) => <option key={t}>{t}</option>)}
                </select>
              )}
            </Campo>
            <Campo label="Asesora">
              <input className="input" value={form.asesora} onChange={(e) => handleChange("asesora", e.target.value)} placeholder="Johana" />
            </Campo>
            <Campo label="Observaciones" full>
              <textarea className="input min-h-[70px]" value={form.observaciones} onChange={(e) => handleChange("observaciones", e.target.value)} placeholder="Preferencias, notas de venta..." />
            </Campo>
          </div>

          {msg && <p className="text-sm mt-4 text-wine">{msg}</p>}

          <div className="flex gap-3 mt-6">
            <button type="submit" disabled={saving} className="bg-wine text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50">
              {saving ? "Guardando..." : editingId ? "Actualizar cliente" : "Guardar cliente"}
            </button>
            <button type="button" onClick={cancelarEdicion} className="border border-gray-300 text-gray-600 px-6 py-3 rounded-xl font-medium">
              Limpiar
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-3 mb-4">
          <input
            className="input bg-white flex-1 min-w-[220px]"
            placeholder="Buscar por nombre, teléfono, distrito o DNI..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {perfil.rol === "admin" && (
            <select className="input bg-white w-48" value={filtroTienda} onChange={(e) => setFiltroTienda(e.target.value)}>
              <option value="">Todas las tiendas</option>
              {TIENDAS.map((t) => <option key={t}>{t}</option>)}
            </select>
          )}
          <button
            onClick={exportarExcel}
            className="flex items-center gap-2 bg-[#1D6F42] text-white px-4 py-2 rounded-xl font-medium hover:opacity-90"
          >
            <IconoExcel />
            Exportar a Excel
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
          {loading ? (
            <p className="p-8 text-center text-gray-400">Cargando clientes...</p>
          ) : filtrados.length === 0 ? (
            <p className="p-8 text-center text-gray-400">Sin resultados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-ink text-white text-left">
                <tr>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">DNI</th>
                  <th className="p-3">Teléfono</th>
                  <th className="p-3">Distrito</th>
                  <th className="p-3">Talla</th>
                  {perfil.rol === "admin" && <th className="p-3">Tienda</th>}
                  <th className="p-3">Asesora</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3">{c.nombre}</td>
                    <td className="p-3">{c.dni_ruc || "—"}</td>
                    <td className="p-3">{c.telefono}</td>
                    <td className="p-3">{c.distrito || "—"}</td>
                    <td className="p-3">{c.talla || "—"}</td>
                    {perfil.rol === "admin" && <td className="p-3">{c.tienda || "—"}</td>}
                    <td className="p-3">{c.asesora || "—"}</td>
                    <td className="p-3 text-right space-x-3 whitespace-nowrap">
                      <button onClick={() => editar(c)} className="text-wine font-medium">Editar</button>
                      <button onClick={() => eliminar(c)} className="text-gray-400 font-medium">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

function Campo({ label, children, full }) {
  return (
    <div className={`flex flex-col gap-1 ${full ? "md:col-span-2" : ""}`}>
      <label className="text-xs font-semibold uppercase text-gray-400">{label}</label>
      {children}
    </div>
  );
}

function IconoExcel() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="3" fill="white" fillOpacity="0.15" />
      <path d="M7 7l4 5-4 5M13 7h4M13 12h4M13 17h4" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
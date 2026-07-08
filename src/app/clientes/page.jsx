"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const emptyForm = {
  nombre: "",
  dni_ruc: "",
  telefono: "",
  fecha_nacimiento: "",
  genero: "",
  tipo_cliente: "",
  talla: "",
  estilo: "",
  distrito: "",
  asesora: "",
  ultima_compra: "",
  observaciones: "",
};

export default function ClientesPage() {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    cargarClientes();
  }, []);

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
    setForm((f) => ({ ...f, [campo]: valor }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!form.nombre || !form.telefono || !form.fecha_nacimiento) {
      setMsg("Completa nombre, teléfono y fecha de nacimiento.");
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
      setForm(emptyForm);
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
    setForm(emptyForm);
    setEditingId(null);
    setMsg("");
  };

  const eliminar = async (c) => {
    if (!confirm(`¿Eliminar a ${c.nombre}? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("clientes").delete().eq("id", c.id);
    if (!error) cargarClientes();
  };

  const filtrados = clientes.filter((c) =>
    [c.nombre, c.telefono, c.dni_ruc, c.distrito]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase())
  );

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
            <Campo label="Teléfono (WhatsApp) *">
              <input className="input" value={form.telefono} onChange={(e) => handleChange("telefono", e.target.value)} placeholder="999 999 999" />
            </Campo>
            <Campo label="DNI / RUC">
              <input className="input" value={form.dni_ruc} onChange={(e) => handleChange("dni_ruc", e.target.value)} placeholder="12345678" />
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
            <Campo label="Distrito">
              <input className="input" value={form.distrito} onChange={(e) => handleChange("distrito", e.target.value)} placeholder="San Juan de Lurigancho" />
            </Campo>
            <Campo label="Asesora">
              <input className="input" value={form.asesora} onChange={(e) => handleChange("asesora", e.target.value)} placeholder="Johana" />
            </Campo>
            <Campo label="Última compra">
              <input type="date" className="input" value={form.ultima_compra} onChange={(e) => handleChange("ultima_compra", e.target.value)} />
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

        <input
          className="input mb-4 bg-white"
          placeholder="Buscar por nombre, teléfono, distrito o DNI..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <p className="p-8 text-center text-gray-400">Cargando clientes...</p>
          ) : filtrados.length === 0 ? (
            <p className="p-8 text-center text-gray-400">Sin resultados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-ink text-white text-left">
                <tr>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Teléfono</th>
                  <th className="p-3">Distrito</th>
                  <th className="p-3">Talla</th>
                  <th className="p-3">Asesora</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3">{c.nombre}</td>
                    <td className="p-3">{c.telefono}</td>
                    <td className="p-3">{c.distrito || "—"}</td>
                    <td className="p-3">{c.talla || "—"}</td>
                    <td className="p-3">{c.asesora || "—"}</td>
                    <td className="p-3 text-right space-x-3">
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

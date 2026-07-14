"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth-helpers";

export default function Dashboard() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const resultado = await requireSession(router);
      if (!resultado) return;
      setPerfil(resultado.perfil);
      cargar();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const cargar = async () => {
    const { data, error } = await supabase
      .from("vista_cumpleanos")
      .select("*")
      .order("dias_faltantes", { ascending: true });
    if (!error) setClientes(data || []);
    setLoading(false);
  };

  const anioActual = new Date().getFullYear();

  const marcarTarea = async (cliente, campo) => {
    const yaHecho = cliente[campo] === anioActual;
    const nuevoValor = yaHecho ? null : anioActual;
    const { error } = await supabase.from("clientes").update({ [campo]: nuevoValor }).eq("id", cliente.id);
    if (!error) cargar();
  };

  const hoy = clientes.filter((c) => c.dias_faltantes === 0);
  const semana = clientes.filter((c) => c.dias_faltantes > 0 && c.dias_faltantes <= 7);

  const waLink = (c, esHoy) => {
    const digits = (c.telefono || "").replace(/\D/g, "");
    const texto = esHoy
      ? `Hola ${c.nombre}, ¡feliz cumpleaños de nuestra parte! 🎉 Tienes 10% de descuento toda esta semana.`
      : `Hola ${c.nombre}, ¡pronto es tu cumpleaños! 🎂 Te esperamos con un descuento especial.`;
    return `https://wa.me/51${digits}?text=${encodeURIComponent(texto)}`;
  };

  if (!perfil) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F3F1EC]">
        <p className="text-gray-400">Cargando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F3F1EC] p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-sm text-gray-500 hover:text-ink">← Inicio</Link>
        <h1 className="text-3xl font-bold mt-2 mb-6 text-ink">Cumpleaños</h1>

        {loading ? (
          <p className="text-gray-400">Cargando...</p>
        ) : clientes.length === 0 ? (
          <p className="text-gray-400">Aún no hay clientes con fecha de nacimiento registrada.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              <Stat label="Cumplen hoy" valor={hoy.length} />
              <Stat label="Próximos 7 días" valor={semana.length} />
            </div>

            <Bloque
              titulo="Hoy"
              lista={hoy}
              waLink={waLink}
              vacio="Nadie cumple años hoy."
              esHoy
              tarea="saludo_cumple_anio"
              tareaLabel="Carta de cumpleaños enviada"
              anioActual={anioActual}
              marcarTarea={marcarTarea}
              mostrarTienda={perfil.rol === "admin"}
            />
            <Bloque
              titulo="Próximos 7 días"
              lista={semana}
              waLink={waLink}
              vacio="Sin cumpleaños esta semana."
              tarea="promo_enviada_anio"
              tareaLabel="Tarjeta de invitación y descuento enviada"
              anioActual={anioActual}
              marcarTarea={marcarTarea}
              mostrarTienda={perfil.rol === "admin"}
            />
          </>
        )}
      </div>
    </main>
  );
}

function Stat({ label, valor }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="text-3xl font-bold text-wine">{valor}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function Bloque({ titulo, lista, waLink, vacio, esHoy, tarea, tareaLabel, anioActual, marcarTarea, mostrarTienda }) {
  return (
    <div className="mb-10">
      <h2 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-3">{titulo}</h2>
      {lista.length === 0 ? (
        <p className="text-sm text-gray-400">{vacio}</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {lista.map((c) => {
            const hecho = c[tarea] === anioActual;
            return (
              <div key={c.id} className={`rounded-xl p-4 w-60 shadow-sm ${esHoy ? "bg-wine text-white" : "bg-white"}`}>
                <div className="font-semibold">{c.nombre}</div>
                <div className={`text-xs mt-1 ${esHoy ? "text-white/80" : "text-gray-400"}`}>
                  {c.asesora || "Sin asesora"} · {c.distrito || "—"}
                  {mostrarTienda && c.tienda ? ` · ${c.tienda}` : ""}
                </div>
                <div className="text-xs font-medium mt-2">
                  {esHoy ? "Cumple hoy" : `Faltan ${c.dias_faltantes} días`}
                </div>
                <a
                  href={waLink(c, esHoy)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-block text-xs font-semibold mt-3 underline ${esHoy ? "text-white" : "text-wine"}`}
                >
                  Enviar WhatsApp →
                </a>

                <label className={`flex items-center gap-2 mt-3 pt-3 border-t text-xs cursor-pointer ${esHoy ? "border-white/20" : "border-gray-100"}`}>
                  <input
                    type="checkbox"
                    checked={hecho}
                    onChange={() => marcarTarea(c, tarea)}
                    className="accent-brass w-4 h-4"
                  />
                  <span className={hecho ? "line-through opacity-70" : ""}>{tareaLabel}</span>
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
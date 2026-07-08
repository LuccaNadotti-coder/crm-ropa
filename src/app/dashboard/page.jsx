"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    const { data, error } = await supabase
      .from("vista_cumpleanos")
      .select("*")
      .order("dias_faltantes", { ascending: true });
    if (!error) setClientes(data || []);
    setLoading(false);
  };

  const hoy = clientes.filter((c) => c.dias_faltantes === 0);
  const semana = clientes.filter((c) => c.dias_faltantes > 0 && c.dias_faltantes <= 7);
  const mes = clientes.filter((c) => c.dias_faltantes <= 30);

  const waLink = (c, esHoy) => {
    const digits = (c.telefono || "").replace(/\D/g, "");
    const texto = esHoy
      ? `Hola ${c.nombre}, ¡feliz cumpleaños de nuestra parte! 🎉 Tienes 10% de descuento toda esta semana.`
      : `Hola ${c.nombre}, ¡pronto es tu cumpleaños! 🎂 Te esperamos con un descuento especial.`;
    return `https://wa.me/51${digits}?text=${encodeURIComponent(texto)}`;
  };

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <Stat label="Cumplen hoy" valor={hoy.length} />
              <Stat label="Próximos 7 días" valor={semana.length} />
              <Stat label="Próximos 30 días" valor={mes.length} />
            </div>

            <Bloque titulo="Hoy" lista={hoy} waLink={waLink} vacio="Nadie cumple años hoy." />
            <Bloque titulo="Próximos 7 días" lista={semana} waLink={waLink} vacio="Sin cumpleaños esta semana." />
            <Bloque titulo="Próximos 30 días" lista={mes} waLink={waLink} vacio="Sin cumpleaños este mes." />
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

function Bloque({ titulo, lista, waLink, vacio }) {
  return (
    <div className="mb-10">
      <h2 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-3">{titulo}</h2>
      {lista.length === 0 ? (
        <p className="text-sm text-gray-400">{vacio}</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {lista.map((c) => (
            <div key={c.id} className={`rounded-xl p-4 w-56 shadow-sm ${c.dias_faltantes === 0 ? "bg-wine text-white" : "bg-white"}`}>
              <div className="font-semibold">{c.nombre}</div>
              <div className={`text-xs mt-1 ${c.dias_faltantes === 0 ? "text-white/80" : "text-gray-400"}`}>
                {c.asesora || "Sin asesora"} · {c.distrito || "—"}
              </div>
              <div className="text-xs font-medium mt-2">
                {c.dias_faltantes === 0 ? "Cumple hoy" : `Faltan ${c.dias_faltantes} días`}
              </div>
              <a
                href={waLink(c, c.dias_faltantes === 0)}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-block text-xs font-semibold mt-3 underline ${c.dias_faltantes === 0 ? "text-white" : "text-wine"}`}
              >
                Enviar WhatsApp →
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

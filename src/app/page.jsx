"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { requireSession, cerrarSesion } from "@/lib/auth-helpers";

export default function Home() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      const resultado = await requireSession(router);
      if (resultado) setPerfil(resultado.perfil);
      setCargando(false);
    })();
  }, [router]);

  if (cargando) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F3F1EC]">
        <p className="text-gray-400">Cargando...</p>
      </main>
    );
  }

  if (!perfil) return null; // ya fue redirigido a /login

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F3F1EC] p-6">
      <div className="bg-white p-10 rounded-2xl shadow-md text-center max-w-md w-full">
        <h1 className="text-3xl font-bold mb-1 text-ink">SFIDA - INVESTOR CRM</h1>
        <p className="mb-1 text-gray-500">
          {perfil.rol === "admin" ? "Cuenta administradora — ves todas las tiendas" : `Tienda: ${perfil.tienda}`}
        </p>
        <p className="mb-8 text-xs text-gray-400">{perfil.nombre}</p>

        <div className="flex flex-col gap-3">
          <Link href="/clientes" className="bg-ink text-white px-5 py-3 rounded-xl font-medium hover:opacity-90">
            Registrar / ver clientes
          </Link>
          <Link href="/dashboard" className="bg-wine text-white px-5 py-3 rounded-xl font-medium hover:opacity-90">
            Ver cumpleaños
          </Link>
          <button
            onClick={() => cerrarSesion(router)}
            className="text-sm text-gray-400 mt-2 hover:text-ink"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </main>
  );
}
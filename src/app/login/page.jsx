"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Campo, IconoAlerta } from "@/components/ui";

function FormularioLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState(params.get("error") === "sin-perfil"
    ? "Tu usuario existe pero no tiene un perfil asignado. Pídele al administrador que te asigne una tienda."
    : "");
  const [cargando, setCargando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setCargando(false);
    if (error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    router.push("/");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-arena p-5">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink">SFIDA</h1>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Investor CRM</p>
        </div>

        <form onSubmit={entrar} className="carta space-y-4 p-7">
          <div>
            <h2 className="text-lg font-bold text-ink">Iniciar sesión</h2>
            <p className="text-sm text-ink-mute">Ingresa con la cuenta de tu tienda.</p>
          </div>

          <Campo label="Correo">
            <input
              type="email" required autoComplete="username" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input" placeholder="tienda@sfida.com"
            />
          </Campo>

          <Campo label="Contraseña">
            <div className="relative">
              <input
                type={verClave ? "text" : "password"} required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="input pr-16" placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setVerClave((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-semibold text-ink-mute hover:bg-cream"
              >
                {verClave ? "Ocultar" : "Ver"}
              </button>
            </div>
          </Campo>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-wine-soft px-3 py-2.5 text-sm text-wine-dark">
              <span className="mt-0.5 shrink-0"><IconoAlerta size={16} /></span>
              <p>{error}</p>
            </div>
          )}

          <button type="submit" disabled={cargando} className="btn-primario w-full">
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-ink-faint">
          ¿Problemas para entrar? Contacta al administrador.
        </p>
      </div>
    </main>
  );
}

export default function PaginaLogin() {
  return (
    <Suspense fallback={null}>
      <FormularioLogin />
    </Suspense>
  );
}

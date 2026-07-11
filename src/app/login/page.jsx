"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }

    router.push("/");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F3F1EC] p-6">
      <form onSubmit={entrar} className="bg-white p-10 rounded-2xl shadow-md max-w-sm w-full">
        <h1 className="text-2xl font-bold text-ink mb-1">CRM Ropa</h1>
        <p className="text-gray-500 text-sm mb-6">Ingresa con tu cuenta de tienda.</p>

        <label className="text-xs font-semibold uppercase text-gray-400">Correo</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input mb-4 mt-1"
          placeholder="tienda1@tuempresa.com"
        />

        <label className="text-xs font-semibold uppercase text-gray-400">Contraseña</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input mb-4 mt-1"
          placeholder="••••••••"
        />

        {error && <p className="text-sm text-wine mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-ink text-white w-full py-3 rounded-xl font-medium disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>

        <style jsx global>{`
          .input {
            display: block;
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
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

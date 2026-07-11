"use client";

import { supabase } from "./supabase";

/**
 * Revisa si hay una sesión activa y carga el perfil (rol + tienda) del usuario.
 * Si no hay sesión, redirige a /login y devuelve null.
 */
export async function requireSession(router) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    router.push("/login");
    return null;
  }

  const { data: perfil, error } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error || !perfil) {
    // El usuario existe en Authentication pero no tiene fila en "perfiles" todavía.
    router.push("/login?error=sin-perfil");
    return null;
  }

  return { session, perfil };
}

export async function cerrarSesion(router) {
  await supabase.auth.signOut();
  router.push("/login");
}

"use client";

// Supabase/PostgREST devuelve como máximo 1000 filas por petición y lo hace en
// silencio: no avisa que cortó el resultado. El administrador ve TODAS las
// tiendas, así que es el único que supera ese tope y el que recibía datos
// incompletos. Estas utilidades traen el total en páginas y avisan si algo falla.

const TAMANO_PAGINA = 1000;

/**
 * Trae todas las filas de una consulta, página por página.
 * @param {() => import("@supabase/supabase-js").PostgrestFilterBuilder} construirQuery
 *   Función que devuelve una consulta NUEVA en cada llamada (no reutilizar el builder).
 */
export async function traerTodas(construirQuery) {
  const filas = [];
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await construirQuery().range(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw error;
    filas.push(...(data || []));
    if (!data || data.length < TAMANO_PAGINA) return filas;
  }
}

/**
 * Parte una lista en lotes. Necesario para los filtros .in(): los ids viajan en
 * la URL y con muchos clientes la petición se pasa del largo máximo y falla.
 */
export function enLotes(lista, tamano = 200) {
  const lotes = [];
  for (let i = 0; i < lista.length; i += tamano) lotes.push(lista.slice(i, i + tamano));
  return lotes;
}

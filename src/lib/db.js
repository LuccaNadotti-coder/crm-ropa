"use client";

// Dos límites de Supabase/PostgREST que fallan en silencio y que solo golpean
// al administrador, porque es el único que carga las cinco tiendas juntas:
//
// 1) El filtro .in() viaja en la URL. Con 707 clientes la URL llega a ~26.000
//    caracteres y el servidor responde 400 Bad Request; la consulta entera se
//    pierde. Medido contra este proyecto: 600 ids (22.311 chars) pasa,
//    707 ids (26.270 chars) falla. Por eso enLotes() parte la lista en grupos.
//
// 2) Cada petición devuelve como máximo 1000 filas y corta el resto sin avisar.
//    Hoy no se llega (707 clientes), pero falta poco: traerTodas() lo previene.

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
 * Si una columna existe todavía en la base.
 *
 * Sirve para las columnas que llegan con una migración que quizá no se corrió:
 * la pantalla esconde el campo en vez de romperse al guardar. Se consulta una
 * sola vez por columna.
 */
const columnas = {};
export function existeColumna(tabla, columna, cliente) {
  const clave = `${tabla}.${columna}`;
  if (!columnas[clave]) {
    columnas[clave] = cliente
      .from(tabla)
      .select(columna)
      .limit(1)
      .then(({ error }) => !error);
  }
  return columnas[clave];
}

/**
 * Parte una lista en lotes para los filtros .in().
 * 200 ids son unos 7.500 caracteres de URL: muy por debajo del límite.
 */
export function enLotes(lista, tamano = 200) {
  const lotes = [];
  for (let i = 0; i < lista.length; i += tamano) lotes.push(lista.slice(i, i + tamano));
  return lotes;
}

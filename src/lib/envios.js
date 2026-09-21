"use client";

import { supabase } from "./supabase";
import { traerTodas } from "./db";

/**
 * Tope de WhatsApp por día y por número de tienda.
 *
 * WhatsApp no banea por escribir mucho, sino porque mucha gente te bloquee o
 * te reporte en poco tiempo. Repartir los envíos en varios días es lo que
 * baja ese riesgo. Con ~118 clientes por tienda, 40 al día cubre toda la
 * cartera en tres días.
 */
export const TOPE_DIARIO = 40;

/**
 * De dónde salió cada WhatsApp. Se guarda en la columna "origen" y es lo que
 * después separa los reportes.
 *
 * CUMPLE_ANTIGUO es el valor que se usaba antes de separar saludo y cupón: en
 * esas filas no se puede saber cuál de los dos se mandó, así que los reportes
 * las muestran aparte en vez de sumarlas a uno de los dos.
 */
export const ORIGEN = {
  CAMPANA: "campana",
  CATALOGO: "catalogo",
  CUMPLE_SALUDO: "cumpleanos_saludo",
  CUMPLE_CUPON: "cumpleanos_cupon",
  CUMPLE_ANTIGUO: "cumpleanos",
};

/**
 * Fecha de hoy en Lima, como "YYYY-MM-DD".
 * No se usa new Date().toISOString() porque eso da UTC: todo lo enviado
 * después de las 7 pm contaría para el día siguiente.
 */
export function fechaHoyLima() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Cuántos WhatsApp se abrieron hoy, agrupados por tienda.
 * @returns {Promise<Record<string, number>>}
 */
export async function enviosDeHoyPorTienda() {
  const filas = await traerTodas(() =>
    supabase
      .from("envios_whatsapp")
      .select("tienda")
      .eq("fecha", fechaHoyLima())
      .order("tienda")
  );
  const conteo = {};
  filas.forEach((f) => { conteo[f.tienda] = (conteo[f.tienda] || 0) + 1; });
  return conteo;
}

/**
 * Deja constancia de un WhatsApp abierto desde el CRM.
 *
 * Se cuenta contra la tienda DEL CLIENTE, porque el supuesto es que cada
 * tienda escribe desde su propio número. Si el administrador escribe desde
 * su teléfono personal, el conteo queda atribuido igual a la tienda.
 *
 * Nunca lanza: si falla el registro no tiene sentido interrumpir al usuario,
 * que ya abrió la conversación. Devuelve false para poder avisar.
 */
export async function registrarEnvio(cliente, origen = ORIGEN.CAMPANA) {
  const fila = {
    cliente_id: cliente.id,
    tienda: cliente.tienda || "Sin tienda",
    origen,
  };

  // La fecha se manda desde acá a propósito. Si se deja que la ponga la base,
  // Postgres usa SU reloj, que está en UTC: todo lo enviado en Lima después de
  // las 7 pm quedaba anotado al día siguiente y el reporte del mes no cuadraba
  // con lo que la tienda recordaba haber mandado.
  const { error } = await supabase
    .from("envios_whatsapp")
    .insert([{ ...fila, fecha: fechaHoyLima() }]);
  if (!error) return true;

  // Si la base no deja escribir esa columna (por ejemplo, porque la calcula
  // ella sola), se reintenta sin la fecha. Vale más un envío anotado con el
  // día corrido que un envío que no queda anotado en ninguna parte: el tope
  // diario de WhatsApp depende de esto.
  const reintento = await supabase.from("envios_whatsapp").insert([fila]);
  return !reintento.error;
}

/**
 * Todos los WhatsApp abiertos entre dos fechas, para los reportes.
 * Las fechas van como "YYYY-MM-DD" y los dos extremos se incluyen.
 */
export async function enviosEntre(desde, hasta) {
  return traerTodas(() =>
    supabase
      .from("envios_whatsapp")
      .select("cliente_id, tienda, origen, fecha")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha")
      .order("cliente_id")
  );
}

/** Cuántos le quedan hoy a esa tienda. */
export function restantesHoy(conteo, tienda) {
  return Math.max(0, TOPE_DIARIO - (conteo[tienda] || 0));
}

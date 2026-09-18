"use client";

import { supabase } from "./supabase";

/**
 * El archivo que acompaña a las campañas: una imagen o un PDF, uno solo para
 * todas las tiendas.
 *
 * WhatsApp no deja que un enlace lleve un archivo adjunto. Para una imagen se
 * puede copiar al portapapeles y pegarla (es lo que hace la tarjeta de
 * cumpleaños), pero un PDF no se pega y en el celular tampoco. Así que el
 * archivo se sube UNA VEZ al CRM y en el mensaje va su enlace.
 *
 * El archivo vive en el bucket "campanas" de Supabase Storage, público para
 * leer y escribible solo por el administrador (ver
 * supabase-migracion-v6-adjunto-campanas.sql). Se guarda siempre con el
 * prefijo "adjunto-" y un número de tiempo: al subir uno nuevo se borran los
 * anteriores, así que nunca hay dos archivos vigentes.
 */

const BUCKET = "campanas";
const PREFIJO = "adjunto-";

/** Ruta corta que se manda en el mensaje; redirige al archivo de verdad. */
export const RUTA_CORTA = "/a/campana";

export const TIPOS_ACEPTADOS = "image/jpeg,image/png,image/webp,application/pdf";
export const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MB

function extensionDe(archivo) {
  const porNombre = (archivo.name || "").split(".").pop()?.toLowerCase();
  if (porNombre && porNombre.length <= 5) return porNombre;
  return archivo.type === "application/pdf" ? "pdf" : "jpg";
}

/** URL pública del archivo, la larga de Supabase. */
export function urlDe(ruta) {
  return supabase.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
}

/** El enlace que se ve en el mensaje, ya con el dominio del CRM. */
export function enlaceCorto() {
  if (typeof window === "undefined") return RUTA_CORTA;
  return `${window.location.origin}${RUTA_CORTA}`;
}

/**
 * El archivo vigente, o null si todavía no subieron ninguno.
 * No lanza: si el bucket no existe (falta correr la migración) devuelve null
 * para que la pantalla siga funcionando sin adjunto.
 */
export async function adjuntoActual() {
  const { data, error } = await supabase.storage.from(BUCKET).list("", {
    limit: 100,
    sortBy: { column: "name", order: "desc" },
  });
  if (error || !data) return null;

  const vigente = data.filter((f) => f.name.startsWith(PREFIJO))[0];
  if (!vigente) return null;

  return {
    ruta: vigente.name,
    nombre: vigente.name.replace(/^adjunto-\d+-/, ""),
    esPdf: vigente.name.toLowerCase().endsWith(".pdf"),
    tamano: vigente.metadata?.size ?? null,
    url: urlDe(vigente.name),
  };
}

/** Sube el archivo y borra el anterior. Devuelve el adjunto nuevo. */
export async function subirAdjunto(archivo) {
  if (!archivo) throw new Error("No se eligió ningún archivo.");
  if (archivo.size > TAMANO_MAXIMO) {
    throw new Error("El archivo pesa más de 10 MB. Compártelo más liviano para que cargue rápido en el celular.");
  }
  const tipoOk = archivo.type === "application/pdf" || archivo.type.startsWith("image/");
  if (!tipoOk) throw new Error("Solo se puede subir una imagen o un PDF.");

  // El nombre original viaja en la ruta para que se reconozca en el listado,
  // limpio de espacios y acentos porque forma parte de una URL.
  const limpio = (archivo.name || "archivo")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-60);
  const ruta = `${PREFIJO}${Date.now()}-${limpio || `archivo.${extensionDe(archivo)}`}`;

  const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, {
    contentType: archivo.type,
    cacheControl: "60",
    upsert: false,
  });
  if (error) throw error;

  await borrarOtros(ruta);
  return {
    ruta,
    nombre: archivo.name,
    esPdf: archivo.type === "application/pdf",
    tamano: archivo.size,
    url: urlDe(ruta),
  };
}

/** Borra todos los adjuntos menos el que se indique. */
async function borrarOtros(conservar) {
  const { data } = await supabase.storage.from(BUCKET).list("", { limit: 100 });
  const sobrantes = (data || [])
    .filter((f) => f.name.startsWith(PREFIJO) && f.name !== conservar)
    .map((f) => f.name);
  if (sobrantes.length > 0) await supabase.storage.from(BUCKET).remove(sobrantes);
}

/** Deja la campaña sin archivo. */
export async function quitarAdjunto() {
  const { data } = await supabase.storage.from(BUCKET).list("", { limit: 100 });
  const todos = (data || []).filter((f) => f.name.startsWith(PREFIJO)).map((f) => f.name);
  if (todos.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(todos);
  if (error) throw error;
}

/* ------------------------------------------------ Imagen para el portapapeles */

let cachePegable = { ruta: null, blob: null };

/**
 * La imagen lista para pegar con Ctrl+V en el chat.
 *
 * Los navegadores solo aceptan PNG en el portapapeles, así que un JPG se
 * vuelve a dibujar en un lienzo y se guarda como PNG. Se hace una sola vez y
 * queda en memoria: en una campaña de 40 clientes se copia 40 veces la misma.
 *
 * Devuelve null si el adjunto es un PDF o si la imagen no se pudo leer.
 */
export async function imagenParaPegar(adjunto) {
  if (!adjunto || adjunto.esPdf) return null;
  if (cachePegable.ruta === adjunto.ruta) return cachePegable.blob;

  try {
    const respuesta = await fetch(adjunto.url, { cache: "force-cache" });
    if (!respuesta.ok) return null;
    const original = await respuesta.blob();
    const png = original.type === "image/png" ? original : await aPng(original);
    cachePegable = { ruta: adjunto.ruta, blob: png };
    return png;
  } catch {
    return null;
  }
}

function aPng(blob) {
  return new Promise((resolver) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const lienzo = document.createElement("canvas");
      lienzo.width = img.naturalWidth;
      lienzo.height = img.naturalHeight;
      lienzo.getContext("2d").drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      lienzo.toBlob(resolver, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolver(null); };
    img.src = url;
  });
}

/** "2,4 MB" a partir de los bytes. */
export function pesoLegible(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

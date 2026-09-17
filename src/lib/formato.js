// Helpers de texto y fechas usados en toda la app.

/** Quita tabulaciones, espacios al inicio/fin y espacios dobles internos. */
export function normalizarTexto(v) {
  if (v == null) return "";
  return String(v).replace(/[\t\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

/** Igual que normalizarTexto pero devuelve null si queda vacío (para columnas opcionales). */
export function normalizarOpcional(v) {
  const limpio = normalizarTexto(v);
  return limpio === "" ? null : limpio;
}

/** Para buscar: minúsculas y sin tildes, de modo que "MARIA" encuentre "María". */
export function paraBuscar(v) {
  return normalizarTexto(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export const soloNumeros = (v) => String(v || "").replace(/\D/g, "");

/** Permite letras, espacios y tildes; se guarda en mayúsculas como venía haciendo la app. */
export const soloLetras = (v) =>
  String(v || "").toUpperCase().replace(/[^A-ZÁÉÍÓÚÑÜ\s]/g, "").replace(/\s{2,}/g, " ");

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];

/**
 * Formatea "1990-04-23" como "23 Abr 1990".
 * Se parte el string a mano porque new Date("1990-04-23") lo interpreta en UTC
 * y en Perú (UTC-5) mostraría el día anterior.
 */
export function fechaCorta(iso) {
  if (!iso) return "—";
  const [a, m, d] = String(iso).slice(0, 10).split("-");
  if (!a || !m || !d) return "—";
  return `${Number(d)} ${MESES_CORTOS[Number(m) - 1]} ${a}`;
}

/** "23 de abril" — para mostrar cumpleaños sin el año. */
export function diaYMes(iso) {
  if (!iso) return "—";
  const [, m, d] = String(iso).slice(0, 10).split("-");
  if (!m || !d) return "—";
  return `${Number(d)} ${MESES_CORTOS[Number(m) - 1]}`;
}

export function edadDesde(iso) {
  if (!iso) return null;
  const [a, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!a) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - a;
  const cumpleEsteAnio = new Date(hoy.getFullYear(), m - 1, d);
  if (hoy < cumpleEsteAnio) edad--;
  return edad >= 0 && edad < 130 ? edad : null;
}

/**
 * "buenos días" / "buenas tardes" / "buenas noches" según la hora de quien
 * escribe. Los cortes son los de uso corriente en Perú: la tarde empieza al
 * mediodía y la noche a las 7.
 */
export function saludoDelDia(fecha = new Date()) {
  const hora = fecha.getHours();
  if (hora < 12) return "buenos días";
  if (hora < 19) return "buenas tardes";
  return "buenas noches";
}

/** Tiempo relativo en español: "hoy", "hace 3 días", "hace 2 meses". */
export function haceCuanto(iso) {
  if (!iso) return null;
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (dias < 0) return "hoy";
  if (dias === 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  if (meses === 1) return "hace 1 mes";
  if (meses < 12) return `hace ${meses} meses`;
  const anios = Math.floor(meses / 12);
  return anios === 1 ? "hace 1 año" : `hace ${anios} años`;
}

/** Iniciales para el avatar: "MARIA PEREZ LOPEZ" -> "MP". */
export function iniciales(nombre) {
  const partes = normalizarTexto(nombre).split(" ").filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

/**
 * Color estable a partir del nombre, para que cada avatar sea siempre igual.
 * Los cinco tonos llevan texto blanco encima y todos pasan 4.5:1.
 */
export function colorAvatar(nombre) {
  const paleta = ["bg-wine", "bg-brass-deep", "bg-ink-soft", "bg-exito", "bg-alerta"];
  let suma = 0;
  for (const ch of normalizarTexto(nombre)) suma += ch.charCodeAt(0);
  return paleta[suma % paleta.length];
}

/**
 * Un celular peruano son 9 dígitos y empieza en 9. Los fijos (7-8 dígitos) no
 * reciben WhatsApp, y en la base hay números pegados de 17 dígitos y rellenos
 * tipo 999999999 que generaban enlaces rotos.
 */
export function telefonoEsValido(telefono) {
  const d = soloNumeros(telefono);
  if (d.length === 9) return d.startsWith("9");
  if (d.length === 11 && d.startsWith("51")) return d[2] === "9"; // ya trae el país
  return false;
}

/** Enlace de WhatsApp con prefijo de Perú. Devuelve null si el número no sirve. */
export function enlaceWhatsApp(telefono, texto) {
  if (!telefonoEsValido(telefono)) return null;
  const d = soloNumeros(telefono);
  const conPais = d.length === 9 ? `51${d}` : d;
  return `https://wa.me/${conPais}?text=${encodeURIComponent(texto)}`;
}

/** "987654321" -> "987 654 321" */
export function telefonoLegible(telefono) {
  const d = soloNumeros(telefono);
  if (d.length === 9) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return d || "—";
}

/**
 * Nombre de pila presentable: "MARIA FERNANDA PEREZ" -> "Maria".
 * Los nombres se guardan en mayúsculas, y un WhatsApp que empieza con
 * "Hola MARIA FERNANDA PEREZ LOPEZ" se lee como un grito y como un formulario.
 */
export function nombrePila(nombre) {
  const primero = normalizarTexto(nombre).split(" ").filter(Boolean)[0] || "";
  if (!primero) return "";
  return primero.charAt(0).toUpperCase() + primero.slice(1).toLowerCase();
}

"use client";

/**
 * Tarjeta de cumpleaños personalizada.
 *
 * WhatsApp no deja que un enlace lleve una imagen adjunta: eso no existe ni con
 * wa.me ni con la app de escritorio. Lo más cerca que se puede llegar es dejar
 * la imagen COPIADA en el portapapeles en el mismo clic que abre el chat, para
 * que la persona solo apriete Ctrl+V.
 *
 * Acá se arma esa imagen: se toma el diseño de public/tarjeta-cumpleanos.png,
 * se tapa el nombre de ejemplo con el mismo crema del cupón y se escribe encima
 * el nombre de quien cumple.
 *
 * La plantilla vive en /public (mismo origen), así el canvas no queda "tainted"
 * y toBlob puede exportar la imagen. Si viniera de otro dominio sin CORS, el
 * navegador prohibiría exportarla y todo esto no funcionaría.
 */

export const RUTA_PLANTILLA = "/tarjeta-cumpleanos.png";

/**
 * Calibración del diseño. Todo va en proporción (0 a 1) del ancho y alto de la
 * imagen, para que siga cuadrando si mañana exportan la tarjeta en otro tamaño.
 *
 * Los valores de abajo están puestos para el cupón "¡HOLA, ZULEMA! · 15% OFF".
 * Si cambia el diseño, se ajustan estos números y nada más.
 */
export const DISENO = {
  // Rectángulo que tapa el nombre de ejemplo. Debe cubrir las DOS líneas
  // ("¡HOLA," y "ZULEMA!") con un poco de aire alrededor.
  zona: { x: 0.10, y: 0.175, ancho: 0.80, alto: 0.155 },

  // De dónde se toma el color del cupón. Tiene que caer en una parte de crema
  // limpio: así el parche calza exacto y no hay que adivinar el tono.
  muestra: { x: 0.5, y: 0.13 },

  // Líneas del saludo. y es la base de cada línea.
  linea1: { texto: "¡HOLA,", y: 0.235 },
  linea2: { y: 0.305 }, // acá va el nombre + "!"

  color: "#8E0B24",          // el vino del diseño
  anchoMaximo: 0.74,         // el nombre no pasa de este ancho
  tamanoBase: 0.085,         // alto de letra, en proporción del alto de la hoja
  fuente: '"Playfair Display", Georgia, "Times New Roman", serif',

  // Si algún día exportan la tarjeta SIN el nombre de ejemplo, se pone en false
  // y se dibuja directo, sin parche.
  taparNombre: true,
};

/* ------------------------------------------------------------- Plantilla */

let promesaPlantilla = null;

/** Carga el diseño una sola vez y lo deja en memoria para todos los clientes. */
export function cargarPlantilla() {
  if (promesaPlantilla) return promesaPlantilla;
  promesaPlantilla = new Promise((resolver) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => resolver(null); // todavía no subieron el archivo
    img.src = RUTA_PLANTILLA;
  });
  return promesaPlantilla;
}

/** ¿Está el diseño disponible? Si no, la app sigue funcionando solo con texto. */
export async function hayTarjeta() {
  return (await cargarPlantilla()) !== null;
}

/* ---------------------------------------------------------------- Nombre */

/**
 * De "MARIA FERNANDA PEREZ LOPEZ" saca "MARIA".
 * En la tarjeta solo entra el primer nombre, y es además lo más natural de leer.
 */
export function primerNombre(nombre) {
  const limpio = String(nombre || "").trim().replace(/\s+/g, " ");
  if (!limpio) return "";
  return limpio.split(" ")[0].toUpperCase();
}

/* --------------------------------------------------------------- Dibujo */

function colorDeMuestra(ctx, x, y) {
  const [r, g, b] = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Devuelve la tarjeta de ese cliente como PNG.
 * @returns {Promise<Blob|null>} null si todavía no hay diseño cargado.
 */
export async function generarTarjeta(nombre) {
  const plantilla = await cargarPlantilla();
  if (!plantilla) return null;

  const saludado = primerNombre(nombre);
  if (!saludado) return null;

  const W = plantilla.naturalWidth;
  const H = plantilla.naturalHeight;

  const lienzo = document.createElement("canvas");
  lienzo.width = W;
  lienzo.height = H;
  const ctx = lienzo.getContext("2d");
  ctx.drawImage(plantilla, 0, 0, W, H);

  if (DISENO.taparNombre) {
    ctx.fillStyle = colorDeMuestra(ctx, DISENO.muestra.x * W, DISENO.muestra.y * H);
    ctx.fillRect(
      DISENO.zona.x * W,
      DISENO.zona.y * H,
      DISENO.zona.ancho * W,
      DISENO.zona.alto * H
    );
  }

  ctx.fillStyle = DISENO.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const centro = W / 2;
  let tamano = DISENO.tamanoBase * H;

  // El nombre manda: se achica hasta que entre en el ancho permitido, así
  // "GUADALUPE" no se sale del cupón y "ANA" no queda diminuta.
  const limite = DISENO.anchoMaximo * W;
  const texto2 = `${saludado}!`;
  ctx.font = `${tamano}px ${DISENO.fuente}`;
  while (ctx.measureText(texto2).width > limite && tamano > 12) {
    tamano -= 2;
    ctx.font = `${tamano}px ${DISENO.fuente}`;
  }

  // La primera línea conserva el tamaño original del diseño; solo el nombre se
  // achica cuando hace falta.
  ctx.font = `${DISENO.tamanoBase * H}px ${DISENO.fuente}`;
  ctx.fillText(DISENO.linea1.texto, centro, DISENO.linea1.y * H);

  ctx.font = `${tamano}px ${DISENO.fuente}`;
  ctx.fillText(texto2, centro, DISENO.linea2.y * H);

  return new Promise((resolver) => lienzo.toBlob(resolver, "image/png"));
}

/** Nombre de archivo para cuando se descarga en vez de copiarse. */
export function nombreArchivoTarjeta(nombre) {
  const base = primerNombre(nombre).toLowerCase() || "cliente";
  return `cumple-sfida-${base}.png`;
}

"use client";

/**
 * Tarjeta de cumpleaños personalizada.
 *
 * WhatsApp no deja que un enlace lleve una imagen adjunta: eso no existe ni con
 * wa.me ni con la app de escritorio. Lo más cerca que se puede llegar es dejar
 * la imagen COPIADA en el portapapeles en el mismo clic que abre el chat, para
 * que la persona solo apriete Ctrl+V.
 *
 * Acá se arma esa imagen. Hay dos caminos y el primero que exista gana:
 *
 *   1) Si alguien deja su diseño en public/tarjeta-cumpleanos.png, se usa ese:
 *      se tapa el nombre de ejemplo con el mismo crema del cupón y se escribe
 *      encima el de quien cumple. Sirve para cambiar la promoción sin tocar
 *      código: se reemplaza el archivo y listo.
 *
 *   2) Si no hay archivo, la tarjeta se DIBUJA acá completa. Así el CRM
 *      funciona solo, sin depender de que alguien suba nada.
 *
 * Todo se dibuja en proporciones del lienzo, no en píxeles sueltos, para poder
 * cambiar la resolución en una sola línea.
 */

export const RUTA_PLANTILLA = "/tarjeta-cumpleanos.png";

/** 4:5 es la proporción que WhatsApp muestra sin recortar en el chat. */
const ANCHO = 1080;
const ALTO = 1350;

const COLOR = {
  vino: "#7D0A22",
  vinoTexto: "#95102A",
  crema: "#EDE4E1",
  tinta: "#2C2A28",
  gris: "#5A5550",
  oroClaro: "#E7CF9B",
  oro: "#C9A464",
  oroOscuro: "#A17B38",
};

const SERIF = 'Georgia, "Times New Roman", "Playfair Display", serif';
const SANS = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';

/**
 * Calibración para el camino 1 (diseño propio en /public). Los valores están
 * puestos para el cupón "¡HOLA, ZULEMA! · 15% OFF": si cambia el diseño se
 * ajustan acá y en ningún otro lado.
 */
export const DISENO = {
  zona: { x: 0.10, y: 0.175, ancho: 0.80, alto: 0.155 },
  muestra: { x: 0.5, y: 0.13 },
  linea1: { texto: "¡HOLA,", y: 0.235 },
  linea2: { y: 0.305 },
  color: COLOR.vinoTexto,
  anchoMaximo: 0.74,
  tamanoBase: 0.085,
  fuente: SERIF,
  taparNombre: true,
};

/* ------------------------------------------------------------- Plantilla */

let promesaPlantilla = null;

/** Carga el diseño propio una sola vez, si es que existe. */
export function cargarPlantilla() {
  if (promesaPlantilla) return promesaPlantilla;
  promesaPlantilla = new Promise((resolver) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => resolver(null);
    img.src = RUTA_PLANTILLA;
  });
  return promesaPlantilla;
}

/** Siempre hay tarjeta: si no hay archivo, se dibuja. */
export async function hayTarjeta() {
  return true;
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

/* -------------------------------------------------------------- Utilidades */

/** Baja el tamaño de letra hasta que el texto entre en el ancho dado. */
function ajustarA(ctx, texto, limite, tamanoInicial, fuente, minimo = 12) {
  let tamano = tamanoInicial;
  ctx.font = `${tamano}px ${fuente}`;
  while (ctx.measureText(texto).width > limite && tamano > minimo) {
    tamano -= 2;
    ctx.font = `${tamano}px ${fuente}`;
  }
  return tamano;
}

/** Parte un párrafo en líneas que quepan en el ancho dado. */
function enLineas(ctx, texto, limite) {
  const palabras = texto.split(" ");
  const lineas = [];
  let actual = "";
  for (const palabra of palabras) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > limite && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function textoCentrado(ctx, lineas, x, y, interlineado) {
  lineas.forEach((linea, i) => ctx.fillText(linea, x, y + i * interlineado));
}

/* ------------------------------------------------------- Dibujo del cupón */

/**
 * El borde ondeado del cupón: se pinta el rectángulo crema y después se le
 * muerden semicírculos del color del fondo a lo largo de los cuatro lados.
 * Es la forma barata de conseguir el borde de ticket sin trazar una curva.
 */
function cuponOndeado(ctx, x, y, ancho, alto, radio) {
  ctx.fillStyle = COLOR.crema;
  ctx.fillRect(x, y, ancho, alto);

  ctx.fillStyle = COLOR.vino;
  const muerde = (cx, cy) => {
    ctx.beginPath();
    ctx.arc(cx, cy, radio, 0, Math.PI * 2);
    ctx.fill();
  };

  const paso = radio * 2.5;
  const horizontales = Math.max(2, Math.round(ancho / paso));
  const verticales = Math.max(2, Math.round(alto / paso));

  for (let i = 0; i <= horizontales; i++) {
    const cx = x + (ancho / horizontales) * i;
    muerde(cx, y);
    muerde(cx, y + alto);
  }
  for (let i = 0; i <= verticales; i++) {
    const cy = y + (alto / verticales) * i;
    muerde(x, cy);
    muerde(x + ancho, cy);
  }
}

/** Cinta de raso: banda con degradado y un brillo al centro. */
function cinta(ctx, x1, y1, x2, y2, grosor) {
  const angulo = Math.atan2(y2 - y1, x2 - x1);
  const nx = Math.sin(angulo) * grosor / 2;
  const ny = -Math.cos(angulo) * grosor / 2;

  const grad = ctx.createLinearGradient(x1 + nx, y1 + ny, x1 - nx, y1 - ny);
  grad.addColorStop(0, COLOR.oroOscuro);
  grad.addColorStop(0.35, COLOR.oro);
  grad.addColorStop(0.5, COLOR.oroClaro);
  grad.addColorStop(0.7, COLOR.oro);
  grad.addColorStop(1, COLOR.oroOscuro);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x1 + nx, y1 + ny);
  ctx.lineTo(x2 + nx, y2 + ny);
  ctx.lineTo(x2 - nx, y2 - ny);
  ctx.lineTo(x1 - nx, y1 - ny);
  ctx.closePath();
  ctx.fill();
}

/** Una lazada del moño. `lado` = 1 derecha, -1 izquierda. */
function lazada(ctx, cx, cy, largo, alto, lado) {
  const grad = ctx.createLinearGradient(cx, cy - alto, cx + largo * lado, cy + alto);
  grad.addColorStop(0, COLOR.oroClaro);
  grad.addColorStop(0.45, COLOR.oro);
  grad.addColorStop(1, COLOR.oroOscuro);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.bezierCurveTo(
    cx + largo * 0.45 * lado, cy - alto * 1.15,
    cx + largo * 1.15 * lado, cy - alto * 0.75,
    cx + largo * lado, cy + alto * 0.08
  );
  ctx.bezierCurveTo(
    cx + largo * 0.92 * lado, cy + alto * 0.72,
    cx + largo * 0.34 * lado, cy + alto * 0.5,
    cx, cy
  );
  ctx.closePath();
  ctx.fill();

  // Pliegue interior: lo que hace que se lea como cinta y no como una mancha.
  ctx.fillStyle = "rgba(0,0,0,.16)";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.bezierCurveTo(
    cx + largo * 0.30 * lado, cy - alto * 0.18,
    cx + largo * 0.44 * lado, cy + alto * 0.05,
    cx + largo * 0.36 * lado, cy + alto * 0.30
  );
  ctx.bezierCurveTo(
    cx + largo * 0.22 * lado, cy + alto * 0.22,
    cx + largo * 0.10 * lado, cy + alto * 0.12,
    cx, cy
  );
  ctx.closePath();
  ctx.fill();
}

/** Cola de la cinta, colgando del nudo. */
function cola(ctx, cx, cy, largo, ancho, inclinacion) {
  const grad = ctx.createLinearGradient(cx, cy, cx + inclinacion, cy + largo);
  grad.addColorStop(0, COLOR.oro);
  grad.addColorStop(0.6, COLOR.oroOscuro);
  grad.addColorStop(1, COLOR.oro);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx - ancho / 2, cy);
  ctx.quadraticCurveTo(cx + inclinacion * 0.5, cy + largo * 0.6, cx + inclinacion - ancho * 0.5, cy + largo);
  ctx.lineTo(cx + inclinacion, cy + largo * 0.86);           // muesca de la punta
  ctx.lineTo(cx + inclinacion + ancho * 0.5, cy + largo);
  ctx.quadraticCurveTo(cx + inclinacion * 0.5 + ancho, cy + largo * 0.6, cx + ancho / 2, cy);
  ctx.closePath();
  ctx.fill();
}

/** El moño completo, arriba a la izquierda, como en el diseño original. */
function mono(ctx, W, H) {
  // Las dos bandas que cruzan la esquina.
  cinta(ctx, -W * 0.02, H * 0.16, W * 0.30, -H * 0.03, W * 0.085);
  cinta(ctx, W * 0.02, -H * 0.02, W * 0.26, H * 0.20, W * 0.075);

  const cx = W * 0.155;
  const cy = H * 0.105;

  cola(ctx, cx - W * 0.015, cy + H * 0.01, H * 0.115, W * 0.055, -W * 0.05);
  cola(ctx, cx + W * 0.02, cy + H * 0.012, H * 0.10, W * 0.05, W * 0.035);

  lazada(ctx, cx, cy, W * 0.135, H * 0.055, -1);
  lazada(ctx, cx, cy, W * 0.125, H * 0.052, 1);

  // Nudo.
  const nudo = ctx.createLinearGradient(cx - W * 0.03, cy - H * 0.02, cx + W * 0.03, cy + H * 0.02);
  nudo.addColorStop(0, COLOR.oroOscuro);
  nudo.addColorStop(0.5, COLOR.oroClaro);
  nudo.addColorStop(1, COLOR.oroOscuro);
  ctx.fillStyle = nudo;
  ctx.beginPath();
  ctx.ellipse(cx, cy, W * 0.032, H * 0.022, -0.25, 0, Math.PI * 2);
  ctx.fill();
}

/* ------------------------------------------------------- Tarjeta dibujada */

function dibujarTarjeta(nombre) {
  const saludado = primerNombre(nombre);
  const lienzo = document.createElement("canvas");
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  const ctx = lienzo.getContext("2d");
  const W = ANCHO;
  const H = ALTO;

  // Fondo y cupón.
  ctx.fillStyle = COLOR.vino;
  ctx.fillRect(0, 0, W, H);
  const m = W * 0.062;
  cuponOndeado(ctx, m, H * 0.042, W - m * 2, H * 0.916, W * 0.026);

  mono(ctx, W, H);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const centro = W / 2;

  // Saludo.
  ctx.fillStyle = COLOR.vinoTexto;
  const tamanoSaludo = H * 0.072;
  ctx.font = `${tamanoSaludo}px ${SERIF}`;
  ctx.fillText("¡HOLA,", centro, H * 0.245);
  const tamanoNombre = ajustarA(ctx, `${saludado}!`, W * 0.72, tamanoSaludo, SERIF, 24);
  ctx.font = `${tamanoNombre}px ${SERIF}`;
  ctx.fillText(`${saludado}!`, centro, H * 0.245 + tamanoSaludo * 1.02);

  // Bajada.
  ctx.fillStyle = COLOR.gris;
  ctx.font = `${H * 0.0245}px ${SANS}`;
  textoCentrado(
    ctx,
    enLineas(ctx, "Tu cumpleaños se acerca y queremos empezar a celebrarlo antes. Por eso, te regalamos...", W * 0.72),
    centro,
    H * 0.395,
    H * 0.036
  );

  // El 15% OFF.
  ctx.fillStyle = COLOR.vinoTexto;
  const tamanoCifra = H * 0.275;
  ctx.font = `${tamanoCifra}px ${SERIF}`;
  ctx.textAlign = "right";
  const baseCifra = H * 0.655;
  ctx.fillText("15", centro + W * 0.05, baseCifra);

  ctx.textAlign = "left";
  ctx.font = `${tamanoCifra * 0.46}px ${SERIF}`;
  ctx.fillText("%", centro + W * 0.065, baseCifra - tamanoCifra * 0.42);
  ctx.font = `${tamanoCifra * 0.25}px ${SERIF}`;
  ctx.fillText("OFF", centro + W * 0.078, baseCifra - tamanoCifra * 0.02);

  // Condiciones.
  ctx.textAlign = "center";
  ctx.fillStyle = COLOR.gris;
  ctx.font = `${H * 0.0225}px ${SANS}`;
  textoCentrado(
    ctx,
    enLineas(
      ctx,
      "Puedes usar este cupón durante los 7 días previos a tu cumpleaños y el mismo día, tanto en tiendas físicas como online. Solo necesitas mostrar tu DNI.",
      W * 0.70
    ),
    centro,
    H * 0.755,
    H * 0.033
  );

  // Marca.
  ctx.fillStyle = COLOR.tinta;
  ctx.font = `700 ${H * 0.035}px ${SANS}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${W * 0.012}px`;
  ctx.fillText("SFIDA", centro + W * 0.006, H * 0.895);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

  return new Promise((resolver) => lienzo.toBlob(resolver, "image/png"));
}

/* ------------------------------------------------- Tarjeta sobre plantilla */

function colorDeMuestra(ctx, x, y) {
  const [r, g, b] = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}

function sobrePlantilla(plantilla, nombre) {
  const saludado = primerNombre(nombre);
  const W = plantilla.naturalWidth;
  const H = plantilla.naturalHeight;

  const lienzo = document.createElement("canvas");
  lienzo.width = W;
  lienzo.height = H;
  const ctx = lienzo.getContext("2d");
  ctx.drawImage(plantilla, 0, 0, W, H);

  if (DISENO.taparNombre) {
    // El color se TOMA de la imagen en vez de escribirlo a mano: así el parche
    // calza exacto aunque el diseño cambie de tono.
    ctx.fillStyle = colorDeMuestra(ctx, DISENO.muestra.x * W, DISENO.muestra.y * H);
    ctx.fillRect(DISENO.zona.x * W, DISENO.zona.y * H, DISENO.zona.ancho * W, DISENO.zona.alto * H);
  }

  ctx.fillStyle = DISENO.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const base = DISENO.tamanoBase * H;
  ctx.font = `${base}px ${DISENO.fuente}`;
  ctx.fillText(DISENO.linea1.texto, W / 2, DISENO.linea1.y * H);

  const tamano = ajustarA(ctx, `${saludado}!`, DISENO.anchoMaximo * W, base, DISENO.fuente);
  ctx.font = `${tamano}px ${DISENO.fuente}`;
  ctx.fillText(`${saludado}!`, W / 2, DISENO.linea2.y * H);

  return new Promise((resolver) => lienzo.toBlob(resolver, "image/png"));
}

/* -------------------------------------------------------------- Fachada */

/**
 * La tarjeta de ese cliente, como PNG.
 * Usa el diseño de /public si existe; si no, la dibuja completa.
 */
export async function generarTarjeta(nombre) {
  if (!primerNombre(nombre)) return null;
  const plantilla = await cargarPlantilla();
  return plantilla ? sobrePlantilla(plantilla, nombre) : dibujarTarjeta(nombre);
}

/** Nombre de archivo para cuando se descarga en vez de copiarse. */
export function nombreArchivoTarjeta(nombre) {
  const base = primerNombre(nombre).toLowerCase() || "cliente";
  return `cumple-sfida-${base}.png`;
}

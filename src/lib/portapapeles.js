"use client";

/**
 * Copia texto al portapapeles.
 *
 * navigator.clipboard solo existe en HTTPS (o localhost). En Vercel siempre
 * hay HTTPS, pero si alguien abre el CRM por IP dentro de la tienda
 * (http://192.168.x.x:3000) no está disponible, y ahí entra el respaldo con
 * un textarea escondido, que funciona en cualquier navegador.
 *
 * @returns {Promise<boolean>} false si el navegador no dejó copiar.
 */
export async function copiarAlPortapapeles(texto) {
  const valor = String(texto ?? "");
  if (!valor) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(valor);
      return true;
    }
  } catch {
    // Puede fallar por permisos o por pestaña sin foco: se intenta el respaldo.
  }

  try {
    const area = document.createElement("textarea");
    area.value = valor;
    area.setAttribute("readonly", "");
    // Fuera de pantalla, pero no display:none: si no se puede seleccionar,
    // execCommand no copia nada.
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const listo = document.execCommand("copy");
    document.body.removeChild(area);
    return listo;
  } catch {
    return false;
  }
}

/** Descarga un archivo generado en el navegador (el dashboard exportable). */
export function descargarArchivo(nombre, contenido, tipo = "text/html;charset=utf-8") {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  // Sin el revoke el blob se queda en memoria hasta recargar la página.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

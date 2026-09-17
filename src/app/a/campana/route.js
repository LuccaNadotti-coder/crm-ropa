import { createClient } from "@supabase/supabase-js";

/**
 * Enlace corto del archivo de campañas: crm-ropa.vercel.app/a/campana
 *
 * Redirige al archivo que esté subido en ese momento. Se manda este enlace y
 * no el de Supabase (que es larguísimo y cambia con cada archivo) para que en
 * el WhatsApp del cliente se lea bien y para poder cambiar el archivo sin
 * tener que reescribir las campañas.
 *
 * No pide sesión: el bucket es público y quien recibe el WhatsApp no tiene
 * usuario en el CRM.
 */

export const dynamic = "force-dynamic";

const BUCKET = "campanas";
const PREFIJO = "adjunto-";

export async function GET(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clave) return sinArchivo(request);

  const supabase = createClient(url, clave);
  const { data, error } = await supabase.storage.from(BUCKET).list("", {
    limit: 100,
    sortBy: { column: "name", order: "desc" },
  });
  if (error || !data) return sinArchivo(request);

  const vigente = data.filter((f) => f.name.startsWith(PREFIJO))[0];
  if (!vigente) return sinArchivo(request);

  const publica = supabase.storage.from(BUCKET).getPublicUrl(vigente.name).data.publicUrl;
  return Response.redirect(publica, 302);
}

/** Si todavía no hay archivo, una página simple en vez de un error crudo. */
function sinArchivo() {
  return new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SFIDA</title>
<style>body{margin:0;display:grid;place-items:center;min-height:100vh;background:#f7f4f2;
font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#2c2a28;text-align:center;padding:24px}
p{max-width:24rem;line-height:1.6}</style></head>
<body><div><h1>SFIDA</h1><p>Por ahora no hay ningún archivo publicado. Escríbenos y con gusto te lo compartimos.</p></div></body></html>`,
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

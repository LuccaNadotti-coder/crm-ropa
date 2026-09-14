// Genera el dashboard exportable: un único archivo .html, sin internet, que
// abre en cualquier navegador y se imprime o guarda como PDF.
//
// ¿Por qué HTML y no Excel? Lo que se exporta acá son los GRÁFICOS y conteos
// que el administrador ve en pantalla. Excel ya existe en la app para los
// datos fila por fila (Clientes y Reportes). Un .html se manda por WhatsApp o
// correo, lo abre cualquiera sin instalar nada, y con Ctrl+P queda un PDF.
//
// Todo va incrustado (estilos y barras con CSS): no hay ninguna librería de
// gráficos, así que el archivo funciona igual dentro de 5 años y sin conexión.

const PALETA = {
  ink: "#22201C",
  inkSoft: "#3A362F",
  inkMute: "#6B6459",
  inkFaint: "#9A9184",
  brass: "#B8925A",
  brassDark: "#9A7943",
  brassSoft: "#E8DCC6",
  wine: "#8C3B44",
  cream: "#F4EFE4",
  arena: "#F3F1EC",
  borde: "#E3DED2",
  exito: "#2F6B4F",
};

/** Escapa lo que venga de la base: nombres de tienda, asesora, distrito. */
function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const pct = (valor, total) => (total > 0 ? Math.round((valor / total) * 100) : 0);

function tarjetaKpi({ etiqueta, valor, detalle, tono }) {
  const color = { wine: PALETA.wine, brass: PALETA.brassDark, exito: PALETA.exito }[tono] || PALETA.ink;
  return `
    <div class="kpi">
      <p class="kpi-etiqueta">${esc(etiqueta)}</p>
      <p class="kpi-valor" style="color:${color}">${esc(valor)}</p>
      ${detalle ? `<p class="kpi-detalle">${esc(detalle)}</p>` : ""}
    </div>`;
}

/** Barras horizontales: una fila por categoría, con valor y porcentaje. */
function barrasHorizontales(datos, total, maxItems) {
  const lista = maxItems ? datos.slice(0, maxItems) : datos;
  if (lista.length === 0) return `<p class="vacio">Sin datos en este periodo.</p>`;
  const tope = Math.max(1, ...lista.map((d) => d.valor));
  return `<ul class="barras">${lista
    .map(
      (d) => `
      <li>
        <div class="barra-fila">
          <span class="barra-etiqueta">${esc(d.etiqueta)}</span>
          <span class="barra-valor">${d.valor}${
            total > 0 ? ` <span class="barra-pct">${pct(d.valor, total)}%</span>` : ""
          }</span>
        </div>
        <div class="barra-pista"><div class="barra-relleno" style="width:${(d.valor / tope) * 100}%"></div></div>
      </li>`
    )
    .join("")}</ul>`;
}

/** Barras verticales para la serie de altas por mes. */
function barrasMensuales(serie) {
  if (serie.length === 0) return `<p class="vacio">Aún no hay altas registradas.</p>`;
  const tope = Math.max(1, ...serie.map((d) => d.valor));
  return `
    <div class="serie">
      ${serie
        .map(
          (d) => `
        <div class="serie-col" title="${esc(d.etiquetaLarga)}: ${d.valor} altas">
          <span class="serie-num">${d.valor}</span>
          <div class="serie-barra" style="height:${Math.max(3, (d.valor / tope) * 130)}px"></div>
          <span class="serie-mes">${esc(d.etiqueta)}</span>
        </div>`
        )
        .join("")}
    </div>`;
}

function tablaTiendas(tiendas) {
  if (tiendas.length === 0) return `<p class="vacio">Sin tiendas que mostrar.</p>`;
  const totalClientes = tiendas.reduce((s, t) => s + t.clientes, 0);
  return `
    <table class="tabla">
      <thead>
        <tr>
          <th>Tienda</th>
          <th class="num">Clientes</th>
          <th class="num">% del total</th>
          <th class="num">Altas del mes</th>
          <th class="num">Catálogo del mes</th>
          <th class="avance">Avance del catálogo</th>
        </tr>
      </thead>
      <tbody>
        ${tiendas
          .map(
            (t) => `
          <tr>
            <td><strong>${esc(t.tienda)}</strong></td>
            <td class="num">${t.clientes}</td>
            <td class="num">${pct(t.clientes, totalClientes)}%</td>
            <td class="num">${t.altas}</td>
            <td class="num">${t.catalogo} / ${t.clientes}</td>
            <td class="avance">
              <div class="barra-pista">
                <div class="barra-relleno${t.catalogo === t.clientes && t.clientes > 0 ? " listo" : ""}"
                     style="width:${pct(t.catalogo, t.clientes)}%"></div>
              </div>
              <span class="avance-pct">${pct(t.catalogo, t.clientes)}%</span>
            </td>
          </tr>`
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td><strong>Total</strong></td>
          <td class="num"><strong>${totalClientes}</strong></td>
          <td class="num">100%</td>
          <td class="num"><strong>${tiendas.reduce((s, t) => s + t.altas, 0)}</strong></td>
          <td class="num"><strong>${tiendas.reduce((s, t) => s + t.catalogo, 0)} / ${totalClientes}</strong></td>
          <td class="avance"></td>
        </tr>
      </tfoot>
    </table>`;
}

/**
 * @param {object} d
 * @param {string} d.generado      Fecha y hora legibles de la exportación.
 * @param {string} d.alcance       "Todas las tiendas" o el nombre de una.
 * @param {string} d.mesEtiqueta   Mes analizado, ej. "Agosto 2026".
 * @param {Array}  d.kpis          [{etiqueta, valor, detalle, tono}]
 * @param {Array}  d.tiendas       [{tienda, clientes, altas, catalogo}]
 * @param {Array}  d.serie         [{etiqueta, etiquetaLarga, valor}]
 * @param {Array}  d.desgloses     [{titulo, subtitulo, datos, total, maxItems}]
 * @returns {string} HTML completo y autónomo.
 */
export function construirDashboardHtml(d) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dashboard SFIDA · ${esc(d.mesEtiqueta)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 28px 20px 60px;
    background: ${PALETA.arena}; color: ${PALETA.ink};
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 14px; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .hoja { max-width: 1040px; margin: 0 auto; }
  .cabecera {
    display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between;
    gap: 16px; border-bottom: 2px solid ${PALETA.ink}; padding-bottom: 14px; margin-bottom: 22px;
  }
  .marca { font-size: 26px; font-weight: 800; letter-spacing: -.4px; margin: 0; }
  .marca span { display: block; font-size: 10px; font-weight: 700; letter-spacing: .22em;
    text-transform: uppercase; color: ${PALETA.brassDark}; margin-top: 2px; }
  .meta { text-align: right; font-size: 12px; color: ${PALETA.inkMute}; }
  .meta strong { color: ${PALETA.ink}; }
  h2 { font-size: 15px; margin: 0 0 2px; }
  .sub { font-size: 12px; color: ${PALETA.inkMute}; margin: 0 0 14px; }
  section.carta {
    background: #fff; border: 1px solid ${PALETA.borde}; border-radius: 14px;
    padding: 18px 20px; margin-bottom: 18px; break-inside: avoid;
  }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
  .kpi { background: #fff; border: 1px solid ${PALETA.borde}; border-radius: 14px; padding: 14px 16px; }
  .kpi-etiqueta { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
    color: ${PALETA.inkMute}; margin: 0; }
  .kpi-valor { font-size: 28px; font-weight: 800; margin: 4px 0 0; font-variant-numeric: tabular-nums; }
  .kpi-detalle { font-size: 11px; color: ${PALETA.inkMute}; margin: 3px 0 0; }
  .columnas { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .barras { list-style: none; margin: 0; padding: 0; }
  .barras li { margin-bottom: 10px; }
  .barra-fila { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 4px; }
  .barra-etiqueta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .barra-valor { flex-shrink: 0; font-weight: 700; font-variant-numeric: tabular-nums; }
  .barra-pct { font-weight: 400; font-size: 11px; color: ${PALETA.inkFaint}; }
  .barra-pista { height: 8px; background: ${PALETA.borde}; border-radius: 99px; overflow: hidden; }
  .barra-relleno { height: 100%; background: ${PALETA.brassDark}; border-radius: 99px; }
  .barra-relleno.listo { background: ${PALETA.exito}; }
  .serie { display: flex; align-items: flex-end; gap: 8px; height: 180px; }
  .serie-col { flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: flex-end; gap: 5px; }
  .serie-num { font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .serie-barra { width: 100%; background: ${PALETA.brassDark}; border-radius: 5px 5px 0 0; }
  .serie-mes { font-size: 10px; color: ${PALETA.inkMute}; }
  .tabla { width: 100%; border-collapse: collapse; font-size: 13px; }
  .tabla th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .05em;
    color: ${PALETA.inkMute}; background: ${PALETA.cream}; padding: 8px 10px;
    border-bottom: 1px solid ${PALETA.borde}; }
  .tabla td { padding: 9px 10px; border-bottom: 1px solid ${PALETA.borde}; }
  .tabla tfoot td { border-bottom: none; border-top: 2px solid ${PALETA.borde}; background: ${PALETA.cream}; }
  .tabla .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .tabla .avance { width: 180px; }
  .tabla .avance { display: table-cell; }
  .avance-pct { font-size: 11px; color: ${PALETA.inkMute}; font-variant-numeric: tabular-nums; }
  .vacio { text-align: center; color: ${PALETA.inkFaint}; font-size: 13px; padding: 14px 0; margin: 0; }
  .pie { font-size: 11px; color: ${PALETA.inkFaint}; text-align: center; margin-top: 26px; line-height: 1.6; }
  .imprimir {
    position: fixed; right: 18px; bottom: 18px; background: ${PALETA.ink}; color: #fff;
    border: none; border-radius: 10px; padding: 12px 18px; font-size: 13px; font-weight: 700;
    cursor: pointer; box-shadow: 0 8px 24px rgba(34,32,28,.22); font-family: inherit;
  }
  @media (max-width: 780px) {
    .kpis { grid-template-columns: repeat(2, 1fr); }
    .columnas { grid-template-columns: 1fr; }
  }
  @media print {
    body { background: #fff; padding: 0; font-size: 12px; }
    .imprimir { display: none; }
    section.carta, .kpi { border-color: #ccc; box-shadow: none; }
    .serie { height: 150px; }
  }
</style>
</head>
<body>
<div class="hoja">

  <div class="cabecera">
    <h1 class="marca">SFIDA<span>Investor CRM · Dashboard</span></h1>
    <div class="meta">
      <div><strong>${esc(d.alcance)}</strong></div>
      <div>Mes analizado: <strong>${esc(d.mesEtiqueta)}</strong></div>
      <div>Generado el ${esc(d.generado)}</div>
    </div>
  </div>

  <div class="kpis">${d.kpis.map(tarjetaKpi).join("")}</div>

  <section class="carta">
    <h2>Clientes nuevos por mes</h2>
    <p class="sub">${esc(d.alcance)} · últimos ${d.serie.length} meses</p>
    ${barrasMensuales(d.serie)}
  </section>

  <section class="carta">
    <h2>Conteo por tienda</h2>
    <p class="sub">Cartera total, altas de ${esc(d.mesEtiqueta)} y avance del catálogo del mes</p>
    ${tablaTiendas(d.tiendas)}
  </section>

  <div class="columnas">
    ${d.desgloses
      .map(
        (g) => `
      <section class="carta">
        <h2>${esc(g.titulo)}</h2>
        <p class="sub">${esc(g.subtitulo || "")}</p>
        ${barrasHorizontales(g.datos, g.total, g.maxItems)}
      </section>`
      )
      .join("")}
  </div>

  <p class="pie">
    Generado por el CRM de SFIDA a partir de los datos en línea al momento de la exportación.<br>
    Los porcentajes de los desgloses se calculan sobre las altas de ${esc(d.mesEtiqueta)}.
  </p>
</div>

<button class="imprimir" onclick="window.print()">Imprimir o guardar en PDF</button>
</body>
</html>`;
}

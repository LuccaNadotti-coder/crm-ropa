// Genera el dashboard exportable: un único archivo .html, sin internet, que
// abre en cualquier navegador y se imprime o se guarda como PDF.
//
// ¿Por qué HTML y no Excel? Lo que se exporta acá son los GRÁFICOS y conteos
// que el administrador ve en pantalla. Excel ya existe en la app para los
// datos fila por fila (Clientes y Reportes). Un .html se manda por WhatsApp o
// correo, lo abre cualquiera sin instalar nada, y con Ctrl+P queda un PDF.
//
// Todo va incrustado —estilos, barras y tipografías del sistema— así que no
// hay ninguna librería de gráficos: el archivo se ve igual dentro de 5 años y
// sin conexión. Por lo mismo las barras son divs con ancho en %, no SVG.

const C = {
  ink: "#22201C",
  inkSoft: "#3A362F",
  inkMute: "#6B6459",
  inkFaint: "#9A9184",
  brass: "#B8925A",
  brassDark: "#9A7943",
  brassDeep: "#8A6A38",
  brassSoft: "#E8DCC6",
  wine: "#8C3B44",
  wineSoft: "#F0DCDE",
  cream: "#F4EFE4",
  arena: "#F3F1EC",
  borde: "#E3DED2",
  exito: "#2F6B4F",
  exitoSoft: "#DDEDE3",
};

/** Escapa lo que venga de la base: tiendas, asesoras, distritos. */
function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const pct = (valor, total) => (total > 0 ? Math.round((valor / total) * 100) : 0);

/* ----------------------------------------------------------------- Piezas */

function tarjetaKpi({ etiqueta, valor, detalle, tono }) {
  const color = { wine: C.wine, brass: C.brassDeep, exito: C.exito }[tono] || C.ink;
  return `
    <article class="kpi" style="--acento:${color}">
      <p class="kpi-etiqueta">${esc(etiqueta)}</p>
      <p class="kpi-valor">${esc(valor)}</p>
      ${detalle ? `<p class="kpi-detalle">${esc(detalle)}</p>` : ""}
    </article>`;
}

/** Barras horizontales rankeadas: posición, etiqueta, valor y porcentaje. */
function barrasHorizontales(datos, total, maxItems) {
  const lista = maxItems ? datos.slice(0, maxItems) : datos;
  if (lista.length === 0) return `<p class="vacio">Sin datos en este periodo.</p>`;
  const tope = Math.max(1, ...lista.map((d) => d.valor));
  const sobran = maxItems && datos.length > maxItems ? datos.length - maxItems : 0;

  return `
    <ol class="ranking">
      ${lista
        .map(
          (d, i) => `
        <li${i === 0 ? ' class="lider"' : ""}>
          <span class="puesto">${i + 1}</span>
          <div class="ranking-cuerpo">
            <div class="ranking-fila">
              <span class="ranking-etiqueta">${esc(d.etiqueta)}</span>
              <span class="ranking-valor">${d.valor}${
                total > 0 ? `<span class="ranking-pct">${pct(d.valor, total)}%</span>` : ""
              }</span>
            </div>
            <div class="pista"><span class="relleno" style="width:${Math.max(1.5, (d.valor / tope) * 100)}%"></span></div>
          </div>
        </li>`
        )
        .join("")}
    </ol>
    ${sobran ? `<p class="nota">y ${sobran} más fuera del top ${maxItems}.</p>` : ""}`;
}

/**
 * Serie mensual. Lleva líneas guía de fondo y resalta el mes analizado, que
 * es el que alimenta todos los desgloses de abajo.
 */
function serieMensual(serie, mesClave) {
  if (serie.length === 0) return `<p class="vacio">Aún no hay altas registradas.</p>`;
  const tope = Math.max(1, ...serie.map((d) => d.valor));
  const promedio = serie.reduce((s, d) => s + d.valor, 0) / serie.length;
  const guias = [1, 0.75, 0.5, 0.25];

  return `
    <p class="leyenda"><span class="muestra"></span> Promedio del periodo: <strong>${promedio.toFixed(1)}</strong> altas por mes</p>
    <div class="grafico">
      <div class="guias">
        ${guias
          .map(
            (g) => `<div class="guia"><span>${Math.round(tope * g)}</span></div>`
          )
          .join("")}
        <div class="guia base"><span>0</span></div>
        <div class="promedio" style="bottom:${(promedio / tope) * 100}%"></div>
      </div>
      <div class="columnas-grafico">
        ${serie
          .map((d) => {
            const activo = d.clave && d.clave === mesClave;
            return `
          <div class="col${activo ? " activa" : ""}" title="${esc(d.etiquetaLarga)}: ${d.valor} altas">
            <span class="col-num">${d.valor}</span>
            <div class="col-barra" style="height:${Math.max(2, (d.valor / tope) * 100)}%"></div>
            <span class="col-mes">${esc(d.etiqueta)}</span>
          </div>`;
          })
          .join("")}
      </div>
    </div>`;
}

function tablaTiendas(tiendas, mesEtiqueta) {
  if (tiendas.length === 0) return `<p class="vacio">Sin tiendas que mostrar.</p>`;
  const totalClientes = tiendas.reduce((s, t) => s + t.clientes, 0);
  const totalAltas = tiendas.reduce((s, t) => s + t.altas, 0);
  const totalCatalogo = tiendas.reduce((s, t) => s + t.catalogo, 0);

  return `
    <table class="tabla">
      <thead>
        <tr>
          <th>Tienda</th>
          <th class="num">Clientes</th>
          <th class="num">Participación</th>
          <th class="num">Altas de ${esc(mesEtiqueta)}</th>
          <th class="num">Catálogo enviado</th>
          <th class="avance">Avance</th>
        </tr>
      </thead>
      <tbody>
        ${tiendas
          .map((t) => {
            const avance = pct(t.catalogo, t.clientes);
            const completo = avance === 100;
            return `
          <tr>
            <td class="nombre-tienda">${esc(t.tienda)}</td>
            <td class="num fuerte">${t.clientes}</td>
            <td class="num">
              <span class="participacion">
                <span class="participacion-pista"><span style="width:${pct(t.clientes, totalClientes)}%"></span></span>
                ${pct(t.clientes, totalClientes)}%
              </span>
            </td>
            <td class="num">${t.altas > 0 ? `<span class="chip">+${t.altas}</span>` : `<span class="cero">0</span>`}</td>
            <td class="num">${t.catalogo} <span class="de">de ${t.clientes}</span></td>
            <td class="avance">
              <div class="pista"><span class="relleno${completo ? " completo" : ""}" style="width:${avance}%"></span></div>
              <span class="avance-num${completo ? " completo" : ""}">${avance}%</span>
            </td>
          </tr>`;
          })
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td class="nombre-tienda">Total</td>
          <td class="num fuerte">${totalClientes}</td>
          <td class="num">100%</td>
          <td class="num fuerte">+${totalAltas}</td>
          <td class="num fuerte">${totalCatalogo} <span class="de">de ${totalClientes}</span></td>
          <td class="avance">
            <div class="pista"><span class="relleno" style="width:${pct(totalCatalogo, totalClientes)}%"></span></div>
            <span class="avance-num">${pct(totalCatalogo, totalClientes)}%</span>
          </td>
        </tr>
      </tfoot>
    </table>`;
}

/* ---------------------------------------------------------------- Armado */

/**
 * @param {object} d
 * @param {string} d.generado     Fecha y hora legibles de la exportación.
 * @param {string} d.alcance      "Todas las tiendas" o el nombre de una.
 * @param {string} d.mesEtiqueta  Mes analizado, ej. "Agosto 2026".
 * @param {string} d.mesClave     "2026-08": la columna que se resalta.
 * @param {Array}  d.kpis         [{etiqueta, valor, detalle, tono}]
 * @param {Array}  d.tiendas      [{tienda, clientes, altas, catalogo}]
 * @param {Array}  d.serie        [{clave, etiqueta, etiquetaLarga, valor}]
 * @param {Array}  d.desgloses    [{titulo, subtitulo, datos, total, maxItems}]
 * @returns {string} HTML completo y autónomo.
 */
export function construirDashboardHtml(d) {
  const totalClientes = d.tiendas.reduce((s, t) => s + t.clientes, 0);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dashboard SFIDA · ${esc(d.mesEtiqueta)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  :root {
    --ink:${C.ink}; --ink-soft:${C.inkSoft}; --ink-mute:${C.inkMute}; --ink-faint:${C.inkFaint};
    --brass:${C.brass}; --brass-dark:${C.brassDark}; --brass-deep:${C.brassDeep};
    --brass-soft:${C.brassSoft}; --wine:${C.wine}; --cream:${C.cream}; --arena:${C.arena};
    --borde:${C.borde}; --exito:${C.exito}; --exito-soft:${C.exitoSoft};
    --serif: Georgia, "Times New Roman", "Iowan Old Style", serif;
    --sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  body {
    margin: 0; padding: 30px 22px 70px; background: var(--arena); color: var(--ink);
    font-family: var(--sans); font-size: 14px; line-height: 1.5;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    -webkit-font-smoothing: antialiased;
  }
  .hoja { max-width: 1060px; margin: 0 auto; }

  /* ---------------- Portada ---------------- */
  .portada {
    background: var(--ink); color: #fff; border-radius: 18px; padding: 30px 34px;
    display: flex; flex-wrap: wrap; gap: 26px; align-items: flex-end;
    justify-content: space-between; position: relative; overflow: hidden;
  }
  .portada::after {
    content: ""; position: absolute; inset: 0 0 auto 0; height: 4px;
    background: linear-gradient(90deg, var(--brass) 0%, var(--brass-soft) 45%, var(--wine) 100%);
  }
  .kicker {
    margin: 0 0 6px; font-size: 10px; font-weight: 700; letter-spacing: .26em;
    text-transform: uppercase; color: var(--brass-soft);
  }
  .marca { margin: 0; font-family: var(--serif); font-size: 44px; line-height: .95; letter-spacing: .01em; }
  .portada .lead { margin: 10px 0 0; font-size: 14px; color: rgba(255,255,255,.72); }
  .portada .lead strong { color: #fff; }
  .ficha { display: flex; gap: 30px; flex-wrap: wrap; margin: 0; }
  .ficha div { min-width: 96px; }
  .ficha dt {
    font-size: 9.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
    color: rgba(255,255,255,.5); margin-bottom: 3px;
  }
  .ficha dd { margin: 0; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }

  /* ---------------- Rejilla de KPIs ---------------- */
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }
  .kpi {
    background: #fff; border: 1px solid var(--borde); border-radius: 14px;
    padding: 15px 16px 14px; position: relative; overflow: hidden;
  }
  .kpi::before {
    content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: var(--acento);
    opacity: .85;
  }
  .kpi-etiqueta {
    margin: 0; font-size: 9.5px; font-weight: 700; letter-spacing: .12em;
    text-transform: uppercase; color: var(--ink-mute);
  }
  .kpi-valor {
    margin: 7px 0 0; font-family: var(--serif); font-size: 32px; line-height: 1;
    color: var(--acento); font-variant-numeric: tabular-nums;
  }
  .kpi-detalle { margin: 6px 0 0; font-size: 11.5px; color: var(--ink-mute); }

  /* ---------------- Bloques ---------------- */
  .bloque {
    background: #fff; border: 1px solid var(--borde); border-radius: 16px;
    padding: 20px 22px 22px; margin-bottom: 16px; break-inside: avoid;
  }
  .bloque-cab {
    display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between;
    gap: 10px; padding-bottom: 12px; margin-bottom: 16px; border-bottom: 1px solid var(--borde);
  }
  .bloque-cab h2 {
    margin: 0; font-family: var(--serif); font-size: 19px; font-weight: 600; letter-spacing: .005em;
    display: flex; align-items: center; gap: 9px;
  }
  .bloque-cab h2::before {
    content: ""; width: 7px; height: 7px; border-radius: 2px; background: var(--brass); flex: none;
  }
  .bloque-cab .apunte { font-size: 11.5px; color: var(--ink-faint); }
  .columnas { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  /* ---------------- Gráfico de columnas ---------------- */
  .grafico { position: relative; padding-left: 34px; }
  .guias { position: absolute; inset: 0 0 26px 0; }
  .guia {
    position: absolute; left: 0; right: 0; border-top: 1px dashed var(--borde);
  }
  .guia span {
    position: absolute; left: 0; top: -7px; font-size: 9.5px; color: var(--ink-faint);
    font-variant-numeric: tabular-nums;
  }
  .guia:nth-child(1) { top: 0; }
  .guia:nth-child(2) { top: 25%; }
  .guia:nth-child(3) { top: 50%; }
  .guia:nth-child(4) { top: 75%; }
  .guia.base { top: auto; bottom: 0; border-top: 1px solid var(--borde); }
  .promedio { position: absolute; left: 34px; right: 0; border-top: 1px dashed var(--wine); opacity: .5; }
  .leyenda {
    display: flex; align-items: center; gap: 8px; margin: -4px 0 12px;
    font-size: 11.5px; color: var(--ink-mute);
  }
  .leyenda .muestra {
    width: 20px; border-top: 1px dashed var(--wine); opacity: .7; display: inline-block;
  }
  .leyenda strong { color: var(--ink); font-variant-numeric: tabular-nums; }
  .columnas-grafico {
    position: relative; display: flex; align-items: flex-end; gap: 7px; height: 200px;
  }
  .col { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; height: 100%; }
  .col-num {
    font-size: 10.5px; font-weight: 700; color: var(--ink-mute); font-variant-numeric: tabular-nums;
    margin-bottom: 4px;
  }
  .col-barra {
    width: 100%; border-radius: 6px 6px 2px 2px; background: linear-gradient(180deg, var(--brass) 0%, var(--brass-deep) 100%);
    min-height: 2px;
  }
  .col-mes { font-size: 10px; color: var(--ink-faint); margin-top: 7px; height: 19px; }
  .col.activa .col-num { color: var(--ink); }
  .col.activa .col-barra { background: linear-gradient(180deg, var(--ink-soft) 0%, var(--ink) 100%); }
  .col.activa .col-mes {
    color: #fff; background: var(--ink); border-radius: 5px; padding: 2px 7px; font-weight: 700;
  }

  /* ---------------- Tabla de tiendas ---------------- */
  .tabla { width: 100%; border-collapse: collapse; font-size: 13px; }
  .tabla th {
    text-align: left; font-size: 9.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    color: var(--ink-mute); padding: 0 10px 9px; border-bottom: 1px solid var(--borde); white-space: nowrap;
  }
  .tabla td { padding: 11px 10px; border-bottom: 1px solid var(--borde); vertical-align: middle; }
  .tabla tbody tr:nth-child(even) { background: #FBFAF7; }
  .tabla .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .tabla .fuerte { font-weight: 700; }
  .tabla .de { color: var(--ink-faint); font-size: 11px; }
  .tabla .cero { color: var(--ink-faint); }
  .nombre-tienda { font-weight: 600; white-space: nowrap; }
  .chip {
    display: inline-block; background: var(--exito-soft); color: var(--exito); border-radius: 99px;
    padding: 1px 9px; font-weight: 700; font-size: 12px;
  }
  .participacion { display: inline-flex; align-items: center; gap: 7px; justify-content: flex-end; }
  .participacion-pista {
    display: inline-block; width: 46px; height: 5px; border-radius: 99px; background: var(--borde);
    overflow: hidden;
  }
  .participacion-pista span { display: block; height: 100%; background: var(--ink-faint); border-radius: 99px; }
  .tabla .avance { width: 150px; }
  .tabla .avance .pista { display: inline-block; width: 92px; vertical-align: middle; }
  .avance-num {
    display: inline-block; width: 40px; text-align: right; font-size: 11.5px; color: var(--ink-mute);
    font-variant-numeric: tabular-nums;
  }
  .avance-num.completo { color: var(--exito); font-weight: 700; }
  .tabla tfoot td { border-bottom: none; border-top: 2px solid var(--ink); background: var(--cream); font-weight: 600; }

  /* ---------------- Barras y ranking ---------------- */
  .pista { height: 7px; background: var(--borde); border-radius: 99px; overflow: hidden; }
  .relleno {
    display: block; height: 100%; border-radius: 99px;
    background: linear-gradient(90deg, var(--brass) 0%, var(--brass-deep) 100%);
  }
  .relleno.completo { background: var(--exito); }
  .ranking { list-style: none; margin: 0; padding: 0; counter-reset: puesto; }
  .ranking li { display: flex; gap: 11px; align-items: flex-start; margin-bottom: 11px; }
  .ranking li:last-child { margin-bottom: 0; }
  .puesto {
    flex: none; width: 19px; height: 19px; border-radius: 6px; background: var(--cream);
    color: var(--ink-faint); font-size: 10px; font-weight: 700; display: flex;
    align-items: center; justify-content: center; margin-top: 2px;
  }
  .lider .puesto { background: var(--ink); color: #fff; }
  .ranking-cuerpo { flex: 1; min-width: 0; }
  .ranking-fila { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 5px; }
  .ranking-etiqueta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ranking-valor { flex: none; font-weight: 700; font-variant-numeric: tabular-nums; }
  .ranking-pct { font-weight: 400; font-size: 11px; color: var(--ink-faint); margin-left: 7px; }

  .vacio { text-align: center; color: var(--ink-faint); font-size: 13px; padding: 20px 0; margin: 0; }
  .nota { margin: 11px 0 0; font-size: 11px; color: var(--ink-faint); }

  /* ---------------- Pie ---------------- */
  .pie {
    margin-top: 26px; padding-top: 16px; border-top: 1px solid var(--borde);
    font-size: 11px; color: var(--ink-faint); text-align: center; line-height: 1.7;
  }
  .pie strong { color: var(--ink-mute); }

  .imprimir {
    position: fixed; right: 20px; bottom: 20px; background: var(--ink); color: #fff; border: none;
    border-radius: 11px; padding: 13px 20px; font-family: inherit; font-size: 13px; font-weight: 700;
    cursor: pointer; box-shadow: 0 10px 28px rgba(34,32,28,.26); display: inline-flex; align-items: center; gap: 9px;
  }
  .imprimir:hover { background: var(--ink-soft); }

  @media (max-width: 820px) {
    body { padding: 18px 14px 70px; }
    .kpis { grid-template-columns: repeat(2, 1fr); }
    .columnas { grid-template-columns: 1fr; }
    .marca { font-size: 34px; }
    .portada { padding: 24px; }
    .bloque { padding: 16px; }
  }

  @media print {
    @page { margin: 12mm; }
    body { background: #fff; padding: 0; font-size: 11.5px; }
    .imprimir { display: none; }
    .portada { border-radius: 0 0 14px 14px; padding: 22px 26px; }
    .bloque, .kpi { break-inside: avoid; }
    .columnas-grafico { height: 165px; }
    .kpis { gap: 8px; }
  }
</style>
</head>
<body>
<div class="hoja">

  <header class="portada">
    <div>
      <p class="kicker">Investor CRM</p>
      <h1 class="marca">SFIDA</h1>
      <p class="lead">Dashboard de gestión · <strong>${esc(d.mesEtiqueta)}</strong></p>
    </div>
    <dl class="ficha">
      <div><dt>Alcance</dt><dd>${esc(d.alcance)}</dd></div>
      <div><dt>Cartera</dt><dd>${totalClientes} clientes</dd></div>
      <div><dt>Generado</dt><dd>${esc(d.generado)}</dd></div>
    </dl>
  </header>

  <div class="kpis">${d.kpis.map(tarjetaKpi).join("")}</div>

  <section class="bloque">
    <div class="bloque-cab">
      <h2>Clientes nuevos por mes</h2>
      <span class="apunte">${esc(d.alcance)} · últimos ${d.serie.length} meses · la columna oscura es el mes analizado</span>
    </div>
    ${serieMensual(d.serie, d.mesClave)}
  </section>

  <section class="bloque">
    <div class="bloque-cab">
      <h2>Conteo por tienda</h2>
      <span class="apunte">Cartera, altas del mes y avance del catálogo de ${esc(d.mesEtiqueta)}</span>
    </div>
    ${tablaTiendas(d.tiendas, d.mesEtiqueta)}
  </section>

  <div class="columnas">
    ${d.desgloses
      .map(
        (g) => `
      <section class="bloque">
        <div class="bloque-cab">
          <h2>${esc(g.titulo)}</h2>
          ${g.subtitulo ? `<span class="apunte">${esc(g.subtitulo)}</span>` : ""}
        </div>
        ${barrasHorizontales(g.datos, g.total, g.maxItems)}
      </section>`
      )
      .join("")}
  </div>

  <p class="pie">
    Generado por el <strong>CRM de SFIDA</strong> con los datos en línea al momento de la exportación.<br>
    Los desgloses y sus porcentajes corresponden a las altas de ${esc(d.mesEtiqueta)};
    la cartera y el avance del catálogo son acumulados.
  </p>
</div>

<button class="imprimir" onclick="window.print()">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/></svg>
  Imprimir o guardar en PDF
</button>
</body>
</html>`;
}

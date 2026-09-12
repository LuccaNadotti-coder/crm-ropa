"use client";

// Gráficos de barras para el panel de reportes.
//
// Todos son de UNA sola serie (magnitud por categoría), así que llevan un solo
// tono en vez de un color por barra: pintar cada categoría de distinto color
// codificaría la identidad dos veces, y al filtrar cambiarían de color.
//
// El tono es brass-dark #9A7943 (4.05:1 sobre blanco). El latón normal
// #B8925A se queda en 2.88:1 y las barras se pierden contra el fondo.
// Cada barra lleva su valor escrito al lado, así el dato nunca depende del color.

export function BarrasHorizontales({ datos, total, vacio = "Sin datos", maxItems }) {
  const lista = maxItems ? datos.slice(0, maxItems) : datos;
  const tope = Math.max(1, ...lista.map((d) => d.valor));

  if (lista.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-faint">{vacio}</p>;
  }

  return (
    <ul className="space-y-2.5">
      {lista.map((d) => {
        const pct = total > 0 ? Math.round((d.valor / total) * 100) : 0;
        return (
          <li key={d.etiqueta} className="group">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-ink" title={d.etiqueta}>{d.etiqueta}</span>
              <span className="shrink-0 text-sm tabular-nums text-ink-mute">
                <strong className="text-ink">{d.valor}</strong>
                {total > 0 && <span className="ml-1.5 text-xs text-ink-faint">{pct}%</span>}
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-borde/60"
              title={`${d.etiqueta}: ${d.valor}${total > 0 ? ` (${pct}%)` : ""}`}
            >
              <div
                className="h-full rounded-full bg-brass-dark transition-all duration-500 group-hover:bg-ink"
                style={{ width: `${(d.valor / tope) * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Barras verticales para la serie temporal de altas por mes. */
export function BarrasMensuales({ datos, seleccionado, onSeleccionar }) {
  const tope = Math.max(1, ...datos.map((d) => d.valor));

  if (datos.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-faint">Aún no hay altas registradas.</p>;
  }

  return (
    <div className="flex items-end gap-2 sm:gap-3" style={{ height: 168 }}>
      {datos.map((d) => {
        const activo = d.clave === seleccionado;
        const altura = Math.max(4, (d.valor / tope) * 128);
        return (
          <button
            key={d.clave}
            onClick={() => onSeleccionar(d.clave)}
            aria-pressed={activo}
            title={`${d.etiquetaLarga}: ${d.valor} altas`}
            className="group flex flex-1 flex-col items-center justify-end gap-1.5"
          >
            <span className={`text-xs font-bold tabular-nums ${activo ? "text-ink" : "text-ink-mute"}`}>
              {d.valor}
            </span>
            <div
              style={{ height: altura }}
              className={`w-full rounded-t-md transition-all duration-300 ${
                activo ? "bg-ink" : "bg-brass-dark group-hover:bg-brass"
              }`}
            />
            <span className={`text-[11px] ${activo ? "font-bold text-ink" : "text-ink-mute"}`}>
              {d.etiqueta}
            </span>
          </button>
        );
      })}
    </div>
  );
}

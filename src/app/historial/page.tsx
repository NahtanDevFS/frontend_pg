"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Conteo, Cultivo, Usuario } from "@/types";
import styles from "./historial.module.css";

function GraficaTendencia({ conteos }: { conteos: Conteo[] }) {
  // Estado para saber qué punto está seleccionado/hovered
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (conteos.length < 2) return null;

  const completados = conteos
    .filter(
      (c) => c.estado_nombre === "completado" && c.conteo_total_acumulado > 0,
    )
    .sort(
      (a, b) =>
        new Date(a.fecha_conteo).getTime() - new Date(b.fecha_conteo).getTime(),
    );

  if (completados.length < 2) return null;

  const max = Math.max(...completados.map((c) => c.conteo_total_acumulado));
  const W = 300,
    H = 80,
    PAD = 10;
  const w = W - PAD * 2,
    h = H - PAD * 2;

  // Calculamos las coordenadas x,y de cada punto
  const points = completados.map((c, i) => {
    const x = PAD + (i / (completados.length - 1)) * w;
    const y = PAD + h - (c.conteo_total_acumulado / max) * h;
    return { x, y, conteo: c, i };
  });

  return (
    <div className={styles.graficaContenedor}>
      <p className={styles.graficaLabel}>Tendencia (ciclos completados)</p>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ overflow: "visible", maxWidth: "300px" }}
        onMouseLeave={() => setHoverIndex(null)} // Limpiar al salir del SVG
      >
        {/* Línea principal */}
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#52b788"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Puntos de la gráfica */}
        {points.map((p) => (
          <g key={p.conteo.id}>
            {/* texto estático se oculta suavemente si el tooltip lo está cubriendo */}
            <text
              x={p.x}
              y={p.y - 8}
              textAnchor="middle"
              fontSize="9"
              fill="#5a7a6a"
              style={{
                opacity: hoverIndex === p.i ? 0 : 1,
                transition: "opacity 0.2s ease",
              }}
            >
              {p.conteo.conteo_total_acumulado.toLocaleString()}
            </text>

            {/* Círculo visual (crece al hacer hover) */}
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIndex === p.i ? 5 : 3.5}
              fill={hoverIndex === p.i ? "#1a2e25" : "#2d6a4f"}
              style={{ transition: "all 0.2s ease" }}
            />

            {/* Área de interacción invisible (más grande para facilitar el toque en móviles) */}
            <circle
              cx={p.x}
              cy={p.y}
              r={16}
              fill="transparent"
              style={{
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
              onMouseEnter={() => setHoverIndex(p.i)}
              onClick={() => setHoverIndex(p.i)}
              onTouchStart={() => setHoverIndex(p.i)}
            />
          </g>
        ))}

        {/* Tooltip Dinámico: Se dibuja SIEMPRE al final para quedar por encima de las líneas */}
        {hoverIndex !== null &&
          (() => {
            const p = points[hoverIndex];
            const boxWidth = 64;
            const boxHeight = 32;

            // Lógica para que el Tooltip no se salga por los lados
            let boxX = p.x - boxWidth / 2;
            if (boxX < 0) boxX = 0;
            if (boxX + boxWidth > W) boxX = W - boxWidth;

            // Lógica para que no se salga por arriba
            const boxY =
              p.y - boxHeight - 8 > 0 ? p.y - boxHeight - 8 : p.y + 8;

            return (
              <g className={styles.graficaTooltip}>
                {/* Sombra y fondo del tooltip */}
                <rect
                  x={boxX}
                  y={boxY}
                  width={boxWidth}
                  height={boxHeight}
                  rx={6}
                  fill="#1a2e25"
                  opacity="0.95"
                />
                {/* Valor del conteo */}
                <text
                  x={boxX + boxWidth / 2}
                  y={boxY + 12}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="14"
                  fontWeight="bold"
                >
                  {p.conteo.conteo_total_acumulado.toLocaleString()}
                </text>
                {/* Fecha debajo del valor */}
                <text
                  x={boxX + boxWidth / 2}
                  y={boxY + 21}
                  textAnchor="middle"
                  fill="#a3b8ad"
                  fontSize="10"
                >
                  {new Date(p.conteo.fecha_conteo).toLocaleDateString("es-GT", {
                    day: "2-digit",
                    month: "short",
                  })}
                </text>
              </g>
            );
          })()}
      </svg>
    </div>
  );
}

interface GrupoAnualGrafica {
  anio: number;
  total: number;
  todosCompletos: boolean;
}

function GraficaAnual({ grupos }: { grupos: GrupoAnualGrafica[] }) {
  const [hoverAnio, setHoverAnio] = useState<number | null>(null);

  if (grupos.length === 0) return null;

  // Ordenar cronológico para la gráfica
  const ordenados = [...grupos].sort((a, b) => a.anio - b.anio);
  const max = Math.max(...ordenados.map((g) => g.total));
  if (max === 0) return null;

  const W = 560,
    H = 140,
    PAD_X = 40,
    PAD_Y = 24;
  const w = W - PAD_X * 2;
  const h = H - PAD_Y * 2;
  const n = ordenados.length;
  const BAR_W = Math.min(36, (w / n) * 0.55);
  const STEP = w / Math.max(n - 1, 1);

  const pts = ordenados.map((g, i) => ({
    x: n === 1 ? PAD_X + w / 2 : PAD_X + i * STEP,
    y: PAD_Y + h - (g.total / max) * h,
    grupo: g,
    i,
  }));

  return (
    <div style={{ overflowX: "auto", width: "100%", paddingBottom: "4px" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H + 20}`}
        style={{ minWidth: "260px", maxWidth: "560px", overflow: "visible" }}
        onMouseLeave={() => setHoverAnio(null)}
      >
        {/* Línea base */}
        <line
          x1={PAD_X}
          y1={PAD_Y + h}
          x2={PAD_X + w}
          y2={PAD_Y + h}
          stroke="#e8eeeb"
          strokeWidth="1"
        />

        {/* Línea de tendencia */}
        {n > 1 && (
          <polyline
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#52b788"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.5"
          />
        )}

        {pts.map((p) => {
          const hover = hoverAnio === p.grupo.anio;
          const barH = PAD_Y + h - p.y;
          const bx = p.x - BAR_W / 2;
          const anterior = p.i > 0 ? ordenados[p.i - 1].total : null;
          const variacion = anterior
            ? (((p.grupo.total - anterior) / anterior) * 100).toFixed(1)
            : null;
          const subio = variacion ? parseFloat(variacion) >= 0 : null;

          return (
            <g key={p.grupo.anio}>
              {/* Barra */}
              <rect
                x={bx}
                y={p.y}
                width={BAR_W}
                height={barH}
                rx="3"
                fill={
                  hover
                    ? "#1a2e25"
                    : p.grupo.todosCompletos
                      ? "#52b788"
                      : "#74c69d"
                }
                opacity={hover ? 1 : 0.75}
                style={{ transition: "all 0.15s" }}
              />

              {/* Valor encima de la barra */}
              <text
                x={p.x}
                y={p.y - 5}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill={hover ? "#1a2e25" : "#2d6a4f"}
                style={{ opacity: hover ? 0 : 1, transition: "opacity 0.15s" }}
              >
                {p.grupo.total.toLocaleString()}
              </text>

              {/* Variación */}
              {variacion && (
                <text
                  x={p.x}
                  y={p.y - 16}
                  textAnchor="middle"
                  fontSize="8"
                  fill={subio ? "#059669" : "#dc2626"}
                  style={{
                    opacity: hover ? 0 : 0.8,
                    transition: "opacity 0.15s",
                  }}
                >
                  {subio ? "▲" : "▼"} {Math.abs(parseFloat(variacion))}%
                </text>
              )}

              {/* Año debajo */}
              <text
                x={p.x}
                y={PAD_Y + h + 14}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill={hover ? "#1a2e25" : "#5a7a6a"}
              >
                {p.grupo.anio}
              </text>

              {/* Zona de interacción */}
              <rect
                x={bx - 8}
                y={PAD_Y}
                width={BAR_W + 16}
                height={h + 4}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoverAnio(p.grupo.anio)}
                onMouseLeave={() => setHoverAnio(null)}
                onClick={() => setHoverAnio(hover ? null : p.grupo.anio)}
              />

              {/* Tooltip hover */}
              {hover &&
                (() => {
                  const bw = 90,
                    bh = variacion ? 42 : 30;
                  let bx2 = p.x - bw / 2;
                  if (bx2 < 0) bx2 = 0;
                  if (bx2 + bw > W) bx2 = W - bw;
                  const by2 =
                    p.y - bh - 10 > PAD_Y ? p.y - bh - 10 : p.y + barH + 6;
                  return (
                    <g>
                      <rect
                        x={bx2}
                        y={by2}
                        width={bw}
                        height={bh}
                        rx={6}
                        fill="#1a2e25"
                        opacity="0.96"
                      />
                      <text
                        x={bx2 + bw / 2}
                        y={by2 + 13}
                        textAnchor="middle"
                        fill="white"
                        fontSize="13"
                        fontWeight="bold"
                      >
                        {p.grupo.total.toLocaleString()}
                      </text>
                      <text
                        x={bx2 + bw / 2}
                        y={by2 + 23}
                        textAnchor="middle"
                        fill="#a3b8ad"
                        fontSize="9"
                      >
                        melones · {p.grupo.anio}
                      </text>
                      {variacion && (
                        <text
                          x={bx2 + bw / 2}
                          y={by2 + 35}
                          textAnchor="middle"
                          fill={subio ? "#6ee7b7" : "#fca5a5"}
                          fontSize="9"
                          fontWeight="600"
                        >
                          {subio ? "▲" : "▼"} {Math.abs(parseFloat(variacion))}%
                          vs año anterior
                        </text>
                      )}
                    </g>
                  );
                })()}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function BadgeConfiabilidad({ nivel }: { nivel?: string | null }) {
  if (!nivel)
    return (
      <span style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
        —
      </span>
    );

  const claseNivel: Record<string, string> = {
    alto: styles.badgeAlto,
    moderado: styles.badgeModerado,
    bajo: styles.badgeBajo,
  };

  return (
    <span
      className={`${styles.badgeConfiabilidad} ${claseNivel[nivel] ?? styles.badgeDefault}`}
    >
      {nivel}
    </span>
  );
}

export default function HistorialPage() {
  const router = useRouter();
  const [conteos, setConteos] = useState<Conteo[]>([]);
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [operadores, setOperadores] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCultivo, setFiltroCultivo] = useState("");
  const [filtroOperador, setFiltroOperador] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [modoVista, setModoVista] = useState<"tabla" | "tendencia" | "anual">(
    "tabla",
  );
  const [exportando, setExportando] = useState<number | null>(null);
  // Paginación numérica
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;
  // Data completa (sin paginar) para la vista de tendencia y anual
  const [conteosTendencia, setConteosTendencia] = useState<Conteo[]>([]);
  // Toggle para mostrar desactivados
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  // Id del conteo en acción
  const [accionConteoId, setAccionConteoId] = useState<number | null>(null);
  // Año expandido en la vista anual
  const [anioExpandido, setAnioExpandido] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroCultivo) params.append("cultivo_id", filtroCultivo);
      if (filtroOperador) params.append("usuario_id", filtroOperador);
      if (fechaDesde) params.append("fecha_desde", fechaDesde);
      if (fechaHasta) params.append("fecha_hasta", fechaHasta);
      if (mostrarInactivos) params.append("incluir_inactivos", "true");

      // Vista anual: carga todos sin paginación para poder agrupar
      const paramsPag = new URLSearchParams(params);
      paramsPag.append("skip", String((pagina - 1) * PAGE_SIZE));
      paramsPag.append("limit", String(PAGE_SIZE));

      const paramsTodos = new URLSearchParams(params);
      paramsTodos.append("skip", "0");
      paramsTodos.append("limit", "500");

      const [resHist, resTodos, resCultivos, resOps] = await Promise.all([
        api.get<{ items: Conteo[]; total: number }>(
          `/conteos/admin/historial?${paramsPag}`,
        ),
        api.get<{ items: Conteo[]; total: number }>(
          `/conteos/admin/historial?${paramsTodos}`,
        ),
        api.get<Cultivo[]>("/cultivos/admin/todos"),
        api.get<Usuario[]>("/usuarios/"),
      ]);
      setConteos(resHist.data.items);
      setTotal(resHist.data.total);
      setConteosTendencia(resTodos.data.items);
      setCultivos(resCultivos.data);
      setOperadores(resOps.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    filtroCultivo,
    filtroOperador,
    fechaDesde,
    fechaHasta,
    pagina,
    mostrarInactivos,
  ]);

  // Al cambiar cualquier filtro, volver a la página 1
  useEffect(() => {
    setPagina(1);
  }, [filtroCultivo, filtroOperador, fechaDesde, fechaHasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombreCultivo = (id: number) =>
    cultivos.find((c) => c.id === id)?.nombre ?? `#${id}`;

  const nombreOperador = (conteo: Conteo) =>
    operadores.find((u) => u.id === conteo.created_by)?.nombre ?? "—";

  const conteosFiltrados = conteos;

  // Agrupar conteosTendencia por año
  const conteosAgrupados = (() => {
    const mapa = new Map<
      number,
      {
        anio: number;
        conteos: Conteo[];
        total: number;
        cultivosUnicos: string[];
        variedadesUnicas: string[];
        operadoresUnicos: string[];
        todosCompletos: boolean;
        peorConfianza: string | null;
      }
    >();

    const ordenConfianza: Record<string, number> = {
      alto: 0,
      moderado: 1,
      bajo: 2,
    };

    for (const c of conteosTendencia) {
      const anio = new Date(c.fecha_conteo + "T00:00:00").getFullYear();
      if (!mapa.has(anio)) {
        mapa.set(anio, {
          anio,
          conteos: [],
          total: 0,
          cultivosUnicos: [],
          variedadesUnicas: [],
          operadoresUnicos: [],
          todosCompletos: true,
          peorConfianza: null,
        });
      }
      const g = mapa.get(anio)!;
      g.conteos.push(c);
      g.total += c.conteo_total_acumulado;
      if (c.cultivo_nombre && !g.cultivosUnicos.includes(c.cultivo_nombre))
        g.cultivosUnicos.push(c.cultivo_nombre);
      if (c.variedad_nombre && !g.variedadesUnicas.includes(c.variedad_nombre))
        g.variedadesUnicas.push(c.variedad_nombre);
      if (c.operador_nombre && !g.operadoresUnicos.includes(c.operador_nombre))
        g.operadoresUnicos.push(c.operador_nombre);
      if (c.estado_nombre !== "completado") g.todosCompletos = false;
      if (c.nivel_confiabilidad) {
        const peorActual = g.peorConfianza
          ? (ordenConfianza[g.peorConfianza] ?? 0)
          : -1;
        const nuevo = ordenConfianza[c.nivel_confiabilidad] ?? 0;
        if (nuevo > peorActual) g.peorConfianza = c.nivel_confiabilidad;
      }
    }

    return Array.from(mapa.values()).sort((a, b) => b.anio - a.anio);
  })();

  const handleExportarPDFAnual = async () => {
    if (conteosAgrupados.length === 0) return;
    const { generarReporteAnualPDF } = await import("@/lib/generarReportePDF");
    generarReporteAnualPDF({
      grupos: conteosAgrupados,
      filtros: {
        cultivo: cultivos.find((c) => String(c.id) === filtroCultivo)?.nombre,
        operador: operadores.find((o) => String(o.id) === filtroOperador)
          ?.nombre,
        fechaDesde: fechaDesde || null,
        fechaHasta: fechaHasta || null,
      },
    });
  };

  const handleToggleInactivos = (checked: boolean) => {
    setMostrarInactivos(checked);
    setPagina(1);
  };

  const handleDesactivarConteo = async (conteoId: number, fecha: string) => {
    if (
      !confirm(
        `¿Desactivar el conteo del ${new Date(fecha + "T00:00:00").toLocaleDateString("es-GT")}?`,
      )
    )
      return;
    setAccionConteoId(conteoId);
    try {
      await api.patch(`/conteos/admin/${conteoId}/desactivar`);
      await cargar();
    } catch (err: any) {
      alert(err.response?.data?.detail ?? "Error al desactivar el conteo.");
    } finally {
      setAccionConteoId(null);
    }
  };

  const handleReactivarConteo = async (conteoId: number, fecha: string) => {
    if (
      !confirm(
        `¿Reactivar el conteo del ${new Date(fecha + "T00:00:00").toLocaleDateString("es-GT")}?`,
      )
    )
      return;
    setAccionConteoId(conteoId);
    try {
      await api.patch(`/conteos/admin/${conteoId}/reactivar`);
      await cargar();
    } catch (err: any) {
      alert(err.response?.data?.detail ?? "Error al reactivar el conteo.");
    } finally {
      setAccionConteoId(null);
    }
  };

  const handleExportarPDF = async (conteoId: number, cultivoId: number) => {
    setExportando(conteoId);
    try {
      const [resConteo, resCultivo, resProcs, resVars] = await Promise.all([
        api.get(`/conteos/admin/${conteoId}`),
        api
          .get(`/cultivos/admin/todos`)
          .then((r) => r.data.find((c: Cultivo) => c.id === cultivoId)),
        api.get(`/procesamientos/admin/conteo/${conteoId}`),
        api.get("/catalogos/variedades"),
      ]);

      let muestreo = null;
      try {
        const resMuestreo = await api.get(
          `/conteos/admin/${conteoId}/muestreo`,
        );
        if (resMuestreo.data?.clasificaciones?.length)
          muestreo = resMuestreo.data;
      } catch {}

      const variedad = resVars.data.find(
        (v: any) => v.id === resConteo.data.variedad_id,
      );
      const { generarReportePDF } = await import("@/lib/generarReportePDF");
      generarReportePDF({
        conteo: resConteo.data,
        cultivo: resCultivo,
        nombreVariedad: variedad?.nombre ?? "—",
        procesamientos: resProcs.data,
        muestreo,
      });
    } catch {
      alert("Error al generar el reporte.");
    } finally {
      setExportando(null);
    }
  };

  const conteosPorCultivo = cultivos
    .map((cult) => ({
      cultivo: cult,
      conteos: conteosTendencia.filter((c) => c.campo_cultivo_id === cult.id),
    }))
    .filter((g) => g.conteos.length > 0);

  const hayFiltros =
    filtroCultivo || filtroOperador || fechaDesde || fechaHasta;

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Historial de conteos</h1>
          <p className={styles.pageSubtitle}>
            {total} conteo{total !== 1 ? "s" : ""} encontrado
            {total !== 1 ? "s" : ""}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <div
              onClick={() => handleToggleInactivos(!mostrarInactivos)}
              role="switch"
              aria-checked={mostrarInactivos}
              tabIndex={0}
              onKeyDown={(e) =>
                e.key === "Enter" || e.key === " "
                  ? handleToggleInactivos(!mostrarInactivos)
                  : null
              }
              style={{
                width: 36,
                height: 20,
                borderRadius: 99,
                position: "relative",
                background: mostrarInactivos
                  ? "var(--color-primary)"
                  : "var(--color-border)",
                transition: "background 0.2s",
                cursor: "pointer",
                flexShrink: 0,
                outline: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  left: 2,
                  width: 16,
                  height: 16,
                  background: "white",
                  borderRadius: "50%",
                  transition: "transform 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,.15)",
                  transform: mostrarInactivos ? "translateX(16px)" : "none",
                }}
              />
            </div>
            <span
              style={{
                fontSize: "0.82rem",
                color: "var(--color-text-muted)",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              Mostrar desactivados
            </span>
          </label>
          {modoVista === "anual" && conteosAgrupados.length > 0 && (
            <button className={styles.btnPDF} onClick={handleExportarPDFAnual}>
              Exportar PDF anual
            </button>
          )}
          <div className={styles.vistaToggle}>
            {(["tabla", "tendencia", "anual"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setModoVista(v)}
                className={`${styles.vistaBtn} ${modoVista === v ? styles.vistaBtnActivo : ""}`}
              >
                {v === "tabla"
                  ? "Tabla"
                  : v === "tendencia"
                    ? "Tendencia"
                    : "Por año"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.filtros}>
        <div className={styles.filtroGrupo}>
          <label className={styles.filtroLabel}>Campo de cultivo</label>
          <select
            className={styles.filtroSelect}
            value={filtroCultivo}
            onChange={(e) => setFiltroCultivo(e.target.value)}
          >
            <option value="">Todos</option>
            {cultivos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filtroGrupo}>
          <label className={styles.filtroLabel}>Operador</label>
          <select
            className={styles.filtroSelect}
            value={filtroOperador}
            onChange={(e) => setFiltroOperador(e.target.value)}
          >
            <option value="">Todos</option>
            {operadores.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filtroGrupoChico}>
          <label className={styles.filtroLabel}>Desde</label>
          <input
            type="date"
            className={styles.filtroInput}
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
          />
        </div>
        <div className={styles.filtroGrupoChico}>
          <label className={styles.filtroLabel}>Hasta</label>
          <input
            type="date"
            className={styles.filtroInput}
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
          />
        </div>
        {hayFiltros && (
          <div className={styles.filtroLimpiarWrap}>
            <button
              className={styles.btnLimpiar}
              onClick={() => {
                setFiltroCultivo("");
                setFiltroOperador("");
                setFechaDesde("");
                setFechaHasta("");
              }}
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
        </div>
      )}

      {/* Vista tabla */}
      {!loading && modoVista === "tabla" && (
        <div className={styles.tablaWrap}>
          {conteosFiltrados.length === 0 ? (
            <p className={styles.tablaVacia}>
              No se encontraron conteos con los filtros aplicados.
            </p>
          ) : (
            <div className={styles.tablaScroll}>
              <table className={styles.tabla}>
                <thead className={styles.tablaHead}>
                  <tr>
                    {[
                      "#",
                      "Campo de cultivo",
                      "Operador",
                      "Fecha",
                      "Total melones",
                      "Confiabilidad",
                      "Estado",
                      "",
                    ].map((h) => (
                      <th key={h} className={styles.tablaTh}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {conteosFiltrados.map((c, i) => {
                    const inactivo = !c.activo;
                    const enAccion = accionConteoId === c.id;
                    return (
                      <tr
                        key={c.id}
                        className={`${styles.tablaTr} ${inactivo ? "" : styles.tablaTrClick} ${i % 2 !== 0 ? styles.tablaTrImpar : ""}`}
                        style={{
                          opacity: inactivo ? 0.55 : 1,
                          cursor: inactivo ? "default" : "pointer",
                        }}
                        onClick={() =>
                          !inactivo &&
                          router.push(
                            `/cultivos/${c.campo_cultivo_id}/conteos/${c.id}`,
                          )
                        }
                        role={inactivo ? undefined : "button"}
                        tabIndex={inactivo ? undefined : 0}
                        onKeyDown={(e) => {
                          if (
                            !inactivo &&
                            (e.key === "Enter" || e.key === " ")
                          ) {
                            e.preventDefault();
                            router.push(
                              `/cultivos/${c.campo_cultivo_id}/conteos/${c.id}`,
                            );
                          }
                        }}
                      >
                        <td className={`${styles.tablaTd} ${styles.tdId}`}>
                          #{c.id}
                        </td>
                        <td className={styles.tablaTd}>
                          <span
                            className={styles.tdCultivoNombre}
                            style={
                              inactivo
                                ? {
                                    textDecoration: "line-through",
                                    color: "var(--color-text-muted)",
                                  }
                                : {}
                            }
                          >
                            {c.cultivo_nombre ?? `#${c.campo_cultivo_id}`}
                          </span>
                        </td>
                        <td
                          className={`${styles.tablaTd} ${styles.tdOperador}`}
                        >
                          {c.operador_nombre ?? "—"}
                        </td>
                        <td className={styles.tablaTd}>
                          {new Date(
                            c.fecha_conteo + "T00:00:00",
                          ).toLocaleDateString("es-GT", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td
                          className={`${styles.tablaTd} ${c.conteo_total_acumulado > 0 && !inactivo ? styles.tdTotal : styles.tdTotalVacio}`}
                        >
                          {c.conteo_total_acumulado > 0
                            ? c.conteo_total_acumulado.toLocaleString()
                            : "—"}
                        </td>
                        <td className={styles.tablaTd}>
                          {!inactivo ? (
                            <BadgeConfiabilidad
                              nivel={(c as any).nivel_confiabilidad}
                            />
                          ) : (
                            <span
                              style={{
                                color: "var(--color-text-muted)",
                                fontSize: "0.8rem",
                              }}
                            >
                              —
                            </span>
                          )}
                        </td>
                        <td className={styles.tablaTd}>
                          {inactivo ? (
                            <span
                              style={{
                                fontSize: "0.72rem",
                                padding: "2px 9px",
                                borderRadius: "99px",
                                fontWeight: 600,
                                background: "#f3f4f6",
                                color: "#6b7280",
                              }}
                            >
                              Desactivado
                            </span>
                          ) : (
                            <span
                              className={`${styles.badgeEstado} ${c.estado_nombre === "completado" ? styles.badgeCompletado : styles.badgeEnProgreso}`}
                            >
                              {c.estado_nombre === "completado"
                                ? "Completado"
                                : "En progreso"}
                            </span>
                          )}
                        </td>
                        <td
                          className={styles.tablaTd}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className={styles.tdAcciones}>
                            {inactivo ? (
                              <button
                                style={{
                                  padding: "4px 11px",
                                  borderRadius: 7,
                                  border: "1.5px solid var(--color-primary)",
                                  background: "var(--color-primary-light)",
                                  color: "var(--color-primary)",
                                  fontSize: "0.78rem",
                                  fontWeight: 600,
                                  fontFamily: "inherit",
                                  cursor: "pointer",
                                  opacity: enAccion ? 0.5 : 1,
                                }}
                                onClick={() =>
                                  handleReactivarConteo(c.id, c.fecha_conteo)
                                }
                                disabled={enAccion}
                              >
                                {enAccion ? "…" : "Reactivar"}
                              </button>
                            ) : (
                              <>
                                {!enAccion && (
                                  <button
                                    style={{
                                      padding: "4px 6px",
                                      borderRadius: 7,
                                      border: "1.5px solid var(--color-border)",
                                      background: "none",
                                      color: "var(--color-text-muted)",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                    onClick={() =>
                                      handleDesactivarConteo(
                                        c.id,
                                        c.fecha_conteo,
                                      )
                                    }
                                    disabled={enAccion}
                                    title="Desactivar conteo"
                                  >
                                    <svg
                                      width="13"
                                      height="13"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                      <path d="M10 11v6" />
                                      <path d="M14 11v6" />
                                    </svg>
                                  </button>
                                )}
                                {enAccion && (
                                  <span
                                    style={{
                                      fontSize: "0.8rem",
                                      color: "var(--color-text-muted)",
                                    }}
                                  >
                                    …
                                  </span>
                                )}
                                <button
                                  className={styles.btnPDF}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportarPDF(c.id, c.campo_cultivo_id);
                                  }}
                                  disabled={exportando === c.id}
                                >
                                  {exportando === c.id ? "..." : "PDF"}
                                </button>
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className={styles.tdChevron}
                                >
                                  <path d="m9 18 6-6-6-6" />
                                </svg>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {total > PAGE_SIZE && (
            <div className={styles.paginacion}>
              <button
                className={styles.pagBtn}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
              >
                ← Anterior
              </button>
              <span className={styles.pagInfo}>
                Página {pagina} de {Math.ceil(total / PAGE_SIZE)}
              </span>
              <button
                className={styles.pagBtn}
                onClick={() =>
                  setPagina((p) =>
                    Math.min(Math.ceil(total / PAGE_SIZE), p + 1),
                  )
                }
                disabled={pagina >= Math.ceil(total / PAGE_SIZE)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Vista tendencia */}
      {!loading && modoVista === "tendencia" && (
        <div className={styles.tendenciaGrid}>
          {conteosPorCultivo.length === 0 ? (
            <p className={styles.tendenciaSinDatos}>
              No hay datos de tendencia con los filtros aplicados.
            </p>
          ) : (
            conteosPorCultivo.map(({ cultivo, conteos: cs }) => (
              <div key={cultivo.id} className={styles.tendenciaCard}>
                <div className={styles.tendenciaCardHeader}>
                  <p className={styles.tendenciaNombre}>{cultivo.nombre}</p>
                  <p className={styles.tendenciaMeta}>
                    {cs.length} conteo{cs.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <GraficaTendencia conteos={cs} />
                {cs.filter(
                  (c) =>
                    c.estado_nombre === "completado" &&
                    c.conteo_total_acumulado > 0,
                ).length < 2 && (
                  <p className={styles.tendenciaNota}>
                    Se necesitan al menos 2 conteos completados para ver la
                    tendencia.
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Vista anual */}
      {!loading && modoVista === "anual" && (
        <div className={styles.anualWrap}>
          {conteosAgrupados.length === 0 ? (
            <p className={styles.tablaVacia}>
              No hay conteos para agrupar con los filtros aplicados.
            </p>
          ) : (
            <>
              {/* Gráfica de totales anuales */}
              {conteosAgrupados.length >= 2 && (
                <div className={styles.anualGraficaWrap}>
                  <p className={styles.anualGraficaLabel}>
                    Total de melones por año
                  </p>
                  <GraficaAnual grupos={conteosAgrupados} />
                </div>
              )}
              {conteosAgrupados.map((g) => {
                const expandido = anioExpandido === g.anio;
                return (
                  <div key={g.anio} className={styles.anualCard}>
                    {/* Cabecera del año */}
                    <div
                      className={styles.anualHeader}
                      onClick={() =>
                        setAnioExpandido(expandido ? null : g.anio)
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) =>
                        (e.key === "Enter" || e.key === " ") &&
                        setAnioExpandido(expandido ? null : g.anio)
                      }
                    >
                      <div className={styles.anualHeaderLeft}>
                        <span className={styles.anualAnio}>{g.anio}</span>
                        <div className={styles.anualMeta}>
                          <span>
                            {g.conteos.length} conteo
                            {g.conteos.length !== 1 ? "s" : ""}
                          </span>
                          {g.cultivosUnicos.length > 0 && (
                            <span>
                              {g.cultivosUnicos.length === 1
                                ? g.cultivosUnicos[0]
                                : `${g.cultivosUnicos.length} cultivos`}
                            </span>
                          )}
                          {g.variedadesUnicas.length > 0 && (
                            <span>
                              {g.variedadesUnicas.length === 1
                                ? g.variedadesUnicas[0]
                                : `${g.variedadesUnicas.length} variedades`}
                            </span>
                          )}
                          {!g.todosCompletos && (
                            <span className={styles.anualBadgeProgreso}>
                              Hay conteos en progreso
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.anualHeaderRight}>
                        <div className={styles.anualTotalWrap}>
                          <span className={styles.anualTotalLabel}>
                            Total del año
                          </span>
                          <span className={styles.anualTotal}>
                            {g.total.toLocaleString()}
                          </span>
                          <span className={styles.anualTotalSub}>melones</span>
                        </div>
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            transform: expandido ? "rotate(180deg)" : "none",
                            transition: "transform 0.2s",
                            color: "var(--color-text-muted)",
                            flexShrink: 0,
                          }}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </div>
                    </div>

                    {/* Conteos del año expandidos */}
                    {expandido && (
                      <div className={styles.anualDetalle}>
                        <table className={styles.anualTabla}>
                          <thead>
                            <tr className={styles.anualTablaHead}>
                              {[
                                "#",
                                "Cultivo",
                                "Operador",
                                "Fecha",
                                "Total",
                                "Estado",
                              ].map((h) => (
                                <th key={h} className={styles.anualTablaTh}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {g.conteos
                              .slice()
                              .sort(
                                (a, b) =>
                                  new Date(b.fecha_conteo).getTime() -
                                  new Date(a.fecha_conteo).getTime(),
                              )
                              .map((c, i) => (
                                <tr
                                  key={c.id}
                                  className={`${styles.anualTablaTr} ${i % 2 !== 0 ? styles.anualTablaTrImpar : ""} ${c.activo ? styles.anualTablaTrClick : ""}`}
                                  onClick={() =>
                                    c.activo &&
                                    router.push(
                                      `/cultivos/${c.campo_cultivo_id}/conteos/${c.id}`,
                                    )
                                  }
                                  style={{
                                    cursor: c.activo ? "pointer" : "default",
                                    opacity: c.activo ? 1 : 0.5,
                                  }}
                                >
                                  <td
                                    className={styles.anualTablaTd}
                                    style={{
                                      color: "var(--color-text-muted)",
                                      fontSize: "0.8rem",
                                    }}
                                  >
                                    #{c.id}
                                  </td>
                                  <td
                                    className={styles.anualTablaTd}
                                    style={{
                                      fontWeight: 600,
                                      color: "var(--color-primary)",
                                    }}
                                  >
                                    {c.cultivo_nombre ?? "—"}
                                  </td>
                                  <td
                                    className={styles.anualTablaTd}
                                    style={{ color: "var(--color-text-muted)" }}
                                  >
                                    {c.operador_nombre ?? "—"}
                                  </td>
                                  <td className={styles.anualTablaTd}>
                                    {new Date(
                                      c.fecha_conteo + "T00:00:00",
                                    ).toLocaleDateString("es-GT", {
                                      day: "2-digit",
                                      month: "short",
                                    })}
                                  </td>
                                  <td
                                    className={styles.anualTablaTd}
                                    style={{
                                      fontWeight: 700,
                                      fontFamily: "monospace",
                                      color:
                                        c.conteo_total_acumulado > 0
                                          ? "var(--color-primary)"
                                          : "var(--color-text-muted)",
                                    }}
                                  >
                                    {c.conteo_total_acumulado > 0
                                      ? c.conteo_total_acumulado.toLocaleString()
                                      : "—"}
                                  </td>
                                  <td className={styles.anualTablaTd}>
                                    {!c.activo ? (
                                      <span
                                        className={styles.anualBadgeDesactivado}
                                      >
                                        Desactivado
                                      </span>
                                    ) : (
                                      <span
                                        className={`${styles.anualBadgeEstado} ${c.estado_nombre === "completado" ? styles.badgeCompletado : styles.badgeEnProgreso}`}
                                      >
                                        {c.estado_nombre === "completado"
                                          ? "Completado"
                                          : "En progreso"}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

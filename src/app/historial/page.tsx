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
    .filter((c) => c.estado_id === 2 && c.conteo_total_acumulado > 0)
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
                  {new Date(
                    p.conteo.fecha_conteo + "T00:00:00",
                  ).toLocaleDateString("es-GT", {
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
  const [modoVista, setModoVista] = useState<"tabla" | "tendencia">("tabla");
  const [exportando, setExportando] = useState<number | null>(null);
  // Paginación numérica
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;
  // Data completa (sin paginar) para la vista de tendencia
  const [conteosTendencia, setConteosTendencia] = useState<Conteo[]>([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroCultivo) params.append("cultivo_id", filtroCultivo);
      if (filtroOperador) params.append("usuario_id", filtroOperador);
      if (fechaDesde) params.append("fecha_desde", fechaDesde);
      if (fechaHasta) params.append("fecha_hasta", fechaHasta);
      params.append("skip", String((pagina - 1) * PAGE_SIZE));
      params.append("limit", String(PAGE_SIZE));

      const [resHist, resCultivos, resOps] = await Promise.all([
        api.get<{ items: Conteo[]; total: number }>(
          `/conteos/admin/historial?${params}`,
        ),
        api.get<Cultivo[]>("/cultivos/admin/todos"),
        api.get<Usuario[]>("/usuarios/"),
      ]);
      setConteos(resHist.data.items);
      setTotal(resHist.data.total);
      setCultivos(resCultivos.data);
      setOperadores(resOps.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filtroCultivo, filtroOperador, fechaDesde, fechaHasta, pagina]);

  // Al cambiar cualquier filtro, volver a la página 1
  useEffect(() => {
    setPagina(1);
  }, [filtroCultivo, filtroOperador, fechaDesde, fechaHasta]);

  // Cargar TODOS los conteos (respetando filtros) cuando se entra a tendencia
  useEffect(() => {
    if (modoVista !== "tendencia") return;
    const params = new URLSearchParams();
    if (filtroCultivo) params.append("cultivo_id", filtroCultivo);
    if (filtroOperador) params.append("usuario_id", filtroOperador);
    if (fechaDesde) params.append("fecha_desde", fechaDesde);
    if (fechaHasta) params.append("fecha_hasta", fechaHasta);
    params.append("skip", "0");
    params.append("limit", "10000"); // traer todo para la gráfica
    api
      .get<{ items: Conteo[]; total: number }>(
        `/conteos/admin/historial?${params}`,
      )
      .then((r) => setConteosTendencia(r.data.items))
      .catch((err) => console.error(err));
  }, [modoVista, filtroCultivo, filtroOperador, fechaDesde, fechaHasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombreCultivo = (id: number) =>
    cultivos.find((c) => c.id === id)?.nombre ?? `#${id}`;

  const nombreOperador = (conteo: Conteo) =>
    operadores.find((u) => u.id === conteo.created_by)?.nombre ?? "—";

  const conteosFiltrados = conteos;

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
        <div className={styles.vistaToggle}>
          {(["tabla", "tendencia"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setModoVista(v)}
              className={`${styles.vistaBtn} ${modoVista === v ? styles.vistaBtnActivo : ""}`}
            >
              {v === "tabla" ? "Tabla" : "Tendencia"}
            </button>
          ))}
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

      {loading ? (
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
        </div>
      ) : modoVista === "tabla" ? (
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
                  {conteosFiltrados.map((c, i) => (
                    <tr
                      key={c.id}
                      className={`${styles.tablaTr} ${styles.tablaTrClick} ${i % 2 !== 0 ? styles.tablaTrImpar : ""}`}
                      onClick={() =>
                        router.push(
                          `/cultivos/${c.campo_cultivo_id}/conteos/${c.id}`,
                        )
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
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
                        <span className={styles.tdCultivoNombre}>
                          {c.cultivo_nombre ?? `#${c.campo_cultivo_id}`}
                        </span>
                      </td>
                      <td className={`${styles.tablaTd} ${styles.tdOperador}`}>
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
                        className={`${styles.tablaTd} ${c.conteo_total_acumulado > 0 ? styles.tdTotal : styles.tdTotalVacio}`}
                      >
                        {c.conteo_total_acumulado > 0
                          ? c.conteo_total_acumulado.toLocaleString()
                          : "—"}
                      </td>
                      <td className={styles.tablaTd}>
                        <BadgeConfiabilidad
                          nivel={(c as any).nivel_confiabilidad}
                        />
                      </td>
                      <td className={styles.tablaTd}>
                        <span
                          className={`${styles.badgeEstado} ${c.estado_id === 2 ? styles.badgeCompletado : styles.badgeEnProgreso}`}
                        >
                          {c.estado_id === 2 ? "Completado" : "En progreso"}
                        </span>
                      </td>
                      <td className={styles.tablaTd}>
                        <div className={styles.tdAcciones}>
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
                        </div>
                      </td>
                    </tr>
                  ))}
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
      ) : (
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
                  (c) => c.estado_id === 2 && c.conteo_total_acumulado > 0,
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
    </div>
  );
}

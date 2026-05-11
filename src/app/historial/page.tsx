"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Conteo, Cultivo, Usuario } from "@/types";
import styles from "./historial.module.css";

function GraficaTendencia({ conteos }: { conteos: Conteo[] }) {
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

  const points = completados.map((c, i) => {
    const x = PAD + (i / (completados.length - 1)) * w;
    const y = PAD + h - (c.conteo_total_acumulado / max) * h;
    return `${x},${y}`;
  });

  return (
    <div>
      <p className={styles.graficaLabel}>Tendencia (ciclos completados)</p>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ overflow: "visible" }}
      >
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="#52b788"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {completados.map((c, i) => {
          const x = PAD + (i / (completados.length - 1)) * w;
          const y = PAD + h - (c.conteo_total_acumulado / max) * h;
          return (
            <g key={c.id}>
              <circle cx={x} cy={y} r={4} fill="#2d6a4f" />
              <text
                x={x}
                y={y - 8}
                textAnchor="middle"
                fontSize="9"
                fill="#5a7a6a"
              >
                {c.conteo_total_acumulado.toLocaleString()}
              </text>
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
  const [modoVista, setModoVista] = useState<"tabla" | "tendencia">("tabla");
  const [exportando, setExportando] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroCultivo) params.append("cultivo_id", filtroCultivo);
      if (filtroOperador) params.append("usuario_id", filtroOperador);
      if (fechaDesde) params.append("fecha_desde", fechaDesde);
      if (fechaHasta) params.append("fecha_hasta", fechaHasta);

      const [resConteos, resCultivos, resOps] = await Promise.all([
        api.get<Conteo[]>(`/conteos/admin/historial?${params}`),
        api.get<Cultivo[]>("/cultivos/admin/todos"),
        api.get<Usuario[]>("/usuarios/"),
      ]);
      setConteos(resConteos.data);
      setCultivos(resCultivos.data);
      setOperadores(resOps.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filtroCultivo, filtroOperador, fechaDesde, fechaHasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombreCultivo = (id: number) =>
    cultivos.find((c) => c.id === id)?.nombre ?? `#${id}`;

  const nombreOperador = (cultivo_id: number) => {
    const cult = cultivos.find((c) => c.id === cultivo_id);
    if (!cult) return "—";
    return operadores.find((u) => u.id === cult.usuario_id)?.nombre ?? "—";
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
      conteos: conteos.filter((c) => c.cultivo_id === cult.id),
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
            {conteos.length} conteo{conteos.length !== 1 ? "s" : ""} encontrado
            {conteos.length !== 1 ? "s" : ""}
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
          <label className={styles.filtroLabel}>Cultivo</label>
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
          {conteos.length === 0 ? (
            <p className={styles.tablaVacia}>
              No se encontraron conteos con los filtros aplicados.
            </p>
          ) : (
            <table className={styles.tabla}>
              <thead className={styles.tablaHead}>
                <tr>
                  {[
                    "#",
                    "Cultivo",
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
                {conteos.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`${styles.tablaTr} ${i % 2 !== 0 ? styles.tablaTrImpar : ""}`}
                  >
                    <td className={`${styles.tablaTd} ${styles.tdId}`}>
                      #{c.id}
                    </td>
                    <td className={styles.tablaTd}>
                      <button
                        className={styles.tdCultivoBtn}
                        onClick={() =>
                          router.push(
                            `/cultivos/${c.cultivo_id}/conteos/${c.id}`,
                          )
                        }
                      >
                        {nombreCultivo(c.cultivo_id)}
                      </button>
                    </td>
                    <td className={`${styles.tablaTd} ${styles.tdOperador}`}>
                      {nombreOperador(c.cultivo_id)}
                    </td>
                    <td className={styles.tablaTd}>
                      {new Date(c.fecha_conteo).toLocaleDateString("es-GT", {
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
                        nivel={(c as any).nivel_confiabilidad_agregado}
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
                      <button
                        className={styles.btnPDF}
                        onClick={() => handleExportarPDF(c.id, c.cultivo_id)}
                        disabled={exportando === c.id}
                      >
                        {exportando === c.id ? "..." : "PDF"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                    {nombreOperador(cultivo.id)} · {cs.length} conteo
                    {cs.length !== 1 ? "s" : ""}
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

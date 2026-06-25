"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  Conteo,
  ProcesamientoVideo,
  MuestreoResponse,
  ClasificacionCalibre,
  Cultivo,
} from "@/types";
import BtnBack from "@/components/BtnBack";
import styles from "./conteo.module.css";

const colores = ["#2d6a4f", "#52b788", "#74c69d", "#95d5b2", "#b7e4c7"];

function GraficaDistribucion({
  clasificaciones,
}: {
  clasificaciones: ClasificacionCalibre[];
}) {
  if (!clasificaciones.length) return null;

  const max = Math.max(...clasificaciones.map((c) => c.cantidad_extrapolada));
  const total = clasificaciones.reduce((a, c) => a + c.cantidad_extrapolada, 0);

  return (
    <div>
      <h4 className={styles.graficaTitulo}>Distribución por calibre</h4>
      <div className={styles.graficaBars}>
        {clasificaciones.map((c, i) => {
          const heightPct = max > 0 ? (c.cantidad_extrapolada / max) * 100 : 0;
          return (
            <div key={c.calibre_id} className={styles.graficaBarCol}>
              <span
                className={styles.graficaBarVal}
                style={{ color: colores[i % colores.length] }}
              >
                {c.cantidad_extrapolada.toLocaleString()}
              </span>
              <div
                className={styles.graficaBar}
                style={{
                  height: `${heightPct}%`,
                  background: colores[i % colores.length],
                }}
              />
              <span className={styles.graficaBarNombre}>
                {c.nombre_calibre}
              </span>
              <span className={styles.graficaBarPct}>
                {c.porcentaje.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
      <div className={styles.graficaTablaWrap}>
        <table className={styles.graficaTabla}>
          <thead>
            <tr>
              {["Calibre", "Muestreo", "%", "Extrapolado"].map((h) => (
                <th
                  key={h}
                  className={`${styles.graficaTablaTh} ${h === "Calibre" ? styles.graficaTablaThLeft : styles.graficaTablaThRight}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clasificaciones.map((c, i) => (
              <tr
                key={c.calibre_id}
                className={`${styles.graficaTablaTr} ${i % 2 !== 0 ? styles.graficaTablaTrImpar : ""}`}
              >
                <td className={styles.graficaTablaTd}>
                  <span className={styles.graficaTdNombre}>
                    <span
                      className={styles.graficaTdDot}
                      style={{ background: colores[i % colores.length] }}
                    />
                    {c.nombre_calibre}
                  </span>
                </td>
                <td className={styles.graficaTdMono}>
                  {c.cantidad_muestreo} / {c.total_muestreo}
                </td>
                <td className={styles.graficaTdMonoPrimary}>
                  {c.porcentaje.toFixed(1)}%
                </td>
                <td className={styles.graficaTdMonoBold}>
                  {c.cantidad_extrapolada.toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className={styles.graficaTotalTr}>
              <td className={styles.graficaTotalLabel}>Total</td>
              <td className={styles.graficaTablaTd} />
              <td className={styles.graficaTotalVal}>100%</td>
              <td className={styles.graficaTotalVal}>
                {total.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BadgeConfiabilidad({ nivel }: { nivel?: string | null }) {
  if (!nivel) return null;
  const labels: Record<string, string> = {
    alto: "Alta confiabilidad",
    moderado: "Confiabilidad moderada",
    bajo: "Baja confiabilidad",
  };
  const clases: Record<string, string> = {
    alto: styles.badgeAlto,
    moderado: styles.badgeModerado,
    bajo: styles.badgeBajo,
  };
  return (
    <span
      className={`${styles.badgeConfiabilidad} ${clases[nivel] ?? styles.badgeDefault}`}
    >
      {labels[nivel] ?? nivel}
    </span>
  );
}

export default function DetalleConteoPage() {
  const router = useRouter();
  const { id: cultivoId, conteoId } = useParams();

  const [conteo, setConteo] = useState<Conteo | null>(null);
  const [cultivo, setCultivo] = useState<Cultivo | null>(null);
  const [nombreVariedad, setNombreVariedad] = useState("");
  const [procesamientos, setProcesamientos] = useState<ProcesamientoVideo[]>(
    [],
  );
  const [muestreo, setMuestreo] = useState<MuestreoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportando, setExportando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [resConteo, resProcs] = await Promise.all([
        api.get(`/conteos/admin/${conteoId}`),
        api.get(`/procesamientos/admin/conteo/${conteoId}`),
      ]);
      setConteo(resConteo.data);
      setProcesamientos(resProcs.data);

      const [resVars, resCultivos] = await Promise.all([
        api.get("/catalogos/variedades"),
        api.get("/cultivos/admin/todos"),
      ]);

      setNombreVariedad(
        resVars.data.find((v: any) => v.id === resConteo.data.variedad_id)
          ?.nombre ?? "—",
      );
      setCultivo(
        resCultivos.data.find(
          (c: any) => c.id === resConteo.data.campo_cultivo_id,
        ) ?? null,
      );

      try {
        const resMuestreo = await api.get(
          `/conteos/admin/${conteoId}/muestreo`,
        );
        if (resMuestreo.data.clasificaciones?.length)
          setMuestreo(resMuestreo.data);
      } catch {}
    } catch {
      setError("Error al cargar el conteo.");
    } finally {
      setLoading(false);
    }
  }, [conteoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleExportarPDF = async () => {
    if (!conteo || !cultivo) return;
    setExportando(true);
    try {
      const { generarReportePDF } = await import("@/lib/generarReportePDF");
      generarReportePDF({
        conteo,
        cultivo,
        nombreVariedad,
        procesamientos,
        muestreo,
      });
    } catch {
      alert("Error al generar el reporte PDF.");
    } finally {
      setExportando(false);
    }
  };

  if (loading)
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <span>Cargando conteo...</span>
      </div>
    );

  if (!conteo || error)
    return (
      <div className={styles.errorWrap}>{error || "Conteo no encontrado."}</div>
    );

  const conteoEfectivo = (p: ProcesamientoVideo) =>
    p.resultado?.conteo_ajustado ?? p.resultado?.conteo_ia ?? 0;

  const estadoNombre = conteo.estado_id === 2 ? "Completado" : "En progreso";

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <BtnBack onClick={() => router.back()} label="Volver" />
          <h1 className={styles.pageTitle}>
            Conteo #{conteo.id}
            {cultivo && (
              <span className={styles.pageTitleMuted}> — {cultivo.nombre}</span>
            )}
          </h1>
          <div className={styles.metaRow}>
            <span className={styles.metaFecha}>
              {new Date(conteo.fecha_conteo).toLocaleDateString("es-GT", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span
              className={`${styles.badgeEstado} ${conteo.estado_id === 2 ? styles.badgeCompletado : styles.badgeEnProgreso}`}
            >
              {estadoNombre}
            </span>
            <BadgeConfiabilidad nivel={(conteo as any).nivel_confiabilidad} />
          </div>
        </div>
        <button
          className={styles.btnExportar}
          onClick={handleExportarPDF}
          disabled={exportando}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {exportando ? "Generando..." : "Exportar PDF"}
        </button>
      </div>

      {/* Hero */}
      <div className={styles.hero}>
        <div>
          <p className={styles.heroLabel}>Total acumulado</p>
          <p className={styles.heroTotal}>
            {conteo.conteo_total_acumulado.toLocaleString()}
          </p>
          <p className={styles.heroSub}>melones · {nombreVariedad}</p>
        </div>
        <div className={styles.heroMeta}>
          <p className={styles.heroMetaVideos}>
            {procesamientos.length} video
            {procesamientos.length !== 1 ? "s" : ""}
          </p>
          {cultivo && (
            <p className={styles.heroMetaSurcos}>
              {cultivo.total_surcos} surcos totales
            </p>
          )}
        </div>
      </div>

      {/* Videos procesados */}
      <div className={styles.panel}>
        <h3 className={styles.panelTitle}>Videos procesados</h3>
        {procesamientos.length === 0 ? (
          <p className={styles.sinDatos}>Sin videos procesados aún.</p>
        ) : (
          <div className={styles.procList}>
            {procesamientos.map((p) => {
              const estadoProc =
                p.estado_id === 2
                  ? "completado"
                  : p.estado_id === 3
                    ? "error"
                    : "procesando";
              const badgeClase =
                estadoProc === "completado"
                  ? styles.badgeProcCompletado
                  : estadoProc === "error"
                    ? styles.badgeProcError
                    : styles.badgeProcProcesando;
              return (
                <div
                  key={p.id}
                  className={styles.procItem}
                  onClick={() =>
                    router.push(`/cultivos/${cultivoId}/procesamientos/${p.id}`)
                  }
                  style={{ cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      router.push(
                        `/cultivos/${cultivoId}/procesamientos/${p.id}`,
                      );
                    }
                  }}
                >
                  <div className={styles.procInfo}>
                    <span className={styles.procNombre}>
                      Surcos {p.surco_inicio}–{p.surco_fin}
                    </span>
                    <span className={styles.procFecha}>
                      {new Date(p.fecha_grabacion).toLocaleDateString("es-GT")}
                    </span>
                  </div>
                  <div className={styles.procRight}>
                    {p.resultado && (
                      <>
                        <div className={styles.procStatWrap}>
                          <p className={styles.procStatLabel}>IA</p>
                          <p className={styles.procStatVal}>
                            {p.resultado.conteo_ia.toLocaleString()}
                          </p>
                        </div>
                        {p.resultado.conteo_ajustado != null && (
                          <div className={styles.procStatWrap}>
                            <p className={styles.procStatLabel}>Ajustado</p>
                            <p className={styles.procStatValPrimary}>
                              {p.resultado.conteo_ajustado.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {(p.resultado as any).nivel_confiabilidad && (
                          <BadgeConfiabilidad
                            nivel={(p.resultado as any).nivel_confiabilidad}
                          />
                        )}
                      </>
                    )}
                    <span className={`${styles.badgeProcEstado} ${badgeClase}`}>
                      {estadoProc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Calibres */}
      <div className={`${styles.panel} ${styles.panelBottom}`}>
        <h3 className={styles.panelTitle}>Segmentación por calibre</h3>
        <p className={styles.panelSubtitle}>
          Distribución extrapolada basada en el muestreo manual del operador.
        </p>
        {!muestreo || muestreo.clasificaciones.length === 0 ? (
          <div className={styles.sinMuestreo}>
            El operador aún no ha registrado el muestreo de calibres para este
            conteo.
          </div>
        ) : (
          <GraficaDistribucion clasificaciones={muestreo.clasificaciones} />
        )}
      </div>
    </div>
  );
}

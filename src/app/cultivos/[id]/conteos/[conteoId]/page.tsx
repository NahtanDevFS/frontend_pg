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
  // Acordeón: id del procesamiento expandido (o null)
  const [videoExpandido, setVideoExpandido] = useState<number | null>(null);
  // Id del procesamiento cuyo video se está descargando
  const [descargandoId, setDescargandoId] = useState<number | null>(null);
  // Estados de conteo disponibles + control de cambio (admin)
  const [estadosConteo, setEstadosConteo] = useState<
    { id: number; nombre: string }[]
  >([]);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  // Toggle para mostrar procesamientos cancelados
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  // Id del procesamiento en acción (cancelar/reactivar)
  const [accionProcId, setAccionProcId] = useState<number | null>(null);

  const cargar = useCallback(
    async (inclCancelados?: boolean) => {
      const incluir = inclCancelados ?? mostrarCancelados;
      try {
        const [resConteo, resProcs] = await Promise.all([
          api.get(`/conteos/admin/${conteoId}`),
          api.get(
            `/procesamientos/admin/conteo/${conteoId}${incluir ? "?incluir_cancelados=true" : ""}`,
          ),
        ]);
        setConteo(resConteo.data);
        setProcesamientos(resProcs.data);

        api
          .get<{ id: number; nombre: string }[]>("/catalogos/estados-conteo")
          .then((r) => setEstadosConteo(r.data))
          .catch(() => {});

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
    },
    [conteoId, mostrarCancelados],
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleToggleCancelados = (checked: boolean) => {
    setMostrarCancelados(checked);
    cargar(checked);
  };

  // Cambia el estado del conteo (admin, libre entre estados)
  const handleCambiarEstado = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const nuevoEstadoId = Number(e.target.value);
    if (!conteo || nuevoEstadoId === conteo.estado_id) return;
    const estadoNombreNuevo =
      estadosConteo.find((es) => es.id === nuevoEstadoId)?.nombre ??
      "ese estado";
    const ok = window.confirm(
      `¿Cambiar el estado del conteo a "${estadoNombreNuevo.replace(/_/g, " ")}"?`,
    );
    if (!ok) return;
    setCambiandoEstado(true);
    try {
      const { data } = await api.patch(`/conteos/admin/${conteoId}/estado`, {
        estado_id: nuevoEstadoId,
      });
      setConteo(data);
    } catch (err: any) {
      alert(err.response?.data?.detail ?? "No se pudo cambiar el estado.");
    } finally {
      setCambiandoEstado(false);
    }
  };

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

  const handleDescargarVideo = async (procId: number) => {
    setDescargandoId(procId);
    try {
      const { data } = await api.get(
        `/procesamientos/admin/${procId}/video-anotado`,
        { responseType: "blob" },
      );
      const objectUrl = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `video_anotado_procesamiento_${procId}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      alert("No se pudo descargar el video.");
    } finally {
      setDescargandoId(null);
    }
  };

  const handleCancelarProcesamiento = async (p: ProcesamientoVideo) => {
    const ok = window.confirm(
      `¿Anular el procesamiento de surcos ${p.surco_inicio}–${p.surco_fin}? Su conteo quedará excluido del total acumulado.`,
    );
    if (!ok) return;
    setAccionProcId(p.id);
    try {
      await api.patch(`/procesamientos/admin/${p.id}/cancelar`);
      await cargar();
      setVideoExpandido(null);
    } catch (err: any) {
      alert(
        err.response?.data?.detail ?? "No se pudo anular el procesamiento.",
      );
    } finally {
      setAccionProcId(null);
    }
  };

  const handleReactivarProcesamiento = async (p: ProcesamientoVideo) => {
    const ok = window.confirm(
      `¿Reactivar el procesamiento de surcos ${p.surco_inicio}–${p.surco_fin}? Su conteo volverá a sumarse al total acumulado.`,
    );
    if (!ok) return;
    setAccionProcId(p.id);
    try {
      await api.patch(`/procesamientos/admin/${p.id}/reactivar`);
      await cargar();
      setVideoExpandido(null);
    } catch (err: any) {
      alert(
        err.response?.data?.detail ?? "No se pudo reactivar el procesamiento.",
      );
    } finally {
      setAccionProcId(null);
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

  const estadoNombre =
    conteo.estado_nombre === "completado" ? "Completado" : "En progreso";
  const procsActivos = procesamientos.filter((p) => p.activo !== false);
  const procsCancelados = procesamientos.filter((p) => p.activo === false);

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div className={styles.headerInfo}>
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
              className={`${styles.badgeEstado} ${conteo.estado_nombre === "completado" ? styles.badgeCompletado : styles.badgeEnProgreso}`}
            >
              {estadoNombre}
            </span>
            <BadgeConfiabilidad nivel={(conteo as any).nivel_confiabilidad} />
            {estadosConteo.length > 0 && (
              <select
                className={styles.estadoSelect}
                value={conteo.estado_id}
                onChange={handleCambiarEstado}
                disabled={cambiandoEstado}
                title="Cambiar estado del conteo"
                style={{ textTransform: "capitalize" }}
              >
                {estadosConteo.map((es) => (
                  <option key={es.id} value={es.id}>
                    {es.nombre.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <button
          className={styles.btnExportar}
          onClick={handleExportarPDF}
          disabled={exportando}
        >
          <svg
            width="16"
            height="16"
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
        <div className={styles.heroLeft}>
          <p className={styles.heroLabel}>Total acumulado</p>
          <p className={styles.heroTotal}>
            {conteo.conteo_total_acumulado.toLocaleString()}
          </p>
          <p className={styles.heroSub}>melones · {nombreVariedad}</p>
        </div>
        <div className={styles.heroMeta}>
          <p className={styles.heroMetaVideos}>
            {procsActivos.length} video{procsActivos.length !== 1 ? "s" : ""}
          </p>
          {cultivo && (
            <p className={styles.heroMetaSurcos}>
              {cultivo.total_surcos} surcos totales
            </p>
          )}
        </div>
      </div>

      {/* Descripción del nivel de confianza */}
      {(conteo as any).nivel_confiabilidad && (
        <div className={styles.confianzaCard}>
          <p className={styles.confianzaTitulo}>
            Nivel de confianza IA:{" "}
            <span style={{ textTransform: "capitalize" }}>
              {(conteo as any).nivel_confiabilidad}
            </span>
          </p>
          {conteo.porcentaje_baja_confianza_sesion != null && (
            <p className={styles.confianzaDesc}>
              {Math.round((1 - conteo.porcentaje_baja_confianza_sesion) * 100)}%
              de detecciones con alta confianza,{" "}
              {Math.round(conteo.porcentaje_baja_confianza_sesion * 100)}% con
              baja confianza.
            </p>
          )}
        </div>
      )}

      {/* Videos procesados */}
      <div className={styles.panel}>
        {/* Header del panel con toggle */}
        <div className={styles.procPanelHeader}>
          <h3 className={styles.panelTitle} style={{ marginBottom: 0 }}>
            Videos procesados
          </h3>
          <label className={styles.toggleLabel}>
            <div
              className={`${styles.toggle} ${mostrarCancelados ? styles.toggleOn : ""}`}
              onClick={() => handleToggleCancelados(!mostrarCancelados)}
              role="switch"
              aria-checked={mostrarCancelados}
              tabIndex={0}
              onKeyDown={(e) =>
                e.key === "Enter" || e.key === " "
                  ? handleToggleCancelados(!mostrarCancelados)
                  : null
              }
            >
              <div className={styles.toggleThumb} />
            </div>
            <span className={styles.toggleText}>Mostrar anulados</span>
          </label>
        </div>

        {/* Procesamientos activos */}
        {procsActivos.length === 0 ? (
          <p className={styles.sinDatos}>Sin videos procesados activos.</p>
        ) : (
          <div className={styles.procListScroll}>
            <div className={styles.procList}>
              {procsActivos.map((p) => {
                const estadoProc = p.estado_nombre ?? "procesando";
                const badgeClase =
                  estadoProc === "completado"
                    ? styles.badgeProcCompletado
                    : estadoProc === "error"
                      ? styles.badgeProcError
                      : styles.badgeProcProcesando;
                const expandido = videoExpandido === p.id;
                const obs = p.resultado?.observaciones_ajuste;
                const enAccion = accionProcId === p.id;
                return (
                  <div key={p.id} className={styles.procCard}>
                    <div
                      className={styles.procItem}
                      onClick={() => setVideoExpandido(expandido ? null : p.id)}
                      style={{ cursor: "pointer" }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setVideoExpandido(expandido ? null : p.id);
                        }
                      }}
                    >
                      <div className={styles.procInfo}>
                        <span className={styles.procNombre}>
                          Surcos {p.surco_inicio}–{p.surco_fin}
                        </span>
                        <span className={styles.procFecha}>
                          {new Date(p.fecha_grabacion).toLocaleDateString(
                            "es-GT",
                          )}
                        </span>
                      </div>
                      <div className={styles.procRight}>
                        <div className={styles.procStats}>
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
                                  <p className={styles.procStatLabel}>
                                    Ajustado
                                  </p>
                                  <p className={styles.procStatValPrimary}>
                                    {p.resultado.conteo_ajustado.toLocaleString()}
                                  </p>
                                </div>
                              )}
                              {(p.resultado as any).nivel_confiabilidad && (
                                <div className={styles.procBadgeWrapper}>
                                  <BadgeConfiabilidad
                                    nivel={
                                      (p.resultado as any).nivel_confiabilidad
                                    }
                                  />
                                </div>
                              )}
                            </>
                          )}
                          <span
                            className={`${styles.badgeProcEstado} ${badgeClase}`}
                          >
                            {estadoProc}
                          </span>
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
                            color: "var(--color-text-muted, #8fa898)",
                            flexShrink: 0,
                          }}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </div>
                    </div>

                    {expandido && (
                      <div className={styles.procDetalle}>
                        {p.resultado?.nivel_confiabilidad &&
                          p.resultado.porcentaje_baja_confianza != null && (
                            <div className={styles.procDetalleObs}>
                              <p className={styles.procDetalleLabel}>
                                Confianza de este video
                              </p>
                              <p className={styles.procDetalleTexto}>
                                {Math.round(
                                  (1 - p.resultado.porcentaje_baja_confianza) *
                                    100,
                                )}
                                % de detecciones con alta confianza,{" "}
                                {Math.round(
                                  p.resultado.porcentaje_baja_confianza * 100,
                                )}
                                % con baja confianza.
                              </p>
                            </div>
                          )}
                        <div className={styles.procDetalleObs}>
                          <p className={styles.procDetalleLabel}>
                            Observaciones del operador
                          </p>
                          <p className={styles.procDetalleTexto}>
                            {obs && obs.trim()
                              ? obs
                              : "Sin observaciones registradas."}
                          </p>
                        </div>
                        <div className={styles.procDetalleAcciones}>
                          {p.video_anotado_url ? (
                            <button
                              className={styles.btnDescargarVideo}
                              onClick={() => handleDescargarVideo(p.id)}
                              disabled={descargandoId === p.id}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                              {descargandoId === p.id
                                ? "Descargando…"
                                : "Descargar video anotado"}
                            </button>
                          ) : (
                            <p className={styles.procDetalleSinVideo}>
                              Video anotado no disponible.
                            </p>
                          )}
                          <button
                            className={styles.btnAnularProc}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelarProcesamiento(p);
                            }}
                            disabled={enAccion}
                          >
                            {enAccion ? "Anulando…" : "Anular procesamiento"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sección de cancelados */}
        {mostrarCancelados && procsCancelados.length > 0 && (
          <>
            <div className={styles.seccionCanceladosDivider}>
              <span>Anulados ({procsCancelados.length})</span>
            </div>
            <div className={styles.procList}>
              {procsCancelados.map((p) => {
                const expandido = videoExpandido === p.id;
                const enAccion = accionProcId === p.id;
                return (
                  <div
                    key={p.id}
                    className={`${styles.procCard} ${styles.procCardCancelado}`}
                  >
                    <div
                      className={styles.procItem}
                      onClick={() => setVideoExpandido(expandido ? null : p.id)}
                      style={{ cursor: "pointer" }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setVideoExpandido(expandido ? null : p.id);
                        }
                      }}
                    >
                      <div className={styles.procInfo}>
                        <span
                          className={`${styles.procNombre} ${styles.procNombreCancelado}`}
                        >
                          Surcos {p.surco_inicio}–{p.surco_fin}
                        </span>
                        <span className={styles.procFecha}>
                          {new Date(p.fecha_grabacion).toLocaleDateString(
                            "es-GT",
                          )}
                        </span>
                      </div>
                      <div className={styles.procRight}>
                        <div className={styles.procStats}>
                          {p.resultado && (
                            <div className={styles.procStatWrap}>
                              <p className={styles.procStatLabel}>IA</p>
                              <p className={styles.procStatVal}>
                                {p.resultado.conteo_ia.toLocaleString()}
                              </p>
                            </div>
                          )}
                          <span
                            className={`${styles.badgeProcEstado} ${styles.badgeProcCancelado}`}
                          >
                            anulado
                          </span>
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
                            color: "var(--color-text-muted, #8fa898)",
                            flexShrink: 0,
                          }}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </div>
                    </div>

                    {expandido && (
                      <div className={styles.procDetalle}>
                        <div className={styles.procDetalleObs}>
                          <p className={styles.procDetalleLabel}>
                            Observaciones
                          </p>
                          <p className={styles.procDetalleTexto}>
                            {p.resultado?.observaciones_ajuste?.trim() ||
                              "Sin observaciones registradas."}
                          </p>
                        </div>
                        <div className={styles.procDetalleAcciones}>
                          {p.resultado ? (
                            <button
                              className={styles.btnReactivarProc}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReactivarProcesamiento(p);
                              }}
                              disabled={enAccion}
                            >
                              {enAccion
                                ? "Reactivando…"
                                : "Reactivar procesamiento"}
                            </button>
                          ) : (
                            <p className={styles.procDetalleSinVideo}>
                              Sin resultado de IA — no puede reactivarse.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {mostrarCancelados && procsCancelados.length === 0 && (
          <p className={styles.sinCanceladosMsg}>
            No hay procesamientos anulados en este conteo.
          </p>
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

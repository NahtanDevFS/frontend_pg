"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Procesamiento } from "@/types";
import styles from "./detalle.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const CALIBRES = [
  { id: 1, nombre: "6" },
  { id: 2, nombre: "9J" },
  { id: 3, nombre: "9S" },
  { id: 4, nombre: "12" },
  { id: 5, nombre: "15" },
];

export default function DetalleProcesamientoPage() {
  const router = useRouter();
  const params = useParams();
  const cultivoId = params.id as string;
  const procesamientoId = params.procesamientoId as string;

  const [procesamiento, setProcesamiento] = useState<Procesamiento | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [conteoAjustado, setConteoAjustado] = useState(0);
  const [observaciones, setObservaciones] = useState("");
  const [distribucion, setDistribucion] = useState<{ [key: number]: number }>(
    {},
  );
  const [ajustando, setAjustando] = useState(false);
  const [mostrarVideo, setMostrarVideo] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get<Procesamiento>(
          `/procesamientos/${procesamientoId}`,
        );
        setProcesamiento(data);
        if (data.resultado) {
          setConteoAjustado(
            data.resultado.conteo_final_ajustado ?? data.resultado.conteo_ia,
          );
          setObservaciones(data.resultado.observaciones_ajuste || "");
          if (data.resultado.calibres?.length) {
            const dist: { [key: number]: number } = {};
            data.resultado.calibres.forEach((c) => {
              dist[c.calibre_id] = c.porcentaje_muestreo * 100;
            });
            setDistribucion(dist);
          }
        }
      } catch {
        alert("Error al cargar los detalles.");
      } finally {
        setLoading(false);
      }
    };
    if (procesamientoId) fetch();
  }, [procesamientoId]);

  const totalPct = Object.values(distribucion).reduce((a, b) => a + b, 0);
  const hayDist = totalPct > 0;

  const handleAjusteManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procesamiento) return;
    if (hayDist && totalPct !== 100) {
      alert("La suma de los porcentajes debe ser 100%.");
      return;
    }
    const calibresArray = Object.entries(distribucion)
      .map(([id, v]) => ({ calibre_id: parseInt(id), porcentaje: v / 100 }))
      .filter((c) => c.porcentaje > 0);
    setAjustando(true);
    try {
      await api.post(`/procesamientos/${procesamiento.id}/ajustar-resultado`, {
        conteo_ajustado: conteoAjustado,
        observaciones,
        calibres: calibresArray,
      });
      alert("¡Ajuste guardado correctamente!");
      router.push(`/cultivos/${cultivoId}`);
    } catch {
      alert("Error al guardar el ajuste.");
    } finally {
      setAjustando(false);
    }
  };

  if (loading)
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <span>Cargando análisis...</span>
      </div>
    );
  if (!procesamiento)
    return (
      <div className={styles.errorAlert}>No se encontró el procesamiento.</div>
    );

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <button
            className={styles.btnBack}
            onClick={() => router.push(`/cultivos/${cultivoId}`)}
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
              <path d="m15 18-6-6 6-6" />
            </svg>
            Volver al historial
          </button>
          <h1 className={styles.pageTitle}>Análisis #{procesamiento.id}</h1>
          <p className={styles.pageSubtitle}>
            {new Date(procesamiento.fecha_grabacion).toLocaleDateString(
              "es-GT",
              {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              },
            )}
          </p>
        </div>
      </div>

      {/* Result hero */}
      <div className={styles.resultHero}>
        <div className={styles.resultHeroLeft}>
          <span className={styles.resultLabel}>Melones detectados por IA</span>
          <div className={styles.resultCount}>
            <span className={styles.resultNum}>
              {procesamiento.resultado?.conteo_ia ?? "—"}
            </span>
            <span className={styles.resultUnit}>melones</span>
          </div>
        </div>
        {procesamiento.resultado?.conteo_final_ajustado !== null &&
          procesamiento.resultado?.conteo_final_ajustado !== undefined && (
            <div className={styles.resultAdjusted}>
              <span className={styles.resultAdjLabel}>Ajustado a</span>
              <span className={styles.resultAdjNum}>
                {procesamiento.resultado.conteo_final_ajustado}
              </span>
            </div>
          )}
      </div>

      {/* Video */}
      {procesamiento.video_anotado_url ? (
        <div className={styles.videoSection}>
          <button
            className={styles.videoToggle}
            onClick={() => setMostrarVideo(!mostrarVideo)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {mostrarVideo ? "Ocultar video anotado" : "Ver video anotado"}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                marginLeft: "auto",
                transform: mostrarVideo ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {mostrarVideo && (
            <video controls className={styles.videoPlayer}>
              <source
                src={`${API_URL}/videos/${procesamiento.video_anotado_url.split("/").pop()}`}
                type="video/mp4"
              />
            </video>
          )}
        </div>
      ) : (
        <div className={styles.noVideo}>
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
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          Video anotado no disponible aún.
        </div>
      )}

      {/* Adjust form */}
      <form onSubmit={handleAjusteManual} className={styles.adjustForm}>
        <div className={styles.adjustHeader}>
          <h3 className={styles.adjustTitle}>
            Ajuste manual y segmentación por calibres
          </h3>
          <p className={styles.adjustSubtitle}>
            Rectifica el conteo si fue necesario y distribuye por calibre
          </p>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Conteo final rectificado</label>
            <input
              type="number"
              min="0"
              required
              value={conteoAjustado}
              onChange={(e) => setConteoAjustado(Number(e.target.value))}
              className={styles.bigInput}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Observaciones (opcional)</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              placeholder="Ej: La cámara no captó la hilera izquierda al inicio..."
            />
          </div>
        </div>

        <div className={styles.calibresSection}>
          <h4 className={styles.calibresTitle}>Distribución por calibre (%)</h4>
          <div className={styles.calibreGrid}>
            {CALIBRES.map((calibre) => {
              const pct = distribucion[calibre.id] || 0;
              const cant = Math.round((pct / 100) * conteoAjustado);
              return (
                <div key={calibre.id} className={styles.calibreCard}>
                  <div className={styles.calibreHeader}>
                    <span className={styles.calibreName}>
                      C-{calibre.nombre}
                    </span>
                    <span className={styles.calibreCount}>{cant} un.</span>
                  </div>
                  <div className={styles.calibreInputRow}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={distribucion[calibre.id] || ""}
                      onChange={(e) =>
                        setDistribucion((prev) => ({
                          ...prev,
                          [calibre.id]: Number(e.target.value),
                        }))
                      }
                      className={styles.calibreInput}
                    />
                    <span className={styles.pctSymbol}>%</span>
                  </div>
                  {pct > 0 && (
                    <div className={styles.calibreBar}>
                      <div
                        className={styles.calibreBarFill}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {hayDist && (
            <div
              className={`${styles.pctStatus} ${totalPct === 100 ? styles.pctOk : totalPct > 100 ? styles.pctError : styles.pctWarn}`}
            >
              <strong>{totalPct}%</strong>
              <span>
                {totalPct === 100 && "✓ Distribución completa"}
                {totalPct < 100 && totalPct > 0 && `Faltan ${100 - totalPct}%`}
                {totalPct > 100 && `Excede en ${totalPct - 100}%`}
              </span>
            </div>
          )}
        </div>

        <button
          type="submit"
          className={styles.btnSubmit}
          disabled={ajustando || (hayDist && totalPct !== 100)}
        >
          {ajustando ? (
            <>
              <span className={styles.btnSpinner} /> Guardando...
            </>
          ) : (
            <>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Guardar ajuste final
            </>
          )}
        </button>
      </form>
    </div>
  );
}

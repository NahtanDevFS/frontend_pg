"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Procesamiento } from "@/types";
import styles from "./detalle.module.css";

export default function DetalleCultivoPage() {
  const router = useRouter();
  const { id: cultivoId } = useParams();
  const [historial, setHistorial] = useState<Procesamiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const response = await api.get(`/procesamientos/cultivo/${cultivoId}`);
        setHistorial(response.data);
      } catch {
        setError("Error al cargar el historial de este cultivo.");
      } finally {
        setLoading(false);
      }
    };
    fetchHistorial();
  }, [cultivoId]);

  if (loading)
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <span>Cargando historial...</span>
      </div>
    );

  const completados = historial.filter((p) => p.estado === "completado").length;

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <button
            className={styles.btnBack}
            onClick={() => router.push("/dashboard")}
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
            Volver a cultivos
          </button>
          <h1 className={styles.pageTitle}>Historial de análisis</h1>
          <p className={styles.pageSubtitle}>
            {completados} análisis completados
          </p>
        </div>
        <button
          className={styles.btnPrimary}
          onClick={() => router.push(`/cultivos/${cultivoId}/procesar`)}
        >
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
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Nuevo conteo
        </button>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}

      {historial.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <p>Aún no has analizado ningún video para este cultivo.</p>
          <button
            className={styles.btnPrimarySmall}
            onClick={() => router.push(`/cultivos/${cultivoId}/procesar`)}
          >
            Subir primer video
          </button>
        </div>
      ) : (
        <div className={styles.analysisList}>
          {historial.map((proc, i) => (
            <div
              key={proc.id}
              className={styles.analysisCard}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className={styles.analysisLeft}>
                <div className={styles.analysisId}>#{proc.id}</div>
                <div className={styles.analysisInfo}>
                  <span className={styles.analysisDate}>
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
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {new Date(proc.fecha_grabacion).toLocaleDateString(
                      "es-GT",
                      { day: "2-digit", month: "short", year: "numeric" },
                    )}
                  </span>
                  <span className={`${styles.badge} ${styles[proc.estado]}`}>
                    {proc.estado}
                  </span>
                </div>
              </div>

              <div className={styles.analysisCounts}>
                <div className={styles.countBlock}>
                  <span className={styles.countLabel}>IA</span>
                  <span className={styles.countNum}>
                    {proc.resultado?.conteo_ia ?? "—"}
                  </span>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#b7ccc2"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
                <div className={styles.countBlock}>
                  <span className={styles.countLabel}>Ajustado</span>
                  <span
                    className={`${styles.countNum} ${styles.countAdjusted}`}
                  >
                    {proc.resultado?.conteo_final_ajustado !== null &&
                    proc.resultado?.conteo_final_ajustado !== undefined
                      ? proc.resultado.conteo_final_ajustado
                      : "—"}
                  </span>
                </div>
              </div>

              <div className={styles.analysisActions}>
                {proc.estado === "completado" && (
                  <button
                    className={styles.btnDetails}
                    onClick={() =>
                      router.push(
                        `/cultivos/${cultivoId}/procesamientos/${proc.id}`,
                      )
                    }
                  >
                    Ver detalles
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

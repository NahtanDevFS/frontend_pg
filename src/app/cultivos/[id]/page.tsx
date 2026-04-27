"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { SesionConteo } from "@/types";
import styles from "./detalle.module.css";

export default function DetalleCultivoPage() {
  const router = useRouter();
  const { id: cultivoId } = useParams();
  const [sesiones, setSesiones] = useState<SesionConteo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSesiones = async () => {
      try {
        const response = await api.get(`/sesiones/cultivo/${cultivoId}`);
        setSesiones(response.data);
      } catch {
        setError("Error al cargar el historial de este cultivo.");
      } finally {
        setLoading(false);
      }
    };
    fetchSesiones();
  }, [cultivoId]);

  if (loading)
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <span>Cargando historial...</span>
      </div>
    );

  const completadas = sesiones.filter((s) => s.estado_id === 2).length;

  const estadoBadge = (estado_id: number) => {
    if (estado_id === 2) return { label: "completada", cls: styles.completado };
    return { label: "en progreso", cls: styles.procesando };
  };

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
          <h1 className={styles.pageTitle}>Sesiones de conteo</h1>
          <p className={styles.pageSubtitle}>
            {completadas} sesión{completadas !== 1 ? "es" : ""} completada
            {completadas !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          className={styles.btnPrimary}
          onClick={() => router.push(`/cultivos/${cultivoId}/sesiones/nueva`)}
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
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nueva sesión
        </button>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}

      {sesiones.length === 0 ? (
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
          <p>Aún no has iniciado ninguna sesión de conteo para este cultivo.</p>
          <button
            className={styles.btnPrimarySmall}
            onClick={() => router.push(`/cultivos/${cultivoId}/sesiones/nueva`)}
          >
            Iniciar primera sesión
          </button>
        </div>
      ) : (
        <div className={styles.analysisList}>
          {sesiones.map((sesion, i) => {
            const badge = estadoBadge(sesion.estado_id);
            return (
              <div
                key={sesion.id}
                className={styles.analysisCard}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className={styles.analysisLeft}>
                  <div className={styles.analysisId}>#{sesion.id}</div>
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
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {new Date(sesion.fecha_sesion).toLocaleDateString(
                        "es-GT",
                        { day: "2-digit", month: "short", year: "numeric" },
                      )}
                    </span>
                    <span className={`${styles.badge} ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>

                <div className={styles.analysisCounts}>
                  <div className={styles.countBlock}>
                    <span className={styles.countLabel}>Total</span>
                    <span
                      className={`${styles.countNum} ${styles.countAdjusted}`}
                    >
                      {sesion.conteo_total_acumulado}
                    </span>
                  </div>
                </div>

                <div className={styles.analysisActions}>
                  <button
                    className={styles.btnDetails}
                    onClick={() =>
                      router.push(
                        `/cultivos/${cultivoId}/sesiones/${sesion.id}`,
                      )
                    }
                  >
                    Ver sesión
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Conteo } from "@/types";
import styles from "./detalle.module.css";

export default function DetalleCultivoPage() {
  const router = useRouter();
  const { id: cultivoId } = useParams();
  const [conteos, setConteos] = useState<Conteo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/conteos/cultivo/${cultivoId}`)
      .then((r) => setConteos(r.data))
      .catch(() => setError("Error al cargar los conteos de este cultivo."))
      .finally(() => setLoading(false));
  }, [cultivoId]);

  if (loading)
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <span>Cargando conteos...</span>
      </div>
    );

  const completados = conteos.filter((c) => c.estado_id === 2).length;

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
          <h1 className={styles.pageTitle}>Conteos</h1>
          <p className={styles.pageSubtitle}>
            {completados} conteo{completados !== 1 ? "s" : ""} completado
            {completados !== 1 ? "s" : ""}
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

      {conteos.length === 0 ? (
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
          <p>Aún no hay conteos registrados para este cultivo.</p>
          <button
            className={styles.btnPrimarySmall}
            onClick={() => router.push(`/cultivos/${cultivoId}/procesar`)}
          >
            Iniciar primer conteo
          </button>
        </div>
      ) : (
        <div className={styles.analysisList}>
          {conteos.map((conteo, i) => (
            <div
              key={conteo.id}
              className={styles.analysisCard}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className={styles.analysisLeft}>
                <div className={styles.analysisId}>#{conteo.id}</div>
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
                    {new Date(conteo.fecha_conteo).toLocaleDateString("es-GT", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span
                    className={`${styles.badge} ${conteo.estado_id === 2 ? styles.completado : styles.procesando}`}
                  >
                    {conteo.estado_id === 2 ? "completado" : "en progreso"}
                  </span>
                </div>
              </div>

              <div className={styles.analysisCounts}>
                <div className={styles.countBlock}>
                  <span className={styles.countLabel}>Total IA</span>
                  <span
                    className={`${styles.countNum} ${styles.countAdjusted}`}
                  >
                    {conteo.conteo_total_acumulado.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className={styles.analysisActions}>
                <button
                  className={styles.btnDetails}
                  onClick={() =>
                    router.push(`/cultivos/${cultivoId}/conteos/${conteo.id}`)
                  }
                >
                  Ver conteo
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
          ))}
        </div>
      )}
    </div>
  );
}

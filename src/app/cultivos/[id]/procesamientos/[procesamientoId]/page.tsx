"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { ProcesamientoVideo } from "@/types";
import styles from "./detalle.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DetalleProcesamientoPage() {
  const router = useRouter();
  const { id: cultivoId, procesamientoId } = useParams();

  const [procesamiento, setProcesamiento] = useState<ProcesamientoVideo | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [conteoAjustado, setConteoAjustado] = useState(0);
  const [observaciones, setObservaciones] = useState("");
  const [ajustando, setAjustando] = useState(false);
  const [mostrarVideo, setMostrarVideo] = useState(false);

  useEffect(() => {
    if (!procesamientoId) return;
    api
      .get<ProcesamientoVideo>(`/procesamientos/${procesamientoId}`)
      .then(({ data }) => {
        setProcesamiento(data);
        if (data.resultado) {
          setConteoAjustado(
            data.resultado.conteo_ajustado ?? data.resultado.conteo_ia,
          );
          setObservaciones(data.resultado.observaciones_ajuste || "");
        }
      })
      .catch(() => alert("Error al cargar los detalles."))
      .finally(() => setLoading(false));
  }, [procesamientoId]);

  const handleAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procesamiento) return;
    setAjustando(true);
    try {
      await api.post(`/procesamientos/${procesamiento.id}/ajustar`, {
        conteo_ajustado: conteoAjustado,
        observaciones,
      });
      alert("¡Ajuste guardado correctamente!");
      router.push(`/cultivos/${cultivoId}/conteos/${procesamiento.conteo_id}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al guardar el ajuste.");
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
            onClick={() =>
              router.push(
                `/cultivos/${cultivoId}/conteos/${procesamiento.conteo_id}`,
              )
            }
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
            Volver al conteo
          </button>
          <h1 className={styles.pageTitle}>Análisis #{procesamiento.id}</h1>
          <p className={styles.pageSubtitle}>
            Surcos {procesamiento.surco_inicio} al {procesamiento.surco_fin} ·{" "}
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
              {procesamiento.resultado?.conteo_ia?.toLocaleString() ?? "—"}
            </span>
            <span className={styles.resultUnit}>melones</span>
          </div>
        </div>
        {procesamiento.resultado?.conteo_ajustado != null && (
          <div className={styles.resultAdjusted}>
            <span className={styles.resultAdjLabel}>Ajustado a</span>
            <span className={styles.resultAdjNum}>
              {procesamiento.resultado.conteo_ajustado.toLocaleString()}
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
        <div className={styles.noVideo}>Video anotado no disponible aún.</div>
      )}

      {/* Formulario ajuste — solo conteo, sin calibres */}
      <form onSubmit={handleAjuste} className={styles.adjustForm}>
        <div className={styles.adjustHeader}>
          <h3 className={styles.adjustTitle}>Ajuste manual del conteo</h3>
          <p className={styles.adjustSubtitle}>
            Rectifica el conteo de este video si detectaste alguna diferencia al
            revisar el video anotado. La segmentación por calibre se gestiona
            desde la página del conteo completo.
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

        <button type="submit" className={styles.btnSubmit} disabled={ajustando}>
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
              </svg>{" "}
              Guardar ajuste
            </>
          )}
        </button>
      </form>
    </div>
  );
}

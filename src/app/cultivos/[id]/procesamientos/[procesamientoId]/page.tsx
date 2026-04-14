"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Procesamiento } from "@/types";
import styles from "./detalle.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const CALIBRES = [
  { id: 1, nombre: "6" },
  { id: 2, nombre: "9j" },
  { id: 3, nombre: "9s" },
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

  // estados de ajuste
  const [conteoAjustado, setConteoAjustado] = useState(0);
  const [observaciones, setObservaciones] = useState("");
  const [distribucion, setDistribucion] = useState<{ [key: number]: number }>(
    {},
  );
  const [ajustando, setAjustando] = useState(false);
  const [mostrarVideo, setMostrarVideo] = useState(false);

  useEffect(() => {
    const fetchDetalle = async () => {
      try {
        const response = await api.get<Procesamiento>(
          `/procesamientos/${procesamientoId}`,
        );
        const data = response.data;
        setProcesamiento(data);

        if (data.resultado) {
          setConteoAjustado(
            data.resultado.conteo_final_ajustado !== null
              ? data.resultado.conteo_final_ajustado
              : data.resultado.conteo_ia,
          );
          setObservaciones(data.resultado.observaciones_ajuste || "");

          if (data.resultado.calibres && data.resultado.calibres.length > 0) {
            const dist: { [key: number]: number } = {};
            data.resultado.calibres.forEach((c) => {
              dist[c.calibre_id] = c.porcentaje_muestreo * 100;
            });
            setDistribucion(dist);
          }
        }
      } catch (err) {
        alert("error al cargar los detalles del procesamiento.");
      } finally {
        setLoading(false);
      }
    };

    if (procesamientoId) fetchDetalle();
  }, [procesamientoId]);

  const totalPorcentaje = Object.values(distribucion).reduce(
    (a, b) => a + b,
    0,
  );
  const hayDistribucion = totalPorcentaje > 0;

  const isSubmitDisabled =
    ajustando || (hayDistribucion && totalPorcentaje !== 100);

  const handleAjusteManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procesamiento) return;

    if (hayDistribucion && totalPorcentaje !== 100) {
      alert("la suma de los porcentajes debe ser exactamente 100%.");
      return;
    }

    const calibresArray = Object.entries(distribucion)
      .map(([id, valor]) => ({
        calibre_id: parseInt(id),
        porcentaje: valor / 100,
      }))
      .filter((c) => c.porcentaje > 0);

    setAjustando(true);
    try {
      await api.post(`/procesamientos/${procesamiento.id}/ajustar-resultado`, {
        conteo_ajustado: conteoAjustado,
        observaciones: observaciones,
        calibres: calibresArray,
      });
      alert("¡ajuste guardado correctamente!");
      router.push(`/cultivos/${cultivoId}`);
    } catch (error) {
      alert("error al guardar el ajuste.");
    } finally {
      setAjustando(false);
    }
  };

  const handleDistribucionChange = (id: number, value: string) => {
    const numValue = Number(value);
    if (numValue < 0) return;
    setDistribucion((prev) => ({ ...prev, [id]: numValue }));
  };

  if (loading)
    return <div className={styles.loading}>cargando detalles...</div>;
  if (!procesamiento)
    return (
      <div className={styles.errorText}>no se encontró el procesamiento.</div>
    );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>detalles del análisis #{procesamiento.id}</h1>
        <button
          className={styles.btnBack}
          onClick={() => router.push(`/cultivos/${cultivoId}`)}
        >
          &larr; volver al historial
        </button>
      </header>

      <div className={styles.resultsContainer}>
        <h2>
          resultado original de ia:{" "}
          <span className={styles.highlightGreen}>
            {procesamiento.resultado?.conteo_ia}
          </span>{" "}
          melones detectados
        </h2>

        {procesamiento.video_anotado_url ? (
          <>
            <button
              className={styles.btnToggleVideo}
              onClick={() => setMostrarVideo(!mostrarVideo)}
            >
              {mostrarVideo ? "ocultar video anotado" : "mostrar video anotado"}
            </button>

            {mostrarVideo && (
              <video controls className={styles.videoPlayer}>
                <source
                  src={`${API_URL}/videos/${procesamiento.video_anotado_url.split("/").pop()}`}
                  type="video/mp4"
                />
                tu navegador no soporta video.
              </video>
            )}
          </>
        ) : (
          <p className={styles.italicMuted}>
            el video anotado no está disponible aún.
          </p>
        )}

        <hr className={styles.divider} />

        <form onSubmit={handleAjusteManual} className={styles.uploadCard}>
          <h3 className={styles.sectionTitle}>
            ajuste manual y segmentación por calibres
          </h3>

          <div className={styles.formGroup}>
            <label className={styles.boldLabel}>conteo final rectificado</label>
            <input
              type="number"
              min="0"
              required
              value={conteoAjustado}
              onChange={(e) => setConteoAjustado(Number(e.target.value))}
              className={styles.largeInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.boldLabel}>
              observaciones (motivo de rectificación, si aplica)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className={styles.textArea}
              placeholder="ej: la cámara no captó la hilera izquierda al inicio..."
            />
          </div>

          <h4 className={styles.subSectionTitle}>
            distribución de calibres (%)
          </h4>

          <div className={styles.calibreGrid}>
            {CALIBRES.map((calibre) => {
              const porcentajeActual = distribucion[calibre.id] || 0;
              const cantidadMelones = Math.round(
                (porcentajeActual / 100) * conteoAjustado,
              );

              return (
                <div key={calibre.id} className={styles.calibreCard}>
                  <label className={styles.calibreCardHeader}>
                    <span>c {calibre.nombre.toLowerCase()}</span>
                    <span className={styles.calibreUnits}>
                      {cantidadMelones} un.
                    </span>
                  </label>

                  <div className={styles.calibreInputWrapper}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={distribucion[calibre.id] || ""}
                      onChange={(e) =>
                        handleDistribucionChange(calibre.id, e.target.value)
                      }
                      className={styles.calibreInput}
                    />
                    <span className={styles.percentSymbol}>%</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className={`${styles.validationPanel} ${
              totalPorcentaje === 100
                ? styles.validationSuccess
                : totalPorcentaje > 100
                  ? styles.validationError
                  : styles.validationWarning
            }`}
          >
            <strong className={styles.validationTotal}>
              total asignado: {totalPorcentaje}%
            </strong>
            <span className={styles.validationMsg}>
              {totalPorcentaje > 100 && "excede el 100%"}
              {totalPorcentaje < 100 &&
                totalPorcentaje > 0 &&
                `faltan ${(100 - totalPorcentaje).toFixed(0)}%`}
              {totalPorcentaje === 100 && "distribución correcta"}
            </span>
          </div>

          <button
            type="submit"
            className={`${styles.btnSubmit} ${
              isSubmitDisabled
                ? styles.btnSubmitDisabled
                : styles.btnSubmitActive
            }`}
            disabled={isSubmitDisabled}
          >
            {ajustando ? "guardando..." : "guardar ajuste final"}
          </button>
        </form>
      </div>
    </div>
  );
}

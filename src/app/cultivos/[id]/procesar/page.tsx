"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Procesamiento } from "@/types";
import styles from "./procesar.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const VARIEDADES = [{ id: 1, nombre: "Caribbean Gold RZ" }];
const CALIBRES = [
  { id: 1, nombre: "6" },
  { id: 2, nombre: "9J" },
  { id: 3, nombre: "9S" },
  { id: 4, nombre: "12" },
  { id: 5, nombre: "15" },
];

export default function ProcesarVideoPage() {
  const router = useRouter();
  const { id: cultivoId } = useParams();

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fechaGrabacion, setFechaGrabacion] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [variedadId, setVariedadId] = useState("1");
  const [uploading, setUploading] = useState(false);
  const [procesamiento, setProcesamiento] = useState<Procesamiento | null>(
    null,
  );

  const [conteoAjustado, setConteoAjustado] = useState(0);
  const [observaciones, setObservaciones] = useState("");
  const [distribucion, setDistribucion] = useState<{ [key: number]: number }>(
    {},
  );
  const [ajustando, setAjustando] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(
    () => () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    },
    [],
  );

  const consultarEstado = async (id: number) => {
    try {
      const { data } = await api.get<Procesamiento>(`/procesamientos/${id}`);
      setProcesamiento(data);
      if (data.estado === "completado" || data.estado === "error") {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (data.resultado) setConteoAjustado(data.resultado.conteo_ia);
      }
    } catch {}
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) setVideoFile(file);
  };

  const handleSubirVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) return;
    setUploading(true);
    setProcesamiento(null);

    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("cultivo_id", cultivoId as string);
    formData.append("variedad_id", variedadId);
    formData.append("fecha_grabacion", `${fechaGrabacion}T12:00:00`);

    try {
      const { data } = await api.post<Procesamiento>(
        "/procesamientos/",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      setProcesamiento(data);
      setUploading(false);
      pollIntervalRef.current = setInterval(
        () => consultarEstado(data.id),
        4000,
      );
    } catch {
      setUploading(false);
      alert("Error al subir el video.");
    }
  };

  const handleAjusteManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procesamiento) return;
    const calibresArray = Object.entries(distribucion)
      .map(([id, v]) => ({ calibre_id: parseInt(id), porcentaje: v / 100 }))
      .filter((c) => c.porcentaje > 0);
    const suma = calibresArray.reduce((acc, c) => acc + c.porcentaje, 0);
    if (suma !== 1 && calibresArray.length > 0) {
      alert("La suma de porcentajes debe ser 100%.");
      return;
    }
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

  const totalPct = Object.values(distribucion).reduce((a, b) => a + b, 0);
  const hayDist = totalPct > 0;

  return (
    <div className={styles.container}>
      {/* Header */}
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
          <h1 className={styles.pageTitle}>Analizar Nuevo Video</h1>
          <p className={styles.pageSubtitle}>
            Sube un video de tu cultivo para conteo automático con IA
          </p>
        </div>
      </div>

      {/* Upload form */}
      {(!procesamiento || procesamiento.estado === "error") && (
        <form onSubmit={handleSubirVideo} className={styles.uploadSection}>
          {/* Steps indicator */}
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>1</div>
              <span>Configura el análisis</span>
            </div>
            <div className={styles.stepLine} />
            <div className={styles.step}>
              <div className={`${styles.stepNum} ${styles.stepInactive}`}>
                2
              </div>
              <span className={styles.stepLabelMuted}>Procesamiento IA</span>
            </div>
            <div className={styles.stepLine} />
            <div className={styles.step}>
              <div className={`${styles.stepNum} ${styles.stepInactive}`}>
                3
              </div>
              <span className={styles.stepLabelMuted}>Ajuste y calibres</span>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>
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
                  <path d="M12 2a10 10 0 1 0 10 10" />
                  <path d="M12 8v4l2 2" />
                </svg>
                Variedad de melón
              </label>
              <select
                value={variedadId}
                onChange={(e) => setVariedadId(e.target.value)}
              >
                {VARIEDADES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>
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
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Fecha de grabación
              </label>
              <input
                type="date"
                required
                value={fechaGrabacion}
                onChange={(e) => setFechaGrabacion(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          {/* Drag & Drop upload zone */}
          <div
            className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ""} ${videoFile ? styles.dropZoneHasFile : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              required
              style={{ display: "none" }}
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
            />
            {videoFile ? (
              <div className={styles.fileSelected}>
                <div className={styles.fileIcon}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{videoFile.name}</span>
                  <span className={styles.fileSize}>
                    {(videoFile.size / (1024 * 1024)).toFixed(1)} MB · Listo
                    para analizar
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.fileRemove}
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideoFile(null);
                  }}
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
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className={styles.dropContent}>
                <div className={styles.dropIcon}>
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className={styles.dropTitle}>Arrastra tu video aquí</p>
                <p className={styles.dropSubtitle}>
                  o haz clic para seleccionar un archivo · MP4, MOV, AVI
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            className={styles.btnSubmit}
            disabled={uploading || !videoFile}
          >
            {uploading ? (
              <>
                <span className={styles.btnSpinner} /> Subiendo video...
              </>
            ) : (
              <>
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
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Iniciar análisis con IA
              </>
            )}
          </button>
        </form>
      )}

      {/* Processing state */}
      {(uploading ||
        (procesamiento && procesamiento.estado === "procesando")) && (
        <div className={styles.processingCard}>
          <div className={styles.processingAnim}>
            <div className={styles.pulseRing} />
            <div className={styles.pulseRing2} />
            <div className={styles.processingIcon}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3 Q15 8 12 12 Q9 16 12 21" />
                <path d="M3 12 Q8 9 12 12 Q16 15 21 12" />
              </svg>
            </div>
          </div>
          <h3 className={styles.processingTitle}>
            La IA está analizando tu video
          </h3>
          <p className={styles.processingSubtitle}>
            Detectando y contando melones automáticamente...
          </p>
          <div className={styles.processingBar}>
            <div className={styles.processingBarFill} />
          </div>
          <span className={styles.processingStatus}>
            Estado: <strong>{procesamiento?.estado || "subiendo"}</strong>
          </span>
        </div>
      )}

      {/* Results */}
      {procesamiento?.estado === "completado" && procesamiento.resultado && (
        <div className={styles.resultsSection}>
          {/* Result hero */}
          <div className={styles.resultHero}>
            <div className={styles.resultHeroLeft}>
              <span className={styles.resultLabel}>Resultado de la IA</span>
              <div className={styles.resultCount}>
                <span className={styles.resultNum}>
                  {procesamiento.resultado.conteo_ia}
                </span>
                <span className={styles.resultUnit}>melones detectados</span>
              </div>
            </div>
            <div className={styles.resultCheckIcon}>
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
          </div>

          {/* Video */}
          {procesamiento.video_anotado_url && (
            <details className={styles.videoDetails}>
              <summary className={styles.videoSummary}>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Ver video anotado
              </summary>
              <video controls className={styles.videoPlayer}>
                <source
                  src={`${API_URL}/videos/${procesamiento.video_anotado_url.split("/").pop()}`}
                  type="video/mp4"
                />
              </video>
            </details>
          )}

          <div className={styles.divider} />

          {/* Adjustment form */}
          <form onSubmit={handleAjusteManual} className={styles.adjustForm}>
            <div className={styles.adjustHeader}>
              <div className={styles.stepNum}>3</div>
              <div>
                <h3 className={styles.adjustTitle}>Ajuste manual y calibres</h3>
                <p className={styles.adjustSubtitle}>
                  Rectifica el conteo y distribuye por calibre si es necesario
                </p>
              </div>
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
                />
              </div>
              <div className={styles.formGroup}>
                <label>Observaciones (opcional)</label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Motivo de la rectificación..."
                />
              </div>
            </div>

            <div className={styles.calibresSection}>
              <h4 className={styles.calibresTitle}>
                Distribución por calibre (%)
              </h4>
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
                    {totalPct < 100 &&
                      totalPct > 0 &&
                      `Faltan ${100 - totalPct}%`}
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
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { ProcesamientoVideo, Conteo, Variedad } from "@/types";
import styles from "./procesar.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ProcesarVideoPage() {
  const router = useRouter();
  const { id: cultivoId } = useParams();
  const searchParams = useSearchParams();
  const conteoIdParam = searchParams.get("conteo");

  const [variedades, setVariedades] = useState<Variedad[]>([]);
  const [conteosAbiertos, setConteosAbiertos] = useState<Conteo[]>([]);
  const [modoConteo, setModoConteo] = useState<"nuevo" | "existente">("nuevo");
  const [variedadId, setVariedadId] = useState("");
  const [conteoSeleccionado, setConteoSeleccionado] = useState(
    conteoIdParam ?? "",
  );
  const [conteoActivo, setConteoActivo] = useState<Conteo | null>(null);

  const [surcoInicio, setSurcoInicio] = useState("");
  const [surcoFin, setSurcoFin] = useState("");
  const [fechaGrabacion, setFechaGrabacion] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [procesamiento, setProcesamiento] = useState<ProcesamientoVideo | null>(
    null,
  );
  const [conteoAjustado, setConteoAjustado] = useState(0);
  const [observaciones, setObservaciones] = useState("");
  const [ajustando, setAjustando] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(
    () => () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    },
    [],
  );

  useEffect(() => {
    Promise.all([
      api.get("/catalogos/variedades"),
      api.get(`/conteos/cultivo/${cultivoId}`),
    ]).then(([resV, resC]) => {
      setVariedades(resV.data);
      if (resV.data.length > 0) setVariedadId(String(resV.data[0].id));

      const abiertos = resC.data.filter((c: Conteo) => c.estado_id !== 2);
      setConteosAbiertos(abiertos);

      if (conteoIdParam) {
        setModoConteo("existente");
        setConteoSeleccionado(conteoIdParam);
      } else if (abiertos.length > 0) {
        setModoConteo("existente");
        setConteoSeleccionado(String(abiertos[0].id));
      }
    });
  }, [cultivoId, conteoIdParam]);

  const handleConfirmarConteo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modoConteo === "nuevo") {
        const { data } = await api.post("/conteos/", {
          cultivo_id: parseInt(cultivoId as string),
          variedad_id: parseInt(variedadId),
        });
        setConteoActivo(data);
      } else {
        const { data } = await api.get(`/conteos/${conteoSeleccionado}`);
        setConteoActivo(data);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al configurar el conteo.");
    }
  };

  const consultarEstado = async (id: number) => {
    try {
      const { data } = await api.get<ProcesamientoVideo>(
        `/procesamientos/${id}`,
      );
      setProcesamiento(data);
      if (data.resultado) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setConteoAjustado(data.resultado.conteo_ia);
      }
    } catch {}
  };

  const handleSubirVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile || !conteoActivo) return;
    if (parseInt(surcoFin) < parseInt(surcoInicio)) {
      alert("El surco final no puede ser menor al surco inicial.");
      return;
    }
    setUploading(true);

    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("conteo_id", String(conteoActivo.id));
    formData.append("surco_inicio", surcoInicio);
    formData.append("surco_fin", surcoFin);
    formData.append("fecha_grabacion", `${fechaGrabacion}T12:00:00`);

    try {
      const { data } = await api.post<ProcesamientoVideo>(
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

  const handleAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procesamiento || !conteoActivo) return;
    setAjustando(true);
    try {
      await api.post(`/procesamientos/${procesamiento.id}/ajustar`, {
        conteo_ajustado: conteoAjustado,
        observaciones,
      });
      router.push(`/cultivos/${cultivoId}/conteos/${conteoActivo.id}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al guardar el ajuste.");
    } finally {
      setAjustando(false);
    }
  };

  const isCompleted = procesamiento?.resultado != null;
  const isProcessing = procesamiento && !procesamiento.resultado;

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
            Volver a conteos
          </button>
          <h1 className={styles.pageTitle}>Subir video de conteo</h1>
          <p className={styles.pageSubtitle}>
            Sube un video de tu cultivo para conteo automático con IA
          </p>
        </div>
      </div>

      {/* PASO 1: Configurar conteo */}
      {!conteoActivo && (
        <form onSubmit={handleConfirmarConteo} className={styles.uploadSection}>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>1</div>
              <span>Configurar conteo</span>
            </div>
            <div className={styles.stepLine} />
            <div className={styles.step}>
              <div className={`${styles.stepNum} ${styles.stepInactive}`}>
                2
              </div>
              <span className={styles.stepLabelMuted}>Subir video</span>
            </div>
            <div className={styles.stepLine} />
            <div className={styles.step}>
              <div className={`${styles.stepNum} ${styles.stepInactive}`}>
                3
              </div>
              <span className={styles.stepLabelMuted}>Ajuste</span>
            </div>
          </div>

          {conteosAbiertos.length > 0 && (
            <div className={styles.formGroup}>
              <label>¿Continuar un conteo existente o iniciar uno nuevo?</label>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    fontWeight: modoConteo === "existente" ? 600 : 400,
                  }}
                >
                  <input
                    type="radio"
                    name="modo"
                    value="existente"
                    checked={modoConteo === "existente"}
                    onChange={() => setModoConteo("existente")}
                    style={{ width: "auto" }}
                  />
                  Continuar conteo en progreso
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    fontWeight: modoConteo === "nuevo" ? 600 : 400,
                  }}
                >
                  <input
                    type="radio"
                    name="modo"
                    value="nuevo"
                    checked={modoConteo === "nuevo"}
                    onChange={() => setModoConteo("nuevo")}
                    style={{ width: "auto" }}
                  />
                  Nuevo conteo
                </label>
              </div>
            </div>
          )}

          {modoConteo === "existente" && conteosAbiertos.length > 0 ? (
            <div className={styles.formGroup}>
              <label>Conteo a continuar</label>
              <select
                value={conteoSeleccionado}
                onChange={(e) => setConteoSeleccionado(e.target.value)}
                required
              >
                {conteosAbiertos.map((c) => (
                  <option key={c.id} value={c.id}>
                    Conteo #{c.id} —{" "}
                    {new Date(c.fecha_conteo).toLocaleDateString("es-GT")} (
                    {c.conteo_total_acumulado.toLocaleString()} melones)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className={styles.formGroup}>
              <label>Variedad de melón</label>
              <select
                value={variedadId}
                onChange={(e) => setVariedadId(e.target.value)}
                required
              >
                {variedades.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className={styles.btnSubmit}>
            Continuar →
          </button>
        </form>
      )}

      {/* PASO 2: Subir video */}
      {conteoActivo && !procesamiento && (
        <form onSubmit={handleSubirVideo} className={styles.uploadSection}>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>✓</div>
              <span>Conteo #{conteoActivo.id}</span>
            </div>
            <div className={styles.stepLine} />
            <div className={styles.step}>
              <div className={styles.stepNum}>2</div>
              <span>Subir video</span>
            </div>
            <div className={styles.stepLine} />
            <div className={styles.step}>
              <div className={`${styles.stepNum} ${styles.stepInactive}`}>
                3
              </div>
              <span className={styles.stepLabelMuted}>Ajuste</span>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Surco inicio</label>
              <input
                type="number"
                min="1"
                required
                value={surcoInicio}
                onChange={(e) => setSurcoInicio(e.target.value)}
                placeholder="Ej. 1"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Surco fin</label>
              <input
                type="number"
                min="1"
                required
                value={surcoFin}
                onChange={(e) => setSurcoFin(e.target.value)}
                placeholder="Ej. 15"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Fecha de grabación</label>
              <input
                type="date"
                required
                value={fechaGrabacion}
                onChange={(e) => setFechaGrabacion(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <div
            className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ""} ${videoFile ? styles.dropZoneHasFile : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f?.type.startsWith("video/")) setVideoFile(f);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
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
                    {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
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
                  o haz clic para seleccionar · MP4, MOV, AVI
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            className={styles.btnSubmit}
            disabled={uploading || !videoFile || !surcoInicio || !surcoFin}
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
                </svg>{" "}
                Iniciar análisis con IA
              </>
            )}
          </button>
        </form>
      )}

      {/* Procesando */}
      {(uploading || isProcessing) && (
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
        </div>
      )}

      {/* PASO 3: Resultado y ajuste */}
      {isCompleted && procesamiento.resultado && (
        <div className={styles.resultsSection}>
          <div className={styles.resultHero}>
            <div className={styles.resultHeroLeft}>
              <span className={styles.resultLabel}>Resultado de la IA</span>
              <div className={styles.resultCount}>
                <span className={styles.resultNum}>
                  {procesamiento.resultado.conteo_ia.toLocaleString()}
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

          <form onSubmit={handleAjuste} className={styles.adjustForm}>
            <div className={styles.adjustHeader}>
              <div className={styles.stepNum}>3</div>
              <div>
                <h3 className={styles.adjustTitle}>Ajuste del conteo</h3>
                <p className={styles.adjustSubtitle}>
                  Rectifica el conteo si detectaste alguna diferencia al revisar
                  el video
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

            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--color-text-muted)",
                marginBottom: "0.5rem",
              }}
            >
              La segmentación por calibre se realiza una sola vez desde la
              página del conteo, aplicando el porcentaje de tu muestreo al total
              acumulado.
            </p>

            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={ajustando}
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
                  </svg>{" "}
                  Guardar y ver conteo
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

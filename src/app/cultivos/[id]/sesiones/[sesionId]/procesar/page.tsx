"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { ProcesamientoVideo, Calibre } from "@/types";
import styles from "../../[sesionId]/procesar/procesar.module.css";

export default function ProcesarVideoPage() {
  const router = useRouter();
  const { id: cultivoId, sesionId } = useParams();

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [surcoInicio, setSurcoInicio] = useState("");
  const [surcoFin, setSurcoFin] = useState("");
  const [fechaGrabacion, setFechaGrabacion] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [uploading, setUploading] = useState(false);
  const [procesamiento, setProcesamiento] = useState<ProcesamientoVideo | null>(
    null,
  );
  const [calibres, setCalibres] = useState<Calibre[]>([]);
  const [conteoAjustado, setConteoAjustado] = useState(0);
  const [observaciones, setObservaciones] = useState("");
  const [distribucion, setDistribucion] = useState<{ [id: number]: number }>(
    {},
  );
  const [ajustando, setAjustando] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(
    () => () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    },
    [],
  );

  // Cargar calibres de la variedad de la sesión
  useEffect(() => {
    api.get(`/sesiones/${sesionId}`).then((r) => {
      api
        .get(`/catalogos/variedades/${r.data.variedad_id}/calibres`)
        .then((rc) => setCalibres(rc.data));
    });
  }, [sesionId]);

  const consultarEstado = async (id: number) => {
    try {
      const { data } = await api.get<ProcesamientoVideo>(
        `/procesamientos/${id}`,
      );
      setProcesamiento(data);
      if (data.resultado?.conteo_ia !== undefined && conteoAjustado === 0) {
        setConteoAjustado(data.resultado.conteo_ia);
      }
      if (data.resultado) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      }
    } catch {}
  };

  const handleSubirVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) return;
    if (parseInt(surcoFin) < parseInt(surcoInicio)) {
      alert("El surco final no puede ser menor al surco inicial.");
      return;
    }
    setUploading(true);
    setProcesamiento(null);

    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("sesion_id", sesionId as string);
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
    if (!procesamiento) return;
    const calibresArray = Object.entries(distribucion)
      .map(([id, v]) => ({ calibre_id: parseInt(id), porcentaje: v }))
      .filter((c) => c.porcentaje > 0);

    setAjustando(true);
    try {
      await api.post(`/procesamientos/${procesamiento.id}/ajustar-resultado`, {
        conteo_ajustado: conteoAjustado,
        observaciones,
        calibres: calibresArray,
      });
      alert("¡Ajuste guardado!");
      router.push(`/cultivos/${cultivoId}/sesiones/${sesionId}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al guardar el ajuste.");
    } finally {
      setAjustando(false);
    }
  };

  const totalPct = Object.values(distribucion).reduce((a, b) => a + b, 0);
  const hayDist = totalPct > 0;

  const isProcessing = procesamiento && !procesamiento.resultado;
  const isCompleted = procesamiento?.resultado != null;

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <button
          className={styles.btnBack}
          onClick={() =>
            router.push(`/cultivos/${cultivoId}/sesiones/${sesionId}`)
          }
        >
          ← Volver a la sesión
        </button>
        <h1 className={styles.pageTitle}>Subir video de conteo</h1>
        <p className={styles.pageSubtitle}>
          El video será procesado automáticamente por el modelo de IA
        </p>
      </div>

      {!procesamiento && (
        <form onSubmit={handleSubirVideo} className={styles.uploadSection}>
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
                <div className={styles.fileIcon}>▶</div>
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
                  ✕
                </button>
              </div>
            ) : (
              <div className={styles.dropContent}>
                <div className={styles.dropIcon}>⬆</div>
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
                <span className={styles.btnSpinner} /> Subiendo...
              </>
            ) : (
              "▶ Iniciar análisis con IA"
            )}
          </button>
        </form>
      )}

      {isProcessing && (
        <div className={styles.processingCard}>
          <div className={styles.processingAnim}>
            <div className={styles.pulseRing} />
            <div className={styles.pulseRing2} />
            <div className={styles.processingIcon}>⚙</div>
          </div>
          <h3 className={styles.processingTitle}>
            La IA está analizando tu video
          </h3>
          <p className={styles.processingSubtitle}>
            Detectando y contando melones...
          </p>
          <div className={styles.processingBar}>
            <div className={styles.processingBarFill} />
          </div>
        </div>
      )}

      {isCompleted && procesamiento.resultado && (
        <div className={styles.resultsSection}>
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
          </div>

          <form onSubmit={handleAjuste} className={styles.adjustForm}>
            <div className={styles.adjustHeader}>
              <div>
                <h3 className={styles.adjustTitle}>Ajuste y calibres</h3>
              </div>
            </div>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Conteo ajustado</label>
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
                  placeholder="Motivo del ajuste..."
                />
              </div>
            </div>

            {calibres.length > 0 && (
              <div className={styles.calibresSection}>
                <h4 className={styles.calibresTitle}>
                  Distribución por calibre (%)
                </h4>
                <div className={styles.calibreGrid}>
                  {calibres.map((cal) => {
                    const pct = distribucion[cal.id] || 0;
                    const cant = Math.round((pct / 100) * conteoAjustado);
                    return (
                      <div key={cal.id} className={styles.calibreCard}>
                        <div className={styles.calibreHeader}>
                          <span className={styles.calibreName}>
                            {cal.nombre}
                          </span>
                          <span className={styles.calibreCount}>
                            {cant} un.
                          </span>
                        </div>
                        <div className={styles.calibreInputRow}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={distribucion[cal.id] || ""}
                            onChange={(e) =>
                              setDistribucion((p) => ({
                                ...p,
                                [cal.id]: Number(e.target.value),
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
                      {totalPct === 100
                        ? "✓ Completo"
                        : totalPct < 100
                          ? `Faltan ${100 - totalPct}%`
                          : `Excede ${totalPct - 100}%`}
                    </span>
                  </div>
                )}
              </div>
            )}

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
                "Guardar ajuste final"
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

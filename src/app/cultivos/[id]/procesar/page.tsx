"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { ProcesamientoVideo, Conteo, Variedad } from "@/types";
import styles from "./procesar.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─────────────────────────────────────────────────────────────
// Utilidades de rangos bloqueados
// ─────────────────────────────────────────────────────────────

/**
 * Dado los procesamientos activos de un conteo, devuelve el conjunto
 * de surcos ya cubiertos (números individuales).
 */
function calcularSurcosBloqueados(
  procesamientos: ProcesamientoVideo[],
): Set<number> {
  const bloqueados = new Set<number>();
  for (const p of procesamientos) {
    for (let s = p.surco_inicio; s <= p.surco_fin; s++) {
      bloqueados.add(s);
    }
  }
  return bloqueados;
}

/**
 * Valida que el rango [inicio, fin] no solape con ningún surco bloqueado.
 * Devuelve null si es válido, o un mensaje de error si no lo es.
 */
function validarRango(
  inicio: number,
  fin: number,
  bloqueados: Set<number>,
  totalSurcos: number,
): string | null {
  if (isNaN(inicio) || isNaN(fin)) return null; // aún sin datos, no validar
  if (fin > totalSurcos)
    return `El surco final (${fin}) supera el total de surcos del conteo (${totalSurcos}).`;
  for (let s = inicio; s <= fin; s++) {
    if (bloqueados.has(s))
      return `El surco ${s} ya está cubierto por otro video en este conteo.`;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Componente visual: mapa de surcos
// ─────────────────────────────────────────────────────────────

function MapaSurcos({
  totalSurcos,
  bloqueados,
  rangoActual,
}: {
  totalSurcos: number;
  bloqueados: Set<number>;
  rangoActual: { inicio: number; fin: number } | null;
}) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <p
        style={{
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "var(--color-text-muted)",
          marginBottom: "0.5rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Cobertura del conteo ({bloqueados.size}/{totalSurcos} surcos)
      </p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
        }}
      >
        {Array.from({ length: totalSurcos }, (_, i) => {
          const surco = i + 1;
          const bloqueado = bloqueados.has(surco);
          const enRango =
            rangoActual &&
            surco >= rangoActual.inicio &&
            surco <= rangoActual.fin;
          const conflicto = bloqueado && enRango;

          let bg = "var(--color-surface-alt)";
          let border = "1px solid var(--color-border)";
          let color = "var(--color-text-muted)";
          let title = `Surco ${surco}: disponible`;

          if (bloqueado) {
            bg = "var(--color-primary-light)";
            border = "1px solid var(--color-accent-soft)";
            color = "var(--color-primary)";
            title = `Surco ${surco}: ya cubierto`;
          }
          if (enRango && !conflicto) {
            bg = "#dcfce7";
            border = "1px solid #86efac";
            color = "#15803d";
            title = `Surco ${surco}: en el rango actual`;
          }
          if (conflicto) {
            bg = "#fee2e2";
            border = "1px solid #fca5a5";
            color = "#dc2626";
            title = `Surco ${surco}: CONFLICTO`;
          }

          return (
            <div
              key={surco}
              title={title}
              style={{
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
                fontSize: "0.7rem",
                fontWeight: 700,
                fontFamily: "DM Mono, monospace",
                background: bg,
                border,
                color,
                transition: "all 0.15s",
                cursor: "default",
              }}
            >
              {surco}
            </div>
          );
        })}
      </div>
      {/* Leyenda */}
      <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
        {[
          {
            bg: "var(--color-surface-alt)",
            border: "var(--color-border)",
            label: "Libre",
          },
          {
            bg: "var(--color-primary-light)",
            border: "var(--color-accent-soft)",
            label: "Ya cubierto",
          },
          { bg: "#dcfce7", border: "#86efac", label: "Rango actual" },
          { bg: "#fee2e2", border: "#fca5a5", label: "Conflicto" },
        ].map(({ bg, border, label }) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: "0.75rem",
              color: "var(--color-text-muted)",
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: bg,
                border: `1px solid ${border}`,
                flexShrink: 0,
              }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────

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

  // Procesamientos existentes del conteo activo (para bloqueo de surcos)
  const [procesamientosExistentes, setProcesamientosExistentes] = useState<
    ProcesamientoVideo[]
  >([]);

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

  // Cuando se confirma el conteo activo, cargar sus procesamientos existentes
  const cargarProcesamientosExistentes = async (conteoId: number) => {
    try {
      const { data } = await api.get<ProcesamientoVideo[]>(
        `/procesamientos/conteo/${conteoId}`,
      );
      setProcesamientosExistentes(data);
    } catch {
      setProcesamientosExistentes([]);
    }
  };

  const handleConfirmarConteo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let conteo: Conteo;
      if (modoConteo === "nuevo") {
        const { data } = await api.post<Conteo>("/conteos/", {
          cultivo_id: parseInt(cultivoId as string),
          variedad_id: parseInt(variedadId),
        });
        conteo = data;
      } else {
        const { data } = await api.get<Conteo>(
          `/conteos/${conteoSeleccionado}`,
        );
        conteo = data;
      }
      setConteoActivo(conteo);
      await cargarProcesamientosExistentes(conteo.id);
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

    const inicio = parseInt(surcoInicio);
    const fin = parseInt(surcoFin);

    if (fin < inicio) {
      alert("El surco final no puede ser menor al surco inicial.");
      return;
    }

    // Validación client-side de solapamiento (el backend también valida)
    const bloqueados = calcularSurcosBloqueados(procesamientosExistentes);
    const errorRango = validarRango(
      inicio,
      fin,
      bloqueados,
      conteoActivo.total_surcos,
    );
    if (errorRango) {
      alert(errorRango);
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
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setProcesamiento(data);
      setUploading(false);
      pollIntervalRef.current = setInterval(
        () => consultarEstado(data.id),
        4000,
      );
    } catch (err: any) {
      setUploading(false);
      // Mostrar error del backend (solapamiento detectado por trigger)
      alert(err.response?.data?.detail || "Error al subir el video.");
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

  // Valores derivados para el mapa de surcos
  const bloqueados = calcularSurcosBloqueados(procesamientosExistentes);
  const inicioNum = parseInt(surcoInicio);
  const finNum = parseInt(surcoFin);
  const rangoActual =
    !isNaN(inicioNum) && !isNaN(finNum) && finNum >= inicioNum
      ? { inicio: inicioNum, fin: finNum }
      : null;
  const errorRango =
    conteoActivo && rangoActual
      ? validarRango(
          rangoActual.inicio,
          rangoActual.fin,
          bloqueados,
          conteoActivo.total_surcos,
        )
      : null;

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

      {/* ── PASO 1: Configurar conteo ── */}
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

      {/* ── PASO 2: Subir video ── */}
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

          {/* Mapa de surcos: solo si el conteo tiene surcos definidos */}
          <MapaSurcos
            totalSurcos={conteoActivo.total_surcos}
            bloqueados={bloqueados}
            rangoActual={rangoActual}
          />

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Surco inicio</label>
              <input
                type="number"
                min="1"
                max={conteoActivo.total_surcos}
                required
                value={surcoInicio}
                onChange={(e) => setSurcoInicio(e.target.value)}
                placeholder="Ej. 1"
                style={
                  errorRango
                    ? { borderColor: "var(--color-danger)" }
                    : undefined
                }
              />
            </div>
            <div className={styles.formGroup}>
              <label>Surco fin</label>
              <input
                type="number"
                min={surcoInicio || "1"}
                max={conteoActivo.total_surcos}
                required
                value={surcoFin}
                onChange={(e) => setSurcoFin(e.target.value)}
                placeholder={`Ej. ${conteoActivo.total_surcos}`}
                style={
                  errorRango
                    ? { borderColor: "var(--color-danger)" }
                    : undefined
                }
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

          {/* Mensaje de error de rango */}
          {errorRango && (
            <div
              style={{
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                color: "#dc2626",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: "0.85rem",
                fontWeight: 500,
                marginBottom: "1rem",
              }}
            >
              ⚠ {errorRango}
            </div>
          )}

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
              <div style={{ textAlign: "center" }}>
                <p style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                  ✓ {videoFile.name}
                </p>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {(videoFile.size / 1024 / 1024).toFixed(1)} MB — click para
                  cambiar
                </p>
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--color-text-muted)",
                }}
              >
                <p style={{ fontWeight: 600, marginBottom: 4 }}>
                  Arrastra el video aquí
                </p>
                <p style={{ fontSize: "0.8rem" }}>
                  o haz click para seleccionar
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            className={styles.btnSubmit}
            disabled={uploading || !!errorRango || !videoFile}
          >
            {uploading ? (
              <>
                <span className={styles.btnSpinner} /> Subiendo...
              </>
            ) : (
              "Subir y procesar →"
            )}
          </button>
        </form>
      )}

      {/* ── PROCESANDO ── */}
      {isProcessing && (
        <div className={styles.uploadSection} style={{ textAlign: "center" }}>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>✓</div>
              <span>Conteo #{conteoActivo?.id}</span>
            </div>
            <div className={styles.stepLine} />
            <div className={styles.step}>
              <div className={styles.stepNum}>✓</div>
              <span>Video subido</span>
            </div>
            <div className={styles.stepLine} />
            <div className={styles.step}>
              <div className={styles.stepNum}>3</div>
              <span>Procesando...</span>
            </div>
          </div>
          <div
            className={styles.btnSpinner}
            style={{ margin: "1.5rem auto", width: 32, height: 32 }}
          />
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
            La IA está analizando el video. Esto puede tardar unos minutos...
          </p>
        </div>
      )}

      {/* ── PASO 3: Ajuste ── */}
      {isCompleted && procesamiento && conteoActivo && (
        <div className={styles.uploadSection}>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>✓</div>
              <span>Conteo #{conteoActivo.id}</span>
            </div>
            <div className={styles.stepLine} />
            <div className={styles.step}>
              <div className={styles.stepNum}>✓</div>
              <span>Video procesado</span>
            </div>
            <div className={styles.stepLine} />
            <div className={styles.step}>
              <div className={styles.stepNum}>3</div>
              <span>Ajuste</span>
            </div>
          </div>

          <div
            style={{
              background: "var(--color-primary-light)",
              border: "1px solid var(--color-accent-soft)",
              borderRadius: 10,
              padding: "1rem 1.25rem",
              marginBottom: "1rem",
            }}
          >
            <p
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--color-text-muted)",
                marginBottom: 2,
              }}
            >
              CONTEO IA — Surcos {procesamiento.surco_inicio}–
              {procesamiento.surco_fin}
            </p>
            <p
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                fontFamily: "DM Mono, monospace",
                color: "var(--color-primary)",
              }}
            >
              {procesamiento.resultado?.conteo_ia.toLocaleString()}
            </p>
          </div>

          {procesamiento.video_anotado_url && (
            <details style={{ marginBottom: "1rem" }}>
              <summary
                style={{
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--color-primary)",
                }}
              >
                Ver video anotado
              </summary>
              <video
                controls
                style={{ width: "100%", borderRadius: 8, marginTop: 8 }}
              >
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
              La segmentación por calibre se realiza desde la página del conteo
              completo.
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

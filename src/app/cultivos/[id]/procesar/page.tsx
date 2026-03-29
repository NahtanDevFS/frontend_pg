"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Procesamiento } from "@/types";
import styles from "./procesar.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ProcesarVideoPage() {
  const router = useRouter();
  const { id: cultivoId } = useParams();

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [fechaGrabacion, setFechaGrabacion] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [uploading, setUploading] = useState(false);
  const [procesamiento, setProcesamiento] = useState<Procesamiento | null>(
    null,
  );
  const [error, setError] = useState("");

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const consultarEstado = async (idProcesamiento: number) => {
    try {
      const response = await api.get<Procesamiento>(
        `/procesamientos/${idProcesamiento}`,
      );
      const data = response.data;
      setProcesamiento(data);

      if (data.estado === "completado" || data.estado === "error") {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          console.log("Polling detenido:", data.estado);
        }
      }
    } catch (err) {
      console.error("Error en polling", err);
    }
  };

  const handleSubirVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) return;
    setError("");
    setUploading(true);
    setProcesamiento(null);

    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("cultivo_id", cultivoId as string);
    formData.append("fecha_grabacion", `${fechaGrabacion}T12:00:00`);

    try {
      const response = await api.post<Procesamiento>(
        "/procesamientos/",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const nuevoProcesamiento = response.data;
      setProcesamiento(nuevoProcesamiento);
      setUploading(false);

      console.log("Iniciando polling para ID:", nuevoProcesamiento.id);
      pollIntervalRef.current = setInterval(() => {
        consultarEstado(nuevoProcesamiento.id);
      }, 4000);
    } catch (err: any) {
      setUploading(false);
      setError(err.response?.data?.detail || "Error al subir el video.");
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Analizar Nuevo Video</h1>
        <button
          className={styles.btnBack}
          onClick={() => router.push(`/cultivos/${cultivoId}`)}
        >
          &larr; Volver al historial
        </button>
      </header>

      {error && (
        <div className={styles.errorText} style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {(!procesamiento || procesamiento.estado === "error") && (
        <form onSubmit={handleSubirVideo} className={styles.uploadCard}>
          <div className={styles.formGroup}>
            <label htmlFor="fecha">Fecha de Grabación en Campo</label>
            <input
              type="date"
              id="fecha"
              required
              value={fechaGrabacion}
              onChange={(e) => setFechaGrabacion(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="video">Archivo de Video (.mp4 recomendado)</label>
            <input
              type="file"
              id="video"
              accept="video/*"
              required
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
            />
          </div>
          <button
            type="submit"
            className={styles.btnSubmit}
            disabled={uploading}
          >
            {uploading ? "Subiendo archivo..." : "Iniciar Análisis con IA"}
          </button>
        </form>
      )}

      {(uploading ||
        (procesamiento &&
          (procesamiento.estado === "pendiente" ||
            procesamiento.estado === "procesando"))) && (
        <div className={styles.statusCard}>
          <div className={styles.spinner}></div>
          <h3>La Inteligencia Artificial está analizando tu video.</h3>
          <p>
            Esto puede tomar unos minutos dependiendo de la duración. No cierres
            esta pestaña.
          </p>
          <p style={{ fontSize: "0.8rem", color: "#666" }}>
            Estado actual: {procesamiento?.estado || "subiendo"}
          </p>
        </div>
      )}

      {procesamiento?.estado === "error" && (
        <div className={styles.statusCard} style={{ borderColor: "#d32f2f" }}>
          <h3 className={styles.errorText}>
            Ocurrió un error en el procesamiento.
          </h3>
          <p>
            Verifica que el archivo de video no esté corrupto e intenta
            nuevamente.
          </p>
        </div>
      )}

      {procesamiento?.estado === "completado" && procesamiento.resultado_ia && (
        <div className={styles.resultsContainer}>
          <h2 style={{ marginBottom: "1.5rem" }}>Resultados del Análisis</h2>

          <div className={styles.resultsGrid}>
            <div className={styles.resultTile}>
              <h3>Melones Maduros</h3>
              <p className={styles.numberMaduro}>
                {procesamiento.resultado_ia.conteo_maduros}
              </p>
            </div>
            <div className={styles.resultTile}>
              <h3>Melones Inmaduros</h3>
              <p className={styles.numberInmaduro}>
                {procesamiento.resultado_ia.conteo_inmaduros}
              </p>
              <p style={{ fontSize: "0.8rem", color: "#888" }}>
                * Simulado en MVP
              </p>
            </div>
          </div>

          <h3>Video Anotado por IA</h3>
          {procesamiento.video_anotado_url ? (
            <video controls className={styles.videoPlayer}>
              <source
                src={`${API_URL}/videos/${procesamiento.video_anotado_url.split("/").pop()}`}
                type="video/mp4"
              />
              Tu navegador no soporta la reproducción de video.
            </video>
          ) : (
            <p>El video anotado no está disponible.</p>
          )}
        </div>
      )}
    </div>
  );
}

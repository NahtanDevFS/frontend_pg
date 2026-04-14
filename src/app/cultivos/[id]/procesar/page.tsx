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

  // Estados de subida
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [fechaGrabacion, setFechaGrabacion] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [variedadId, setVariedadId] = useState("1");
  const [uploading, setUploading] = useState(false);
  const [procesamiento, setProcesamiento] = useState<Procesamiento | null>(
    null,
  );

  // Estados de ajuste
  const [conteoAjustado, setConteoAjustado] = useState(0);
  const [observaciones, setObservaciones] = useState("");
  const [distribucion, setDistribucion] = useState<{ [key: number]: number }>(
    {},
  );
  const [ajustando, setAjustando] = useState(false);

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
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (data.resultado) setConteoAjustado(data.resultado.conteo_ia);
      }
    } catch (err) {
      console.error("Error en polling", err);
    }
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
      const response = await api.post<Procesamiento>(
        "/procesamientos/",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      setProcesamiento(response.data);
      setUploading(false);

      pollIntervalRef.current = setInterval(() => {
        consultarEstado(response.data.id);
      }, 4000);
    } catch (err) {
      setUploading(false);
      alert("Error al subir el video.");
    }
  };

  const handleAjusteManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procesamiento) return;

    const calibresArray = Object.entries(distribucion)
      .map(([id, valor]) => ({
        calibre_id: parseInt(id),
        porcentaje: valor / 100,
      }))
      .filter((c) => c.porcentaje > 0);

    const sumaTotal = calibresArray.reduce(
      (acc, curr) => acc + curr.porcentaje,
      0,
    );
    if (sumaTotal !== 1 && calibresArray.length > 0) {
      alert("La suma de los porcentajes debe ser exactamente 100%");
      return;
    }

    setAjustando(true);
    try {
      await api.post(`/procesamientos/${procesamiento.id}/ajustar-resultado`, {
        conteo_ajustado: conteoAjustado,
        observaciones: observaciones,
        calibres: calibresArray,
      });
      alert("Ajuste guardado correctamente!");
      router.push(`/cultivos/${cultivoId}`);
    } catch (error) {
      alert("Error al guardar el ajuste.");
    } finally {
      setAjustando(false);
    }
  };

  const handleDistribucionChange = (id: number, value: string) => {
    setDistribucion((prev) => ({ ...prev, [id]: Number(value) }));
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Analizar Nuevo Video</h1>
        <button
          className={styles.btnBack}
          onClick={() => router.push(`/cultivos/${cultivoId}`)}
        >
          &larr; Volver
        </button>
      </header>

      {(!procesamiento || procesamiento.estado === "error") && (
        <form onSubmit={handleSubirVideo} className={styles.uploadCard}>
          <div className={styles.formGroup}>
            <label>Variedad de Melón</label>
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
            <label>Fecha de Grabación</label>
            <input
              type="date"
              required
              value={fechaGrabacion}
              onChange={(e) => setFechaGrabacion(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Archivo de Video (.mp4)</label>
            <input
              type="file"
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
            {uploading ? "Subiendo..." : "Iniciar Análisis IA"}
          </button>
        </form>
      )}

      {(uploading ||
        (procesamiento && procesamiento.estado !== "completado")) && (
        <div className={styles.statusCard}>
          <div className={styles.spinner}></div>
          <h3>La IA está analizando tu video...</h3>
          <p>Estado actual: {procesamiento?.estado || "subiendo"}</p>
        </div>
      )}

      {procesamiento?.estado === "completado" && procesamiento.resultado && (
        <div className={styles.resultsContainer}>
          <h2>
            Resultado de IA: {procesamiento.resultado.conteo_ia} Melones
            detectados
          </h2>

          {procesamiento.video_anotado_url && (
            <video
              controls
              className={styles.videoPlayer}
              style={{ width: "100%", marginTop: "1rem" }}
            >
              <source
                src={`${API_URL}/videos/${procesamiento.video_anotado_url.split("/").pop()}`}
                type="video/mp4"
              />
            </video>
          )}

          <hr style={{ margin: "2rem 0" }} />

          <form onSubmit={handleAjusteManual} className={styles.uploadCard}>
            <h3>Ajuste Manual y Segmentación por Calibres</h3>

            <div className={styles.formGroup}>
              <label>Conteo Final Rectificado</label>
              <input
                type="number"
                required
                value={conteoAjustado}
                onChange={(e) => setConteoAjustado(Number(e.target.value))}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Observaciones (Motivo de rectificación, si aplica)</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
              />
            </div>

            <h4>Distribución de Calibres (%)</h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "10px",
              }}
            >
              {CALIBRES.map((calibre) => (
                <div key={calibre.id} className={styles.formGroup}>
                  <label>Calibre {calibre.nombre}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Ej: 25"
                    value={distribucion[calibre.id] || ""}
                    onChange={(e) =>
                      handleDistribucionChange(calibre.id, e.target.value)
                    }
                  />
                </div>
              ))}
            </div>

            <p style={{ fontSize: "0.8rem", color: "#666" }}>
              Total asignado:{" "}
              {Object.values(distribucion).reduce((a, b) => a + b, 0)}%
            </p>

            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={ajustando}
              style={{ marginTop: "1rem", backgroundColor: "#28a745" }}
            >
              {ajustando ? "Guardando..." : "Guardar Ajuste Final"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

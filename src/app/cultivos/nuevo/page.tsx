"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./nuevo.module.css";

export default function NuevoCultivoPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [hectareas, setHectareas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        ubicacion: ubicacion.trim() || null,
        hectareas: hectareas ? parseFloat(hectareas) : null,
      };
      if (payload.hectareas !== null && payload.hectareas <= 0)
        throw new Error("Las hectáreas deben ser mayores a 0.");
      await api.post("/cultivos/", payload);
      router.push("/dashboard");
    } catch (err: any) {
      if (err instanceof Error && err.message) setError(err.message);
      else if (err.response?.data?.detail) {
        const d = err.response.data.detail;
        setError(Array.isArray(d) ? "Revisa los datos ingresados." : d);
      } else setError("Ocurrió un error al guardar el cultivo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
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
          Volver al dashboard
        </button>
        <h1 className={styles.pageTitle}>Registrar nuevo cultivo</h1>
        <p className={styles.pageSubtitle}>
          Agrega una nueva parcela o área de cultivo
        </p>
      </div>

      <div className={styles.formCard}>
        {error && (
          <div className={styles.errorMsg}>
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
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="nombre">
              Nombre del cultivo <span className={styles.required}>*</span>
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Finca El Esfuerzo — Sector A"
              required
              maxLength={150}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="ubicacion">
                Ubicación <span className={styles.optional}>(opcional)</span>
              </label>
              <input
                id="ubicacion"
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="Ej. Estanzuela, Zacapa"
                maxLength={255}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="hectareas">
                Hectáreas <span className={styles.optional}>(opcional)</span>
              </label>
              <input
                id="hectareas"
                type="number"
                step="0.01"
                min="0.1"
                value={hectareas}
                onChange={(e) => setHectareas(e.target.value)}
                placeholder="Ej. 15.5"
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={() => router.push("/dashboard")}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={loading || !nombre.trim()}
            >
              {loading ? (
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
                  Guardar cultivo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

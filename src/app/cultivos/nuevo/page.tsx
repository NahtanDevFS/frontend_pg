"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./nuevo.module.css";
import BtnBack from "@/components/BtnBack";

export default function NuevoCultivoPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [hectareas, setHectareas] = useState("");
  const [totalSurcos, setTotalSurcos] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!totalSurcos || parseInt(totalSurcos) <= 0)
        throw new Error("El número de surcos debe ser mayor a 0.");

      const payload = {
        nombre: nombre.trim(),
        ubicacion: ubicacion.trim() || null,
        hectareas: hectareas ? parseFloat(hectareas) : null,
        total_surcos: parseInt(totalSurcos),
      };
      const res = await api.post("/cultivos/", payload);
      // Redirigir al detalle del cultivo recién creado para asignar operadores
      router.push(`/cultivos/${res.data.id}`);
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
        <BtnBack href="/dashboard" label="Volver" />
        <h1 className={styles.pageTitle}>Registrar nuevo cultivo</h1>
        <p className={styles.pageSubtitle}>
          Después de crearlo podrás asignar los operadores autorizados.
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
              placeholder="Ej. Cultivo sector A"
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
                placeholder="Ej. sector norte"
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
                value={hectareas}
                onChange={(e) => setHectareas(e.target.value)}
                placeholder="Ej. 3.5"
                min="0.01"
                step="0.01"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="surcos">
              Total de surcos <span className={styles.required}>*</span>
            </label>
            <input
              id="surcos"
              type="number"
              value={totalSurcos}
              onChange={(e) => setTotalSurcos(e.target.value)}
              placeholder="Ej. 48"
              required
              min="1"
            />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: "0.5rem" }}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => router.push("/dashboard")}
              style={{ flex: 1 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={loading}
              style={{ flex: 2 }}
            >
              {loading
                ? "Guardando..."
                : "Crear cultivo y asignar operadores →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

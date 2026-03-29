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

      if (payload.hectareas !== null && payload.hectareas <= 0) {
        throw new Error("Las hectáreas deben ser mayores a 0.");
      }

      await api.post("/cultivos/", payload);

      router.push("/dashboard");
    } catch (err: any) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else if (err.response?.data?.detail) {
        const detalle = err.response.data.detail;
        setError(
          Array.isArray(detalle) ? "Revisa los datos ingresados." : detalle,
        );
      } else {
        setError("Ocurrió un error inesperado al guardar el cultivo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Registrar Cultivo</h1>
        <button
          className={styles.btnBack}
          onClick={() => router.push("/dashboard")}
          type="button"
        >
          &larr; Volver al Dashboard
        </button>
      </header>

      {error && <div className={styles.errorMsg}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="nombre">Nombre de la Finca / Cultivo *</label>
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Finca El Esfuerzo - Sector A"
            required
            maxLength={150}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="ubicacion">Ubicación (Opcional)</label>
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
          <label htmlFor="hectareas">Tamaño en Hectáreas (Opcional)</label>
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

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={loading || nombre.trim() === ""}
        >
          {loading ? "Guardando..." : "Guardar Cultivo"}
        </button>
      </form>
    </div>
  );
}

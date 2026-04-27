"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Variedad } from "@/types";

export default function NuevaSesionPage() {
  const router = useRouter();
  const { id: cultivoId } = useParams();
  const [variedades, setVariedades] = useState<Variedad[]>([]);
  const [variedadId, setVariedadId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/catalogos/variedades").then((r) => {
      setVariedades(r.data);
      if (r.data.length > 0) setVariedadId(String(r.data[0].id));
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/sesiones/", {
        cultivo_id: parseInt(cultivoId as string),
        variedad_id: parseInt(variedadId),
      });
      router.push(`/cultivos/${cultivoId}/sesiones/${data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al crear la sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <button
        onClick={() => router.push(`/cultivos/${cultivoId}`)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--color-text-muted)",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        ← Volver al historial
      </button>

      <h1
        style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}
      >
        Nueva sesión de conteo
      </h1>
      <p
        style={{
          color: "var(--color-text-muted)",
          marginBottom: "2rem",
          fontSize: "0.9rem",
        }}
      >
        Una sesión agrupa todos los videos necesarios para contar el cultivo
        completo.
      </p>

      {error && (
        <div
          style={{
            background: "var(--color-danger-soft)",
            color: "var(--color-danger)",
            border: "1px solid var(--color-danger-border)",
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderRadius: 16,
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 600, fontSize: "0.875rem" }}>
            Variedad de melón
          </label>
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

        <button
          type="submit"
          disabled={loading || !variedadId}
          style={{
            padding: "12px",
            background: "var(--color-primary)",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: "1rem",
            cursor: "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Creando sesión..." : "Iniciar sesión de conteo"}
        </button>
      </form>
    </div>
  );
}

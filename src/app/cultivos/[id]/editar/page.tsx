"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Cultivo } from "@/types";
import BtnBack from "@/components/BtnBack";

export default function EditarCultivoPage() {
  const router = useRouter();
  const { id } = useParams();
  const [cultivo, setCultivo] = useState<Cultivo | null>(null);
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [hectareas, setHectareas] = useState("");
  const [totalSurcos, setTotalSurcos] = useState("");
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/cultivos/admin/todos`)
      .then((res) => {
        const c = res.data.find((cu: Cultivo) => cu.id === Number(id));
        if (!c) {
          setError("Cultivo no encontrado.");
          return;
        }
        setCultivo(c);
        setNombre(c.nombre);
        setUbicacion(c.ubicacion ?? "");
        setHectareas(c.hectareas ? String(c.hectareas) : "");
        setTotalSurcos(String(c.total_surcos));
      })
      .catch(() => setError("Error al cargar el cultivo."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      await api.put(`/cultivos/${id}`, {
        nombre: nombre.trim(),
        ubicacion: ubicacion.trim() || null,
        hectareas: hectareas ? parseFloat(hectareas) : null,
        total_surcos: parseInt(totalSurcos),
      });
      router.push(`/cultivos/${id}`);
    } catch (err: any) {
      const d = err.response?.data?.detail;
      setError(
        Array.isArray(d)
          ? "Revisa los datos ingresados."
          : (d ?? "Error al guardar."),
      );
    } finally {
      setGuardando(false);
    }
  };

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "60vh",
          gap: 12,
          flexDirection: "column",
          color: "var(--color-text-muted)",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            border: "3px solid var(--color-border)",
            borderTop: "3px solid var(--color-primary)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span>Cargando...</span>
      </div>
    );

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <BtnBack href="/dashboard" label="Volver" />
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--color-text)",
            letterSpacing: "-0.03em",
            marginBottom: 4,
          }}
        >
          Editar cultivo
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
          {cultivo?.nombre}
        </p>
      </div>

      <div
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "2rem",
        }}
      >
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--color-danger-soft)",
              color: "var(--color-danger)",
              border: "1px solid var(--color-danger-border)",
              padding: "10px 14px",
              borderRadius: "var(--radius)",
              marginBottom: "1.5rem",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--color-text)",
              }}
            >
              Nombre del cultivo{" "}
              <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              maxLength={150}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "var(--color-text)",
                }}
              >
                Ubicación{" "}
                <span
                  style={{
                    color: "var(--color-text-light)",
                    fontWeight: 400,
                    fontSize: "0.8rem",
                  }}
                >
                  (opcional)
                </span>
              </label>
              <input
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                maxLength={255}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "var(--color-text)",
                }}
              >
                Hectáreas{" "}
                <span
                  style={{
                    color: "var(--color-text-light)",
                    fontWeight: 400,
                    fontSize: "0.8rem",
                  }}
                >
                  (opcional)
                </span>
              </label>
              <input
                type="number"
                value={hectareas}
                onChange={(e) => setHectareas(e.target.value)}
                min="0.01"
                step="0.01"
                placeholder="Ej. 3.5"
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--color-text)",
              }}
            >
              Total de surcos{" "}
              <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <input
              type="number"
              value={totalSurcos}
              onChange={(e) => setTotalSurcos(e.target.value)}
              required
              min="1"
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: "0.5rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <button
              type="button"
              onClick={() => router.push(`/cultivos/${id}`)}
              style={{
                flex: 1,
                padding: 11,
                background: "none",
                color: "var(--color-text-muted)",
                border: "1.5px solid var(--color-border)",
                borderRadius: "var(--radius)",
                fontSize: "0.95rem",
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              style={{
                flex: 2,
                padding: 11,
                background: "var(--color-primary)",
                color: "white",
                border: "none",
                borderRadius: "var(--radius)",
                fontSize: "0.95rem",
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
                opacity: guardando ? 0.6 : 1,
              }}
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

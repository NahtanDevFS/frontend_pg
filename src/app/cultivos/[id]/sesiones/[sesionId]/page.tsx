"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { SesionConteo, ProcesamientoVideo, Calibre } from "@/types";

export default function DetalleSesionPage() {
  const router = useRouter();
  const { id: cultivoId, sesionId } = useParams();

  const [sesion, setSesion] = useState<SesionConteo | null>(null);
  const [procesamientos, setProcesamientos] = useState<ProcesamientoVideo[]>(
    [],
  );
  const [calibres, setCalibres] = useState<Calibre[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarDatos = async () => {
    try {
      const [resSesion, resProcs] = await Promise.all([
        api.get(`/sesiones/${sesionId}`),
        api.get(`/procesamientos/sesion/${sesionId}`),
      ]);
      setSesion(resSesion.data);
      setProcesamientos(resProcs.data);

      if (resSesion.data.variedad_id) {
        const resCal = await api.get(
          `/catalogos/variedades/${resSesion.data.variedad_id}/calibres`,
        );
        setCalibres(resCal.data);
      }
    } catch {
      // manejar error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [sesionId]);

  const nombreCalibre = (id: number) =>
    calibres.find((c) => c.id === id)?.nombre ?? `#${id}`;

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "60vh",
          flexDirection: "column",
          gap: 12,
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
        <span>Cargando sesión...</span>
      </div>
    );

  if (!sesion)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "3rem",
          color: "var(--color-danger)",
        }}
      >
        Sesión no encontrada.
      </div>
    );

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
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
          fontSize: "0.85rem",
        }}
      >
        ← Volver al historial
      </button>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 }}>
            Sesión #{sesion.id}
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
            {new Date(sesion.fecha_sesion).toLocaleDateString("es-GT", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={() =>
            router.push(`/cultivos/${cultivoId}/sesiones/${sesionId}/procesar`)
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "var(--color-primary)",
            color: "white",
            border: "none",
            padding: "10px 18px",
            borderRadius: 10,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Subir video
        </button>
      </div>

      {/* Resumen */}
      <div
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, #1b4332 100%)",
          borderRadius: "16px 16px 0 0",
          padding: "1.5rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p
            style={{
              color: "rgba(255,255,255,0.65)",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 6,
            }}
          >
            Total acumulado
          </p>
          <p
            style={{
              color: "white",
              fontSize: "3rem",
              fontWeight: 700,
              lineHeight: 1,
              fontFamily: "DM Mono, monospace",
            }}
          >
            {sesion.conteo_total_acumulado}
          </p>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem" }}>
            melones
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.75rem" }}>
            {procesamientos.length} video
            {procesamientos.length !== 1 ? "s" : ""} subido
            {procesamientos.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Lista de procesamientos */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderTop: 0,
          borderRadius: "0 0 16px 16px",
          padding: "1.5rem",
        }}
      >
        {procesamientos.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              color: "var(--color-text-muted)",
              padding: "2rem 0",
            }}
          >
            Aún no hay videos en esta sesión. Sube el primer video para comenzar
            el conteo.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {procesamientos.map((proc) => (
              <div
                key={proc.id}
                style={{
                  background: "var(--color-surface-alt)",
                  border: "1.5px solid var(--color-border)",
                  borderRadius: 12,
                  padding: "1rem 1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    background: "var(--color-primary-light)",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--color-primary)",
                    flexShrink: 0,
                  }}
                >
                  S{proc.surco_inicio}–{proc.surco_fin}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                    Surcos {proc.surco_inicio} al {proc.surco_fin}
                  </p>
                  <p
                    style={{
                      color: "var(--color-text-muted)",
                      fontSize: "0.8rem",
                    }}
                  >
                    {new Date(proc.fecha_grabacion).toLocaleDateString("es-GT")}
                  </p>
                </div>
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <p
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--color-text-light)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    IA
                  </p>
                  <p
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: 700,
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {proc.resultado?.conteo_ia ?? "—"}
                  </p>
                </div>
                {proc.resultado?.conteo_ajustado != null && (
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <p
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--color-text-light)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      Ajustado
                    </p>
                    <p
                      style={{
                        fontSize: "1.2rem",
                        fontWeight: 700,
                        color: "var(--color-primary)",
                        fontFamily: "DM Mono, monospace",
                      }}
                    >
                      {proc.resultado.conteo_ajustado}
                    </p>
                  </div>
                )}
                <div style={{ flexShrink: 0 }}>
                  {proc.resultado && (
                    <button
                      onClick={() =>
                        router.push(
                          `/cultivos/${cultivoId}/sesiones/${sesionId}/procesamientos/${proc.id}`,
                        )
                      }
                      style={{
                        background: "none",
                        border: "1.5px solid var(--color-border)",
                        color: "var(--color-primary)",
                        padding: "7px 12px",
                        borderRadius: 8,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      Ver detalles →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

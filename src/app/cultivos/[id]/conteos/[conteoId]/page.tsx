"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  Conteo,
  ProcesamientoVideo,
  Calibre,
  MuestreoResponse,
  ClasificacionCalibre,
  Cultivo,
} from "@/types";
import BtnBack from "@/components/BtnBack";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Gráfica de distribución ───────────────────────────────────
function GraficaDistribucion({
  clasificaciones,
}: {
  clasificaciones: ClasificacionCalibre[];
}) {
  if (!clasificaciones.length) return null;

  const max = Math.max(...clasificaciones.map((c) => c.cantidad_extrapolada));
  const total = clasificaciones.reduce((a, c) => a + c.cantidad_extrapolada, 0);
  const colores = ["#2d6a4f", "#52b788", "#74c69d", "#95d5b2", "#b7e4c7"];

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <h4
        style={{
          fontSize: "0.85rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--color-text)",
          marginBottom: "1.25rem",
        }}
      >
        Distribución por calibre
      </h4>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
          justifyContent: "center",
          height: 140,
          marginBottom: "1rem",
        }}
      >
        {clasificaciones.map((c, i) => {
          const heightPct = max > 0 ? (c.cantidad_extrapolada / max) * 100 : 0;
          return (
            <div
              key={c.calibre_id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                flex: 1,
              }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: colores[i % colores.length],
                }}
              >
                {c.cantidad_extrapolada.toLocaleString()}
              </span>
              <div
                style={{
                  width: "100%",
                  maxWidth: 52,
                  height: `${heightPct}%`,
                  minHeight: 4,
                  background: colores[i % colores.length],
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.3s",
                }}
              />
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--color-text)",
                }}
              >
                {c.nombre_calibre}
              </span>
              <span
                style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}
              >
                {c.porcentaje.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          overflow: "hidden",
          borderRadius: 10,
          border: "1.5px solid var(--color-border)",
          marginTop: "1rem",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-surface-alt, #f4f7f5)" }}>
              {["Calibre", "Muestreo", "%", "Extrapolado"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 14px",
                    textAlign: h === "Calibre" ? "left" : "right",
                    fontWeight: 700,
                    color: "var(--color-primary)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clasificaciones.map((c, i) => (
              <tr
                key={c.calibre_id}
                style={{
                  borderTop: "1px solid var(--color-border)",
                  background:
                    i % 2 === 0 ? "transparent" : "var(--color-surface-alt)",
                }}
              >
                <td style={{ padding: "10px 14px", fontWeight: 600 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: colores[i % colores.length],
                        flexShrink: 0,
                      }}
                    />
                    {c.nombre_calibre}
                  </span>
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  {c.cantidad_muestreo} / {c.total_muestreo}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    fontFamily: "DM Mono, monospace",
                    color: "var(--color-primary)",
                    fontWeight: 600,
                  }}
                >
                  {c.porcentaje.toFixed(1)}%
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    fontFamily: "DM Mono, monospace",
                    fontWeight: 700,
                  }}
                >
                  {c.cantidad_extrapolada.toLocaleString()}
                </td>
              </tr>
            ))}
            <tr
              style={{
                borderTop: "2px solid var(--color-border)",
                background: "var(--color-primary-light, #e8f5ee)",
              }}
            >
              <td
                style={{
                  padding: "10px 14px",
                  fontWeight: 700,
                  color: "var(--color-primary)",
                }}
              >
                Total
              </td>
              <td style={{ padding: "10px 14px" }} />
              <td
                style={{
                  padding: "10px 14px",
                  textAlign: "right",
                  fontWeight: 700,
                  color: "var(--color-primary)",
                  fontFamily: "DM Mono, monospace",
                }}
              >
                100%
              </td>
              <td
                style={{
                  padding: "10px 14px",
                  textAlign: "right",
                  fontWeight: 700,
                  color: "var(--color-primary)",
                  fontFamily: "DM Mono, monospace",
                }}
              >
                {total.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Badge confiabilidad ───────────────────────────────────────
function BadgeConfiabilidad({ nivel }: { nivel?: string | null }) {
  if (!nivel) return null;
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    alto: { bg: "#d1fae5", color: "#065f46", label: "Alta confiabilidad" },
    moderado: {
      bg: "#fff3cd",
      color: "#856404",
      label: "Confiabilidad moderada",
    },
    bajo: { bg: "#fee2e2", color: "#991b1b", label: "Baja confiabilidad" },
  };
  const s = cfg[nivel] ?? { bg: "#f3f4f6", color: "#374151", label: nivel };
  return (
    <span
      style={{
        fontSize: "0.75rem",
        padding: "3px 10px",
        borderRadius: 99,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function DetalleConteoPage() {
  const router = useRouter();
  const { id: cultivoId, conteoId } = useParams();

  const [conteo, setConteo] = useState<Conteo | null>(null);
  const [cultivo, setCultivo] = useState<Cultivo | null>(null);
  const [nombreVariedad, setNombreVariedad] = useState("");
  const [procesamientos, setProcesamientos] = useState<ProcesamientoVideo[]>(
    [],
  );
  const [muestreo, setMuestreo] = useState<MuestreoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportando, setExportando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      // Usar endpoints /admin/ — el admin es el único que accede a la web
      const [resConteo, resProcs] = await Promise.all([
        api.get(`/conteos/admin/${conteoId}`),
        api.get(`/procesamientos/admin/conteo/${conteoId}`),
      ]);
      setConteo(resConteo.data);
      setProcesamientos(resProcs.data);

      const [resVars, resCultivos] = await Promise.all([
        api.get("/catalogos/variedades"),
        api.get(`/cultivos/admin/todos`),
      ]);

      const variedad = resVars.data.find(
        (v: any) => v.id === resConteo.data.variedad_id,
      );
      setNombreVariedad(variedad?.nombre ?? "—");

      const cult = resCultivos.data.find(
        (c: any) => c.id === resConteo.data.cultivo_id,
      );
      setCultivo(cult ?? null);

      try {
        const resMuestreo = await api.get(
          `/conteos/admin/${conteoId}/muestreo`,
        );
        if (resMuestreo.data.clasificaciones?.length)
          setMuestreo(resMuestreo.data);
      } catch {
        // Sin muestreo aún, es válido
      }
    } catch {
      setError("Error al cargar el conteo.");
    } finally {
      setLoading(false);
    }
  }, [conteoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleExportarPDF = async () => {
    if (!conteo || !cultivo) return;
    setExportando(true);
    try {
      const { generarReportePDF } = await import("@/lib/generarReportePDF");
      generarReportePDF({
        conteo,
        cultivo,
        nombreVariedad,
        procesamientos,
        muestreo,
      });
    } catch {
      alert("Error al generar el reporte PDF.");
    } finally {
      setExportando(false);
    }
  };

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "60vh",
          gap: 14,
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
        <span>Cargando conteo...</span>
      </div>
    );

  if (!conteo || error)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "3rem",
          color: "var(--color-danger)",
        }}
      >
        {error || "Conteo no encontrado."}
      </div>
    );

  const conteoEfectivo = (p: ProcesamientoVideo) =>
    p.resultado?.conteo_ajustado ?? p.resultado?.conteo_ia ?? 0;

  const estadoNombre = conteo.estado_id === 2 ? "Completado" : "En progreso";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <BtnBack onClick={() => router.back()} label="Volver" />

          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 4 }}>
            Conteo #{conteo.id}
            {cultivo && (
              <span
                style={{
                  fontWeight: 400,
                  color: "var(--color-text-muted)",
                  fontSize: "1rem",
                }}
              >
                {" "}
                — {cultivo.nombre}
              </span>
            )}
          </h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span
              style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}
            >
              {new Date(conteo.fecha_conteo).toLocaleDateString("es-GT", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "2px 10px",
                borderRadius: 99,
                fontWeight: 600,
                background: conteo.estado_id === 2 ? "#d1fae5" : "#fff3cd",
                color: conteo.estado_id === 2 ? "#065f46" : "#856404",
              }}
            >
              {estadoNombre}
            </span>
            <BadgeConfiabilidad
              nivel={(conteo as any).nivel_confiabilidad_agregado}
            />
          </div>
        </div>
        <button
          onClick={handleExportarPDF}
          disabled={exportando}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 18px",
            background: "var(--color-primary)",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            cursor: "pointer",
            opacity: exportando ? 0.7 : 1,
            fontSize: "0.875rem",
            fontFamily: "inherit",
          }}
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {exportando ? "Generando..." : "Exportar PDF"}
        </button>
      </div>

      {/* Hero total */}
      <div
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, #1b4332 100%)",
          borderRadius: "var(--radius-xl, 14px) var(--radius-xl, 14px) 0 0",
          padding: "1.75rem 2rem",
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
              fontSize: "3.5rem",
              fontWeight: 700,
              lineHeight: 1,
              fontFamily: "DM Mono, monospace",
            }}
          >
            {conteo.conteo_total_acumulado.toLocaleString()}
          </p>
          <p
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: "0.9rem",
              marginTop: 4,
            }}
          >
            melones · {nombreVariedad}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem" }}>
            {procesamientos.length} video
            {procesamientos.length !== 1 ? "s" : ""}
          </p>
          {cultivo && (
            <p
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "0.75rem",
                marginTop: 4,
              }}
            >
              {cultivo.total_surcos} surcos totales
            </p>
          )}
        </div>
      </div>

      {/* Lista de procesamientos */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderTop: 0,
          padding: "1.5rem 2rem",
        }}
      >
        <h3
          style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "1rem" }}
        >
          Videos procesados
        </h3>
        {procesamientos.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
            Sin videos procesados aún.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {procesamientos.map((p) => {
              const efectivo = conteoEfectivo(p);
              const estadoProc =
                p.estado_id === 2
                  ? "completado"
                  : p.estado_id === 3
                    ? "error"
                    : "procesando";
              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    background: "var(--color-surface-alt, #f9fbfa)",
                    borderRadius: 10,
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 3 }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                      Surcos {p.surco_inicio}–{p.surco_fin}
                    </span>
                    <span
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {new Date(p.fecha_grabacion).toLocaleDateString("es-GT")}
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 16 }}
                  >
                    {p.resultado && (
                      <>
                        <div style={{ textAlign: "right" }}>
                          <p
                            style={{
                              fontSize: "0.7rem",
                              color: "var(--color-text-muted)",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            IA
                          </p>
                          <p
                            style={{
                              fontWeight: 700,
                              fontFamily: "DM Mono, monospace",
                            }}
                          >
                            {p.resultado.conteo_ia.toLocaleString()}
                          </p>
                        </div>
                        {p.resultado.conteo_ajustado != null && (
                          <div style={{ textAlign: "right" }}>
                            <p
                              style={{
                                fontSize: "0.7rem",
                                color: "var(--color-text-muted)",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}
                            >
                              Ajustado
                            </p>
                            <p
                              style={{
                                fontWeight: 700,
                                fontFamily: "DM Mono, monospace",
                                color: "var(--color-primary)",
                              }}
                            >
                              {p.resultado.conteo_ajustado.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {(p.resultado as any).nivel_confiabilidad && (
                          <BadgeConfiabilidad
                            nivel={(p.resultado as any).nivel_confiabilidad}
                          />
                        )}
                      </>
                    )}
                    <span
                      style={{
                        fontSize: "0.72rem",
                        padding: "2px 9px",
                        borderRadius: 99,
                        fontWeight: 600,
                        background:
                          estadoProc === "completado"
                            ? "#d1fae5"
                            : estadoProc === "error"
                              ? "#fee2e2"
                              : "#fff3cd",
                        color:
                          estadoProc === "completado"
                            ? "#065f46"
                            : estadoProc === "error"
                              ? "#991b1b"
                              : "#856404",
                      }}
                    >
                      {estadoProc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Segmentación por calibre — solo lectura para el admin */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderTop: 0,
          borderRadius: "0 0 var(--radius-xl, 14px) var(--radius-xl, 14px)",
          padding: "1.5rem 2rem",
        }}
      >
        <h3 style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 2 }}>
          Segmentación por calibre
        </h3>
        <p
          style={{
            color: "var(--color-text-muted)",
            fontSize: "0.85rem",
            marginBottom: "1rem",
          }}
        >
          Distribución extrapolada basada en el muestreo manual del operador.
        </p>
        {!muestreo || muestreo.clasificaciones.length === 0 ? (
          <div
            style={{
              padding: "1.5rem",
              textAlign: "center",
              color: "var(--color-text-muted)",
              background: "var(--color-surface-alt)",
              borderRadius: 10,
              border: "1.5px dashed var(--color-border)",
            }}
          >
            El operador aún no ha registrado el muestreo de calibres para este
            conteo.
          </div>
        ) : (
          <GraficaDistribucion clasificaciones={muestreo.clasificaciones} />
        )}
      </div>
    </div>
  );
}

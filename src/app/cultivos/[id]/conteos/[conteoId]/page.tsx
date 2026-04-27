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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Gráfica de distribución tipo campana ─────────────────────
function GraficaDistribucion({
  clasificaciones,
}: {
  clasificaciones: ClasificacionCalibre[];
}) {
  if (!clasificaciones.length) return null;

  const max = Math.max(...clasificaciones.map((c) => c.cantidad_extrapolada));
  const total = clasificaciones.reduce((a, c) => a + c.cantidad_extrapolada, 0);

  // Colores por calibre
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

      {/* Barras de campana */}
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
                  fontFamily: "DM Mono, monospace",
                }}
              >
                {c.cantidad_extrapolada.toLocaleString()}
              </span>
              <div
                style={{
                  width: "100%",
                  height: `${heightPct}%`,
                  minHeight: 4,
                  background: colores[i % colores.length],
                  borderRadius: "6px 6px 0 0",
                  transition: "height 0.5s ease",
                  position: "relative",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Etiquetas de calibre */}
      <div style={{ display: "flex", gap: 6 }}>
        {clasificaciones.map((c, i) => (
          <div key={c.calibre_id} style={{ flex: 1, textAlign: "center" }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: colores[i % colores.length],
                margin: "0 auto 3px",
              }}
            />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--color-text)",
              }}
            >
              {c.nombre_calibre}
            </span>
            <br />
            <span
              style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}
            >
              {c.porcentaje.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* Tabla resumen */}
      <div
        style={{
          marginTop: "1.25rem",
          background: "var(--color-surface-alt)",
          borderRadius: 10,
          overflow: "hidden",
          border: "1.5px solid var(--color-border)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.85rem",
          }}
        >
          <thead>
            <tr style={{ background: "var(--color-primary-light)" }}>
              <th
                style={{
                  padding: "8px 14px",
                  textAlign: "left",
                  fontWeight: 700,
                  color: "var(--color-primary)",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Calibre
              </th>
              <th
                style={{
                  padding: "8px 14px",
                  textAlign: "right",
                  fontWeight: 700,
                  color: "var(--color-primary)",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Muestreo
              </th>
              <th
                style={{
                  padding: "8px 14px",
                  textAlign: "right",
                  fontWeight: 700,
                  color: "var(--color-primary)",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                %
              </th>
              <th
                style={{
                  padding: "8px 14px",
                  textAlign: "right",
                  fontWeight: 700,
                  color: "var(--color-primary)",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Extrapolado
              </th>
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
                background: "var(--color-primary-light)",
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

// ── Formulario de muestreo ────────────────────────────────────
function FormularioMuestreo({
  conteoId,
  calibres,
  conteoTotal,
  muestreoActual,
  onGuardado,
}: {
  conteoId: number;
  calibres: Calibre[];
  conteoTotal: number;
  muestreoActual: MuestreoResponse | null;
  onGuardado: (m: MuestreoResponse) => void;
}) {
  const [totalMuestreo, setTotalMuestreo] = useState(
    muestreoActual?.total_muestreo ?? 100,
  );
  const [cantidades, setCantidades] = useState<{ [id: number]: number }>(() => {
    if (!muestreoActual) return {};
    return Object.fromEntries(
      muestreoActual.clasificaciones.map((c) => [
        c.calibre_id,
        c.cantidad_muestreo,
      ]),
    );
  });
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(!muestreoActual);

  const sumaActual = Object.values(cantidades).reduce((a, b) => a + b, 0);
  const sumaCuadra = sumaActual === totalMuestreo;

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sumaCuadra) return;
    setGuardando(true);
    try {
      const items = calibres
        .map((cal) => ({
          calibre_id: cal.id,
          cantidad_muestreo: cantidades[cal.id] || 0,
        }))
        .filter((i) => i.cantidad_muestreo > 0);

      const { data } = await api.post(`/conteos/${conteoId}/muestreo`, {
        total_muestreo: totalMuestreo,
        items,
      });
      onGuardado(data);
      setEditando(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al guardar el muestreo.");
    } finally {
      setGuardando(false);
    }
  };

  if (!editando && muestreoActual) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "0.5rem",
        }}
      >
        <button
          onClick={() => setEditando(true)}
          style={{
            background: "none",
            border: "1.5px solid var(--color-border)",
            color: "var(--color-primary)",
            padding: "7px 14px",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          Editar muestreo
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleGuardar}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--color-text)",
            }}
          >
            Total del muestreo
          </label>
          <input
            type="number"
            min="1"
            required
            value={totalMuestreo}
            onChange={(e) => setTotalMuestreo(Number(e.target.value))}
            style={{
              width: 100,
              fontFamily: "DM Mono, monospace",
              fontSize: "1rem",
              fontWeight: 700,
              textAlign: "center",
            }}
          />
        </div>
        <div
          style={{
            fontSize: "0.85rem",
            color: "var(--color-text-muted)",
            paddingTop: 18,
          }}
        >
          melones contados en el muestreo manual
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: 10,
          marginBottom: "1rem",
        }}
      >
        {calibres.map((cal) => {
          const val = cantidades[cal.id] || 0;
          return (
            <div
              key={cal.id}
              style={{
                background: "var(--color-surface-alt)",
                border: "1.5px solid var(--color-border)",
                borderRadius: 10,
                padding: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                  {cal.nombre}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-primary)",
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  {totalMuestreo > 0
                    ? ((val / totalMuestreo) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <input
                type="number"
                min="0"
                max={totalMuestreo}
                placeholder="0"
                value={cantidades[cal.id] || ""}
                onChange={(e) =>
                  setCantidades((p) => ({
                    ...p,
                    [cal.id]: Number(e.target.value),
                  }))
                }
                style={{
                  textAlign: "center",
                  fontFamily: "DM Mono, monospace",
                  fontSize: "1rem",
                  fontWeight: 700,
                }}
              />
              {val > 0 && (
                <div
                  style={{
                    height: 3,
                    background: "var(--color-border)",
                    borderRadius: 99,
                    marginTop: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min((val / totalMuestreo) * 100, 100)}%`,
                      background: "var(--color-primary)",
                      borderRadius: 99,
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Estado de la suma */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 8,
          marginBottom: "1rem",
          fontSize: "0.875rem",
          background: sumaCuadra
            ? "var(--color-success-soft)"
            : sumaActual > totalMuestreo
              ? "var(--color-danger-soft)"
              : "var(--color-warning-soft)",
          color: sumaCuadra
            ? "var(--color-success)"
            : sumaActual > totalMuestreo
              ? "var(--color-danger)"
              : "var(--color-warning)",
          border: `1px solid ${sumaCuadra ? "#a7f3d0" : sumaActual > totalMuestreo ? "var(--color-danger-border)" : "#fde68a"}`,
        }}
      >
        <strong>
          {sumaActual} / {totalMuestreo}
        </strong>
        <span>
          {sumaCuadra && "✓ El muestreo está completo"}
          {!sumaCuadra &&
            sumaActual < totalMuestreo &&
            `Faltan ${totalMuestreo - sumaActual} por asignar`}
          {sumaActual > totalMuestreo &&
            `Excede en ${sumaActual - totalMuestreo}`}
        </span>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {muestreoActual && (
          <button
            type="button"
            onClick={() => setEditando(false)}
            style={{
              flex: 1,
              padding: "11px",
              background: "none",
              border: "1.5px solid var(--color-border)",
              borderRadius: 10,
              fontWeight: 600,
              cursor: "pointer",
              color: "var(--color-text-muted)",
            }}
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={guardando || !sumaCuadra}
          style={{
            flex: 2,
            padding: "11px",
            background: "var(--color-primary)",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "0.95rem",
            opacity: guardando || !sumaCuadra ? 0.5 : 1,
          }}
        >
          {guardando ? "Guardando..." : "Guardar muestreo"}
        </button>
      </div>
    </form>
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
  const [calibres, setCalibres] = useState<Calibre[]>([]);
  const [muestreo, setMuestreo] = useState<MuestreoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportando, setExportando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [resConteo, resProcs] = await Promise.all([
        api.get(`/conteos/${conteoId}`),
        api.get(`/procesamientos/conteo/${conteoId}`),
      ]);
      setConteo(resConteo.data);
      setProcesamientos(resProcs.data);

      const [resCal, resVars, resCultivos] = await Promise.all([
        api.get(`/catalogos/variedades/${resConteo.data.variedad_id}/calibres`),
        api.get(`/catalogos/variedades`),
        api.get(`/cultivos/`),
      ]);
      setCalibres(resCal.data);

      const variedad = resVars.data.find(
        (v: any) => v.id === resConteo.data.variedad_id,
      );
      setNombreVariedad(variedad?.nombre ?? "—");

      const cult = resCultivos.data.find(
        (c: any) => c.id === resConteo.data.cultivo_id,
      );
      setCultivo(cult ?? null);

      try {
        const resMuestreo = await api.get(`/conteos/${conteoId}/muestreo`);
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

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <button
          onClick={() => router.push(`/cultivos/${cultivoId}`)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            fontSize: "0.85rem",
            cursor: "pointer",
            padding: 0,
            marginBottom: 8,
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
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver a conteos
        </button>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                marginBottom: 4,
                color: "var(--color-text)",
              }}
            >
              Conteo #{conteo.id}
            </h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
              {new Date(conteo.fecha_conteo).toLocaleDateString("es-GT", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
              {" · "}
              <span
                style={{
                  color:
                    conteo.estado_id === 2
                      ? "var(--color-success)"
                      : "var(--color-primary)",
                  fontWeight: 600,
                }}
              >
                {conteo.estado_id === 2 ? "completado" : "en progreso"}
              </span>
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() =>
                router.push(
                  `/cultivos/${cultivoId}/procesar?conteo=${conteoId}`,
                )
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                background: "none",
                border: "1.5px solid var(--color-border)",
                color: "var(--color-primary)",
                padding: "9px 16px",
                borderRadius: 10,
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.875rem",
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
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Subir video
            </button>
            <button
              onClick={handleExportarPDF}
              disabled={exportando}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                background: "var(--color-primary)",
                color: "white",
                border: "none",
                padding: "9px 16px",
                borderRadius: 10,
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.875rem",
                opacity: exportando ? 0.7 : 1,
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
        </div>
      </div>

      {/* Hero total */}
      <div
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, #1b4332 100%)",
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
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
            Total acumulado (IA)
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
            melones
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem" }}>
            {procesamientos.length} video
            {procesamientos.length !== 1 ? "s" : ""}
          </p>
          {muestreo && (
            <p
              style={{
                color: "#86efac",
                fontSize: "0.85rem",
                marginTop: 4,
                fontWeight: 600,
              }}
            >
              Muestreo aplicado ✓
            </p>
          )}
        </div>
      </div>

      {/* Videos */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderTop: 0,
        }}
      >
        <div
          style={{
            padding: "1rem 1.5rem",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem" }}>
            Videos procesados
          </h3>
          <span
            style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}
          >
            {procesamientos.length} video
            {procesamientos.length !== 1 ? "s" : ""}
          </span>
        </div>

        {procesamientos.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "var(--color-text-muted)",
            }}
          >
            Aún no hay videos en este conteo.
          </div>
        ) : (
          <div>
            {procesamientos.map((proc) => (
              <div
                key={proc.id}
                style={{
                  padding: "1rem 1.5rem",
                  borderBottom: "1px solid var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                {/* Surcos */}
                <div
                  style={{
                    background: "var(--color-primary-light)",
                    border: "1px solid var(--color-accent-soft)",
                    borderRadius: 8,
                    padding: "4px 10px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "var(--color-primary)",
                    flexShrink: 0,
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  S{proc.surco_inicio}–{proc.surco_fin}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      marginBottom: 2,
                    }}
                  >
                    Surcos {proc.surco_inicio} al {proc.surco_fin}
                  </p>
                  <p
                    style={{
                      color: "var(--color-text-muted)",
                      fontSize: "0.8rem",
                    }}
                  >
                    {new Date(proc.fecha_grabacion).toLocaleDateString("es-GT")}
                    {proc.resultado?.conteo_ajustado != null && (
                      <span
                        style={{
                          color: "var(--color-primary)",
                          marginLeft: 8,
                          fontWeight: 600,
                        }}
                      >
                        ajustado a{" "}
                        {proc.resultado.conteo_ajustado.toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>

                {/* Conteo */}
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <p
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--color-text-light)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    IA
                  </p>
                  <p
                    style={{
                      fontSize: "1.3rem",
                      fontWeight: 700,
                      fontFamily: "DM Mono, monospace",
                      lineHeight: 1.1,
                    }}
                  >
                    {proc.resultado?.conteo_ia?.toLocaleString() ?? "—"}
                  </p>
                </div>

                {/* Acciones */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {proc.video_anotado_url && (
                    <a
                      href={`${API_URL}/videos/${proc.video_anotado_url.split("/").pop()}`}
                      download
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        background: "none",
                        border: "1.5px solid var(--color-border)",
                        color: "var(--color-text)",
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        textDecoration: "none",
                      }}
                    >
                      <svg
                        width="13"
                        height="13"
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
                      Video
                    </a>
                  )}
                  {proc.resultado && (
                    <button
                      onClick={() =>
                        router.push(
                          `/cultivos/${cultivoId}/procesamientos/${proc.id}`,
                        )
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        background: "none",
                        border: "1.5px solid var(--color-border)",
                        color: "var(--color-primary)",
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      Ajustar
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Muestreo y gráfica */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderTop: 0,
          borderRadius: "0 0 var(--radius-xl) var(--radius-xl)",
          padding: "1.5rem 2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <h3
              style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 2 }}
            >
              Segmentación por calibre
            </h3>
            <p
              style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}
            >
              Ingresa el muestreo manual para extrapolar la distribución al
              total del conteo
            </p>
          </div>
        </div>

        {conteo.conteo_total_acumulado === 0 ? (
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
            El muestreo estará disponible una vez que haya videos procesados con
            conteo mayor a 0.
          </div>
        ) : (
          <>
            <FormularioMuestreo
              conteoId={conteo.id}
              calibres={calibres}
              conteoTotal={conteo.conteo_total_acumulado}
              muestreoActual={muestreo}
              onGuardado={(m) => setMuestreo(m)}
            />
            {muestreo && muestreo.clasificaciones.length > 0 && (
              <GraficaDistribucion clasificaciones={muestreo.clasificaciones} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Conteo, Cultivo, Usuario } from "@/types";

// ── Mini gráfica de tendencia por cultivo ─────────────────────
function GraficaTendencia({ conteos }: { conteos: Conteo[] }) {
  if (conteos.length < 2) return null;

  const completados = conteos
    .filter((c) => c.estado_id === 2 && c.conteo_total_acumulado > 0)
    .sort(
      (a, b) =>
        new Date(a.fecha_conteo).getTime() - new Date(b.fecha_conteo).getTime(),
    );

  if (completados.length < 2) return null;

  const max = Math.max(...completados.map((c) => c.conteo_total_acumulado));
  const W = 300;
  const H = 80;
  const PAD = 10;
  const w = W - PAD * 2;
  const h = H - PAD * 2;

  const points = completados.map((c, i) => {
    const x = PAD + (i / (completados.length - 1)) * w;
    const y = PAD + h - (c.conteo_total_acumulado / max) * h;
    return `${x},${y}`;
  });

  const polyline = points.join(" ");

  return (
    <div>
      <p
        style={{
          fontSize: "0.75rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--color-text-muted)",
          marginBottom: 6,
        }}
      >
        Tendencia (ciclos completados)
      </p>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ overflow: "visible" }}
      >
        <polyline
          points={polyline}
          fill="none"
          stroke="#52b788"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {completados.map((c, i) => {
          const x = PAD + (i / (completados.length - 1)) * w;
          const y = PAD + h - (c.conteo_total_acumulado / max) * h;
          return (
            <g key={c.id}>
              <circle cx={x} cy={y} r={4} fill="#2d6a4f" />
              <text
                x={x}
                y={y - 8}
                textAnchor="middle"
                fontSize="9"
                fill="#5a7a6a"
              >
                {c.conteo_total_acumulado.toLocaleString()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Badge de confiabilidad ─────────────────────────────────────
function BadgeConfiabilidad({ nivel }: { nivel?: string | null }) {
  if (!nivel)
    return (
      <span style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
        —
      </span>
    );
  const cfg: Record<string, { bg: string; color: string }> = {
    alto: { bg: "#d1fae5", color: "#065f46" },
    moderado: { bg: "#fff3cd", color: "#856404" },
    bajo: { bg: "#fee2e2", color: "#991b1b" },
  };
  const s = cfg[nivel] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      style={{
        fontSize: "0.75rem",
        padding: "2px 10px",
        borderRadius: 99,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      {nivel}
    </span>
  );
}

// ── Página principal ───────────────────────────────────────────
export default function HistorialPage() {
  const router = useRouter();

  const [conteos, setConteos] = useState<Conteo[]>([]);
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [operadores, setOperadores] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroCultivo, setFiltroCultivo] = useState("");
  const [filtroOperador, setFiltroOperador] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // Vista
  const [modoVista, setModoVista] = useState<"tabla" | "tendencia">("tabla");
  const [exportando, setExportando] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroCultivo) params.append("cultivo_id", filtroCultivo);
      if (filtroOperador) params.append("usuario_id", filtroOperador);
      if (fechaDesde) params.append("fecha_desde", fechaDesde);
      if (fechaHasta) params.append("fecha_hasta", fechaHasta);

      const [resConteos, resCultivos, resOps] = await Promise.all([
        api.get<Conteo[]>(`/conteos/admin/historial?${params}`),
        api.get<Cultivo[]>("/cultivos/admin/todos"),
        api.get<Usuario[]>("/usuarios/"),
      ]);
      setConteos(resConteos.data);
      setCultivos(resCultivos.data);
      setOperadores(resOps.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filtroCultivo, filtroOperador, fechaDesde, fechaHasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombreCultivo = (id: number) =>
    cultivos.find((c) => c.id === id)?.nombre ?? `#${id}`;

  const nombreOperador = (cultivo_id: number) => {
    const cult = cultivos.find((c) => c.id === cultivo_id);
    if (!cult) return "—";
    return operadores.find((u) => u.id === cult.usuario_id)?.nombre ?? "—";
  };

  const handleExportarPDF = async (conteoId: number, cultivoId: number) => {
    setExportando(conteoId);
    try {
      const [resConteo, resCultivo, resProcs, resVars] = await Promise.all([
        api.get(`/conteos/admin/${conteoId}`),
        api
          .get(`/cultivos/admin/todos`)
          .then((r) => r.data.find((c: Cultivo) => c.id === cultivoId)),
        api.get(`/procesamientos/admin/conteo/${conteoId}`),
        api.get("/catalogos/variedades"),
      ]);

      let muestreo = null;
      try {
        const resMuestreo = await api.get(
          `/conteos/admin/${conteoId}/muestreo`,
        );
        if (resMuestreo.data?.clasificaciones?.length)
          muestreo = resMuestreo.data;
      } catch {}

      const variedad = resVars.data.find(
        (v: any) => v.id === resConteo.data.variedad_id,
      );

      const { generarReportePDF } = await import("@/lib/generarReportePDF");
      generarReportePDF({
        conteo: resConteo.data,
        cultivo: resCultivo,
        nombreVariedad: variedad?.nombre ?? "—",
        procesamientos: resProcs.data,
        muestreo,
      });
    } catch {
      alert("Error al generar el reporte.");
    } finally {
      setExportando(null);
    }
  };

  // Agrupar conteos por cultivo para la vista de tendencia
  const conteosPorCultivo = cultivos
    .map((cult) => ({
      cultivo: cult,
      conteos: conteos.filter((c) => c.cultivo_id === cult.id),
    }))
    .filter((g) => g.conteos.length > 0);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.75rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 }}>
            Historial de conteos
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
            {conteos.length} conteo{conteos.length !== 1 ? "s" : ""} encontrado
            {conteos.length !== 1 ? "s" : ""}
          </p>
        </div>
        {/* Toggle vista */}
        <div
          style={{
            display: "flex",
            gap: 6,
            border: "1.5px solid var(--color-border)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {(["tabla", "tendencia"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setModoVista(v)}
              style={{
                padding: "7px 16px",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.85rem",
                background:
                  modoVista === v ? "var(--color-primary)" : "transparent",
                color: modoVista === v ? "white" : "var(--color-text-muted)",
                fontFamily: "inherit",
              }}
            >
              {v === "tabla" ? "Tabla" : "Tendencia"}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: "1.5rem",
          padding: "1rem 1.25rem",
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderRadius: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            minWidth: 180,
          }}
        >
          <label
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-text-muted)",
            }}
          >
            Cultivo
          </label>
          <select
            value={filtroCultivo}
            onChange={(e) => setFiltroCultivo(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              border: "1.5px solid var(--color-border)",
              fontSize: "0.875rem",
            }}
          >
            <option value="">Todos</option>
            {cultivos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            minWidth: 160,
          }}
        >
          <label
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-text-muted)",
            }}
          >
            Operador
          </label>
          <select
            value={filtroOperador}
            onChange={(e) => setFiltroOperador(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              border: "1.5px solid var(--color-border)",
              fontSize: "0.875rem",
            }}
          >
            <option value="">Todos</option>
            {operadores.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-text-muted)",
            }}
          >
            Desde
          </label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              border: "1.5px solid var(--color-border)",
              fontSize: "0.875rem",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-text-muted)",
            }}
          >
            Hasta
          </label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              border: "1.5px solid var(--color-border)",
              fontSize: "0.875rem",
            }}
          />
        </div>
        {(filtroCultivo || filtroOperador || fechaDesde || fechaHasta) && (
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              onClick={() => {
                setFiltroCultivo("");
                setFiltroOperador("");
                setFechaDesde("");
                setFechaHasta("");
              }}
              style={{
                padding: "7px 14px",
                background: "none",
                border: "1.5px solid var(--color-border)",
                borderRadius: 8,
                fontSize: "0.85rem",
                cursor: "pointer",
                color: "var(--color-text-muted)",
                fontFamily: "inherit",
              }}
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "3rem",
            color: "var(--color-text-muted)",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: "3px solid var(--color-border)",
              borderTop: "3px solid var(--color-primary)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      ) : modoVista === "tabla" ? (
        // ── Vista tabla ──────────────────────────────────────
        <div
          style={{
            background: "var(--color-surface)",
            border: "1.5px solid var(--color-border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {conteos.length === 0 ? (
            <p
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--color-text-muted)",
              }}
            >
              No se encontraron conteos con los filtros aplicados.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-surface-alt, #f4f7f5)" }}>
                  {[
                    "#",
                    "Cultivo",
                    "Operador",
                    "Fecha",
                    "Total melones",
                    "Confiabilidad",
                    "Estado",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--color-text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conteos.map((c, i) => (
                  <tr
                    key={c.id}
                    style={{
                      borderTop: "1px solid var(--color-border)",
                      background:
                        i % 2 === 0
                          ? "transparent"
                          : "var(--color-surface-alt, #fafcfb)",
                    }}
                  >
                    <td
                      style={{
                        padding: "11px 14px",
                        color: "var(--color-text-muted)",
                        fontSize: "0.8rem",
                      }}
                    >
                      #{c.id}
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                      }}
                    >
                      <button
                        onClick={() =>
                          router.push(
                            `/cultivos/${c.cultivo_id}/conteos/${c.id}`,
                          )
                        }
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-primary)",
                          fontWeight: 600,
                          fontSize: "0.875rem",
                          padding: 0,
                          fontFamily: "inherit",
                          textDecoration: "underline",
                          textDecorationColor: "transparent",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.textDecorationColor =
                            "currentColor")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.textDecorationColor =
                            "transparent")
                        }
                      >
                        {nombreCultivo(c.cultivo_id)}
                      </button>
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        fontSize: "0.85rem",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {nombreOperador(c.cultivo_id)}
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: "0.85rem" }}>
                      {new Date(c.fecha_conteo).toLocaleDateString("es-GT", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        fontWeight: 700,
                        fontSize: "1rem",
                        fontFamily: "DM Mono, monospace",
                        color:
                          c.conteo_total_acumulado > 0
                            ? "var(--color-primary)"
                            : "var(--color-text-muted)",
                      }}
                    >
                      {c.conteo_total_acumulado > 0
                        ? c.conteo_total_acumulado.toLocaleString()
                        : "—"}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <BadgeConfiabilidad
                        nivel={(c as any).nivel_confiabilidad_agregado}
                      />
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          padding: "2px 10px",
                          borderRadius: 99,
                          fontWeight: 600,
                          background: c.estado_id === 2 ? "#d1fae5" : "#fff3cd",
                          color: c.estado_id === 2 ? "#065f46" : "#856404",
                        }}
                      >
                        {c.estado_id === 2 ? "Completado" : "En progreso"}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <button
                        onClick={() => handleExportarPDF(c.id, c.cultivo_id)}
                        disabled={exportando === c.id}
                        style={{
                          padding: "5px 12px",
                          background: "none",
                          border: "1.5px solid var(--color-border)",
                          borderRadius: 8,
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          color: "var(--color-text-muted)",
                          opacity: exportando === c.id ? 0.5 : 1,
                          fontFamily: "inherit",
                        }}
                      >
                        {exportando === c.id ? "..." : "PDF"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {conteosPorCultivo.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", gridColumn: "1/-1" }}>
              No hay datos de tendencia con los filtros aplicados.
            </p>
          ) : (
            conteosPorCultivo.map(({ cultivo, conteos: cs }) => (
              <div
                key={cultivo.id}
                style={{
                  background: "var(--color-surface)",
                  border: "1.5px solid var(--color-border)",
                  borderRadius: 14,
                  padding: "1.25rem 1.5rem",
                }}
              >
                <div style={{ marginBottom: "0.75rem" }}>
                  <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                    {cultivo.nombre}
                  </p>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {nombreOperador(cultivo.id)} · {cs.length} conteo
                    {cs.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <GraficaTendencia conteos={cs} />
                {cs.filter(
                  (c) => c.estado_id === 2 && c.conteo_total_acumulado > 0,
                ).length < 2 && (
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--color-text-muted)",
                      fontStyle: "italic",
                      marginTop: 8,
                    }}
                  >
                    Se necesitan al menos 2 conteos completados para ver la
                    tendencia.
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

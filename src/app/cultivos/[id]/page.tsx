"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Conteo, Cultivo, Usuario } from "@/types";

interface OperadorAsignado {
  id: number;
  usuario_id: number;
  nombre: string;
  activo: boolean;
  created_at: string;
}

// ── Gráfica de tendencia histórica ────────────────────────────
function GraficaTendencia({ conteos }: { conteos: Conteo[] }) {
  const completados = conteos
    .filter((c) => c.estado_id === 2 && c.conteo_total_acumulado > 0)
    .sort(
      (a, b) =>
        new Date(a.fecha_conteo).getTime() - new Date(b.fecha_conteo).getTime(),
    );

  if (completados.length < 2)
    return (
      <p
        style={{
          fontSize: "0.85rem",
          color: "var(--color-text-muted)",
          fontStyle: "italic",
        }}
      >
        Se necesitan al menos 2 ciclos completados para mostrar la tendencia.
      </p>
    );

  const max = Math.max(...completados.map((c) => c.conteo_total_acumulado));
  const W = 560;
  const H = 120;
  const PAD_X = 48;
  const PAD_Y = 20;
  const w = W - PAD_X * 2;
  const h = H - PAD_Y * 2;

  const pts = completados.map((c, i) => ({
    x: PAD_X + (i / (completados.length - 1)) * w,
    y: PAD_Y + h - (c.conteo_total_acumulado / max) * h,
    conteo: c,
  }));

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", minWidth: 300 }}
      >
        <line
          x1={PAD_X}
          y1={PAD_Y}
          x2={W - PAD_X}
          y2={PAD_Y}
          stroke="#e8eeeb"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        <polygon
          points={`${pts[0].x},${PAD_Y + h} ${pts.map((p) => `${p.x},${p.y}`).join(" ")} ${pts[pts.length - 1].x},${PAD_Y + h}`}
          fill="#52b788"
          opacity="0.08"
        />
        <polyline
          points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#52b788"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((p, i) => {
          const anterior =
            i > 0 ? completados[i - 1].conteo_total_acumulado : null;
          const variacion = anterior
            ? (
                ((p.conteo.conteo_total_acumulado - anterior) / anterior) *
                100
              ).toFixed(1)
            : null;
          const subio = variacion ? parseFloat(variacion) >= 0 : null;
          return (
            <g key={p.conteo.id}>
              <circle
                cx={p.x}
                cy={p.y}
                r={5}
                fill="white"
                stroke="#2d6a4f"
                strokeWidth="2"
              />
              <text
                x={p.x}
                y={p.y - 12}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#2d6a4f"
              >
                {p.conteo.conteo_total_acumulado.toLocaleString()}
              </text>
              {variacion && (
                <text
                  x={p.x}
                  y={p.y - 24}
                  textAnchor="middle"
                  fontSize="9"
                  fill={subio ? "#059669" : "#dc2626"}
                >
                  {subio ? "▲" : "▼"} {Math.abs(parseFloat(variacion))}%
                </text>
              )}
              <text
                x={p.x}
                y={H - 4}
                textAnchor="middle"
                fontSize="8"
                fill="#8fa898"
              >
                {new Date(p.conteo.fecha_conteo).toLocaleDateString("es-GT", {
                  day: "2-digit",
                  month: "short",
                })}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function DetalleCultivoPage() {
  const router = useRouter();
  const { id: cultivoId } = useParams();
  const [cultivo, setCultivo] = useState<Cultivo | null>(null);
  const [conteos, setConteos] = useState<Conteo[]>([]);
  const [operadores, setOperadores] = useState<OperadorAsignado[]>([]);
  const [todosOperadores, setTodosOperadores] = useState<Usuario[]>([]);
  const [nuevoOpId, setNuevoOpId] = useState("");
  const [asignando, setAsignando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargar = async () => {
    try {
      const [resConteos, resCultivos, resOps, resTodos] = await Promise.all([
        api.get(`/conteos/admin/historial?cultivo_id=${cultivoId}`),
        api.get(`/cultivos/admin/todos`),
        api.get(`/cultivos/${cultivoId}/operadores`),
        api.get<Usuario[]>(`/usuarios/`),
      ]);
      setConteos(resConteos.data);
      setCultivo(
        resCultivos.data.find((c: Cultivo) => c.id === Number(cultivoId)) ??
          null,
      );
      setOperadores(resOps.data);
      setTodosOperadores(resTodos.data);
    } catch {
      setError("Error al cargar los datos del cultivo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [cultivoId]);

  const handleAsignar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoOpId) return;
    setAsignando(true);
    try {
      await api.post(`/cultivos/${cultivoId}/operadores`, {
        usuario_id: parseInt(nuevoOpId),
      });
      setNuevoOpId("");
      await cargar();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al asignar operador.");
    } finally {
      setAsignando(false);
    }
  };

  const handleQuitar = async (usuario_id: number, nombre: string) => {
    if (!confirm(`¿Quitar el acceso de "${nombre}" a este cultivo?`)) return;
    try {
      await api.delete(`/cultivos/${cultivoId}/operadores/${usuario_id}`);
      await cargar();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al quitar operador.");
    }
  };

  // Operadores que aún no están asignados
  const asignadosIds = new Set(operadores.map((o) => o.usuario_id));
  const disponibles = todosOperadores.filter(
    (u) => !asignadosIds.has(u.id) && u.rol_id !== 1, // excluir admins
  );

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

  const completados = conteos.filter((c) => c.estado_id === 2).length;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-muted)",
            marginBottom: "0.5rem",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: "0.85rem",
            padding: 0,
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
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver a cultivos
        </button>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 }}>
          {cultivo?.nombre ?? `Cultivo #${cultivoId}`}
        </h1>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {cultivo?.ubicacion && (
            <span
              style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}
            >
              📍 {cultivo.ubicacion}
            </span>
          )}
          {cultivo?.hectareas && (
            <span
              style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}
            >
              {cultivo.hectareas} ha
            </span>
          )}
          {cultivo?.total_surcos && (
            <span
              style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}
            >
              {cultivo.total_surcos} surcos
            </span>
          )}
          <span
            style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}
          >
            {completados} conteo{completados !== 1 ? "s" : ""} completado
            {completados !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "1rem",
            background: "#fee2e2",
            borderRadius: 10,
            color: "#991b1b",
            marginBottom: "1.5rem",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Panel de operadores asignados */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderRadius: 14,
          padding: "1.5rem 1.75rem",
          marginBottom: "1.5rem",
        }}
      >
        <h3
          style={{
            fontWeight: 700,
            fontSize: "0.95rem",
            marginBottom: "0.25rem",
          }}
        >
          Operadores asignados
        </h3>
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--color-text-muted)",
            marginBottom: "1.25rem",
          }}
        >
          Solo los operadores asignados pueden subir videos y gestionar conteos
          de este cultivo.
        </p>

        {/* Lista de asignados */}
        {operadores.length === 0 ? (
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
              fontStyle: "italic",
              marginBottom: "1rem",
            }}
          >
            Ningún operador asignado todavía.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: "1.25rem",
            }}
          >
            {operadores.map((op) => (
              <div
                key={op.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  background: "#e8f5ee",
                  border: "1.5px solid #b7e4c7",
                  borderRadius: 99,
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    color: "#2d6a4f",
                  }}
                >
                  {op.nombre}
                </span>
                <button
                  onClick={() => handleQuitar(op.usuario_id, op.nombre)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#52b788",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    lineHeight: 1,
                  }}
                  title={`Quitar a ${op.nombre}`}
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
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Asignar nuevo operador */}
        {disponibles.length > 0 && (
          <form
            onSubmit={handleAsignar}
            style={{ display: "flex", gap: 10, alignItems: "center" }}
          >
            <select
              value={nuevoOpId}
              onChange={(e) => setNuevoOpId(e.target.value)}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: "1.5px solid var(--color-border)",
                fontSize: "0.875rem",
                flex: 1,
                maxWidth: 240,
              }}
            >
              <option value="">Seleccionar operador...</option>
              {disponibles.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={asignando || !nuevoOpId}
              style={{
                padding: "7px 18px",
                background: "var(--color-primary)",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.875rem",
                opacity: asignando || !nuevoOpId ? 0.6 : 1,
                fontFamily: "inherit",
              }}
            >
              {asignando ? "Asignando..." : "+ Asignar"}
            </button>
          </form>
        )}
        {disponibles.length === 0 && todosOperadores.length > 0 && (
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--color-text-muted)",
              fontStyle: "italic",
            }}
          >
            Todos los operadores disponibles ya están asignados.
          </p>
        )}
      </div>

      {/* Gráfica de tendencia */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderRadius: 14,
          padding: "1.5rem 1.75rem",
          marginBottom: "1.5rem",
        }}
      >
        <h3
          style={{
            fontWeight: 700,
            fontSize: "0.95rem",
            marginBottom: "0.25rem",
          }}
        >
          Tendencia histórica
        </h3>
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--color-text-muted)",
            marginBottom: "1.25rem",
          }}
        >
          Total de melones por ciclo completado y variación porcentual entre
          ciclos.
        </p>
        <GraficaTendencia conteos={conteos} />
      </div>

      {/* Lista de conteos */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "1.25rem 1.75rem",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem" }}>
            Historial de conteos ({conteos.length})
          </h3>
        </div>
        {conteos.length === 0 ? (
          <p
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "var(--color-text-muted)",
            }}
          >
            No hay conteos registrados para este cultivo.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-alt, #f4f7f5)" }}>
                {[
                  "#",
                  "Fecha",
                  "Total melones",
                  "Confiabilidad",
                  "Estado",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px",
                      textAlign: h === "Total melones" ? "right" : "left",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--color-text-muted)",
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
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    router.push(`/cultivos/${cultivoId}/conteos/${c.id}`)
                  }
                >
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "var(--color-text-muted)",
                      fontSize: "0.8rem",
                    }}
                  >
                    #{c.id}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "0.875rem" }}>
                    {new Date(c.fecha_conteo).toLocaleDateString("es-GT", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      fontWeight: 700,
                      fontFamily: "DM Mono, monospace",
                      fontSize: "1rem",
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
                  <td style={{ padding: "12px 16px" }}>
                    {(c as any).nivel_confiabilidad_agregado ? (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          padding: "2px 9px",
                          borderRadius: 99,
                          fontWeight: 600,
                          background:
                            (c as any).nivel_confiabilidad_agregado === "alto"
                              ? "#d1fae5"
                              : (c as any).nivel_confiabilidad_agregado ===
                                  "moderado"
                                ? "#fff3cd"
                                : "#fee2e2",
                          color:
                            (c as any).nivel_confiabilidad_agregado === "alto"
                              ? "#065f46"
                              : (c as any).nivel_confiabilidad_agregado ===
                                  "moderado"
                                ? "#856404"
                                : "#991b1b",
                        }}
                      >
                        {(c as any).nivel_confiabilidad_agregado}
                      </span>
                    ) : (
                      <span
                        style={{
                          color: "var(--color-text-muted)",
                          fontSize: "0.8rem",
                        }}
                      >
                        —
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        padding: "2px 9px",
                        borderRadius: 99,
                        fontWeight: 600,
                        background: c.estado_id === 2 ? "#d1fae5" : "#fff3cd",
                        color: c.estado_id === 2 ? "#065f46" : "#856404",
                      }}
                    >
                      {c.estado_id === 2 ? "Completado" : "En progreso"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

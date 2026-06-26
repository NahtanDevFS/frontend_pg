"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Conteo, Cultivo, Usuario } from "@/types";
import BtnBack from "@/components/BtnBack";
import styles from "./detalle_cultivo.module.css";

interface OperadorAsignado {
  id: number;
  usuario_id: number;
  nombre: string;
  activo: boolean;
  created_at: string;
}

//Gráfica de tendencia histórica
function GraficaTendencia({ conteos }: { conteos: Conteo[] }) {
  const completados = conteos
    .filter((c) => c.estado_id === 2 && c.conteo_total_acumulado > 0)
    .sort(
      (a, b) =>
        new Date(a.fecha_conteo).getTime() - new Date(b.fecha_conteo).getTime(),
    );

  if (completados.length < 2)
    return (
      <p className={styles.graficaSinDatos}>
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
    <div className={styles.graficaContainer}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className={styles.graficaSvg}>
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

//Página principal
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
  // Filtros globales (afectan gráfica e historial)
  const [filtroOperador, setFiltroOperador] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  // Paginación del historial
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;
  // Data completa (sin paginar) para la gráfica de tendencia
  const [conteosTendencia, setConteosTendencia] = useState<Conteo[]>([]);

  // Construye los query params de filtros comunes a tabla y gráfica
  const buildFiltros = useCallback(() => {
    const params = new URLSearchParams();
    params.append("cultivo_id", String(cultivoId));
    if (filtroOperador) params.append("usuario_id", filtroOperador);
    if (fechaDesde) params.append("fecha_desde", fechaDesde);
    if (fechaHasta) params.append("fecha_hasta", fechaHasta);
    return params;
  }, [cultivoId, filtroOperador, fechaDesde, fechaHasta]);

  const cargar = useCallback(async () => {
    try {
      const paramsTabla = buildFiltros();
      paramsTabla.append("skip", String((pagina - 1) * PAGE_SIZE));
      paramsTabla.append("limit", String(PAGE_SIZE));

      const [resConteos, resCultivos, resOps, resTodos] = await Promise.all([
        api.get<{ items: Conteo[]; total: number }>(
          `/conteos/admin/historial?${paramsTabla}`,
        ),
        api.get(`/cultivos/admin/todos`),
        api.get(`/cultivos/${cultivoId}/operadores`),
        api.get<Usuario[]>(`/usuarios/`),
      ]);
      setConteos(resConteos.data.items);
      setTotal(resConteos.data.total);
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
  }, [cultivoId, buildFiltros, pagina]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Al cambiar filtros, volver a página 1
  useEffect(() => {
    setPagina(1);
  }, [filtroOperador, fechaDesde, fechaHasta]);

  // Cargar TODOS los conteos del rango (sin paginar) para la gráfica
  useEffect(() => {
    const params = buildFiltros();
    params.append("skip", "0");
    params.append("limit", "10000");
    api
      .get<{ items: Conteo[]; total: number }>(
        `/conteos/admin/historial?${params}`,
      )
      .then((r) => setConteosTendencia(r.data.items))
      .catch(() => {});
  }, [buildFiltros]);

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
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <span>Cargando...</span>
      </div>
    );

  const completados = conteosTendencia.filter((c) => c.estado_id === 2).length;

  return (
    <div className={styles.container}>
      {/* Header / Hero */}
      <div className={styles.header}>
        <BtnBack href="/dashboard" label="Volver a cultivos" />

        <div className={styles.heroBox}>
          <h1 className={styles.heroTitle}>
            {cultivo?.nombre ?? `Cultivo #${cultivoId}`}
          </h1>
          <div className={styles.heroMetaWrap}>
            {cultivo?.municipio_nombre && (
              <span className={styles.heroMeta}>
                {cultivo.municipio_nombre}, {cultivo.departamento_nombre}
              </span>
            )}
            {cultivo?.ubicacion && (
              <span className={styles.heroMeta}>{cultivo.ubicacion}</span>
            )}
            {cultivo?.hectareas && (
              <span className={styles.heroMeta}>{cultivo.hectareas} ha</span>
            )}
            {cultivo?.total_surcos && (
              <span className={styles.heroMeta}>
                {cultivo.total_surcos} surcos
              </span>
            )}
            <span className={styles.heroMeta}>
              {completados} conteo{completados !== 1 ? "s" : ""} completado
              {completados !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}

      {/* Panel de operadores asignados */}
      <div className={styles.panelCard}>
        <h3 className={styles.panelTitle}>Operadores asignados</h3>
        <p className={styles.panelSubtitle}>
          Solo los operadores asignados pueden subir videos y gestionar conteos
          de este cultivo.
        </p>

        {/* Lista de asignados */}
        {operadores.length === 0 ? (
          <p className={styles.emptyText}>Ningún operador asignado todavía.</p>
        ) : (
          <div className={styles.tagsContainer}>
            {operadores.map((op) => (
              <div key={op.id} className={styles.opTag}>
                <span className={styles.opName}>{op.nombre}</span>
                <button
                  onClick={() => handleQuitar(op.usuario_id, op.nombre)}
                  className={styles.opRemoveBtn}
                  title={`Quitar a ${op.nombre}`}
                  aria-label={`Quitar operador ${op.nombre}`}
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
          <form onSubmit={handleAsignar} className={styles.asignarForm}>
            <select
              value={nuevoOpId}
              onChange={(e) => setNuevoOpId(e.target.value)}
              className={styles.selectInput}
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
              className={styles.btnAsignar}
            >
              {asignando ? "Asignando..." : "+ Asignar"}
            </button>
          </form>
        )}
        {disponibles.length === 0 && todosOperadores.length > 0 && (
          <p className={styles.emptyText}>
            Todos los operadores disponibles ya están asignados.
          </p>
        )}
      </div>

      {/* Filtros globales */}
      <div className={styles.filtrosRow}>
        <div className={styles.filtroCol}>
          <label className={styles.filtroLabel}>Operador</label>
          <select
            value={filtroOperador}
            onChange={(e) => setFiltroOperador(e.target.value)}
            className={styles.filtroControl}
          >
            <option value="">Todos</option>
            {todosOperadores
              .filter((u) => u.rol_id !== 1)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
          </select>
        </div>
        <div className={styles.filtroCol}>
          <label className={styles.filtroLabel}>Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className={styles.filtroControl}
          />
        </div>
        <div className={styles.filtroCol}>
          <label className={styles.filtroLabel}>Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className={styles.filtroControl}
          />
        </div>
        {(filtroOperador || fechaDesde || fechaHasta) && (
          <button
            onClick={() => {
              setFiltroOperador("");
              setFechaDesde("");
              setFechaHasta("");
            }}
            className={styles.btnLimpiar}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Gráfica de tendencia */}
      <div className={styles.panelCard}>
        <h3 className={styles.panelTitle}>Tendencia histórica</h3>
        <p className={styles.panelSubtitle}>
          Total de melones por ciclo completado y variación porcentual entre
          ciclos.
        </p>
        <GraficaTendencia conteos={conteosTendencia} />
      </div>

      {/* Lista de conteos */}
      <div className={styles.tablaContainer}>
        <div className={styles.tablaHeader}>
          <h3 className={styles.panelTitle} style={{ marginBottom: 0 }}>
            Historial de conteos ({total})
          </h3>
        </div>

        {conteos.length === 0 ? (
          <p className={styles.tablaVaciaMsg}>
            No hay conteos registrados para este cultivo.
          </p>
        ) : (
          <div className={styles.tablaScrollWrapper}>
            <table className={styles.tabla}>
              <thead>
                <tr className={styles.tablaTheadRow}>
                  {[
                    "#",
                    "Operador",
                    "Fecha",
                    "Total melones",
                    "Confiabilidad",
                    "Estado",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className={
                        h === "Total melones"
                          ? styles.thAlignRight
                          : styles.thAlignLeft
                      }
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
                    className={`${styles.tablaTr} ${i % 2 !== 0 ? styles.tablaTrAlt : ""}`}
                    onClick={() =>
                      router.push(`/cultivos/${cultivoId}/conteos/${c.id}`)
                    }
                  >
                    <td className={styles.tdId}>#{c.id}</td>
                    <td className={styles.tdNombre}>
                      {c.operador_nombre ?? "—"}
                    </td>
                    <td className={styles.tdBase}>
                      {new Date(
                        c.fecha_conteo + "T00:00:00",
                      ).toLocaleDateString("es-GT", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td
                      className={`${styles.tdTotal} ${
                        c.conteo_total_acumulado > 0 ? styles.totalValido : ""
                      }`}
                    >
                      {c.conteo_total_acumulado > 0
                        ? c.conteo_total_acumulado.toLocaleString()
                        : "—"}
                    </td>
                    <td className={styles.tdBase}>
                      {(c as any).nivel_confiabilidad ? (
                        <span
                          className={`${styles.badgeConfianza} ${
                            (c as any).nivel_confiabilidad === "alto"
                              ? styles.badgeAlto
                              : (c as any).nivel_confiabilidad === "moderado"
                                ? styles.badgeModerado
                                : styles.badgeBajo
                          }`}
                        >
                          {(c as any).nivel_confiabilidad}
                        </span>
                      ) : (
                        <span className={styles.badgeVacio}>—</span>
                      )}
                    </td>
                    <td className={styles.tdBase}>
                      <span
                        className={`${styles.badgeEstado} ${
                          c.estado_id === 2
                            ? styles.badgeCompletado
                            : styles.badgeEnProgreso
                        }`}
                      >
                        {c.estado_id === 2 ? "Completado" : "En progreso"}
                      </span>
                    </td>
                    <td className={styles.tdChevron}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className={styles.paginacion}>
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className={styles.btnPag}
            >
              ← Anterior
            </button>
            <span className={styles.pagInfo}>
              Página {pagina} de {Math.ceil(total / PAGE_SIZE)}
            </span>
            <button
              onClick={() =>
                setPagina((p) => Math.min(Math.ceil(total / PAGE_SIZE), p + 1))
              }
              disabled={pagina >= Math.ceil(total / PAGE_SIZE)}
              className={styles.btnPag}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

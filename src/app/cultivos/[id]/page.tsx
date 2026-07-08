"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Conteo, Cultivo, Usuario } from "@/types";
import BtnBack from "@/components/BtnBack";
import {
  useNotification,
  mensajeDeError,
} from "@/components/NotificationProvider";
import styles from "./detalle_cultivo.module.css";

interface OperadorAsignado {
  id: number;
  usuario_id: number;
  nombre: string;
  activo: boolean;
  created_at: string;
}

// grafica de tendencia historica
function GraficaTendencia({ conteos }: { conteos: Conteo[] }) {
  const completados = conteos
    .filter(
      (c) => c.estado_nombre === "completado" && c.conteo_total_acumulado > 0,
    )
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

// pagina principal
export default function DetalleCultivoPage() {
  const router = useRouter();
  const { id: cultivoId } = useParams();
  const { notify, confirmar } = useNotification();
  const [cultivo, setCultivo] = useState<Cultivo | null>(null);
  const [operadores, setOperadores] = useState<OperadorAsignado[]>([]);
  const [todosOperadores, setTodosOperadores] = useState<Usuario[]>([]);
  const [nuevoOpId, setNuevoOpId] = useState("");
  const [asignando, setAsignando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // filtros globales, afectan tanto la grafica como el historial
  const [filtroOperador, setFiltroOperador] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  // paginacion del historial
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;
  // data completa sin paginar, la usamos pa la grafica de tendencia
  const [conteosTendencia, setConteosTendencia] = useState<Conteo[]>([]);
  // toggle pa mostrar los conteos desactivados
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  // id del conteo sobre el que se esta actuando (desactivar/reactivar)
  const [accionConteoId, setAccionConteoId] = useState<number | null>(null);
  // vista: tabla | anual
  const [modoVista, setModoVista] = useState<"tabla" | "anual">("tabla");
  // el año que esta abierto en la vista anual
  const [anioExpandido, setAnioExpandido] = useState<number | null>(null);

  // arma los query params de filtros que comparten la tabla y la grafica
  const buildFiltros = useCallback(() => {
    const params = new URLSearchParams();
    params.append("cultivo_id", String(cultivoId));
    if (filtroOperador) params.append("usuario_id", filtroOperador);
    if (fechaDesde) params.append("fecha_desde", fechaDesde);
    if (fechaHasta) params.append("fecha_hasta", fechaHasta);
    return params;
  }, [cultivoId, filtroOperador, fechaDesde, fechaHasta]);

  const cargar = useCallback(
    async (inclInactivos?: boolean) => {
      const incluir = inclInactivos ?? mostrarInactivos;
      try {
        // traemos hasta 500 conteos de un jalon (sirven pa la grafica y pa la tabla que paginamos en el cliente), tope 500
        const paramsTodos = buildFiltros();
        paramsTodos.append("skip", "0");
        paramsTodos.append("limit", "500");
        if (incluir) paramsTodos.append("incluir_inactivos", "true");

        const [resTodos, resCultivos, resOps, resTodosUsers] =
          await Promise.all([
            api.get<{ items: Conteo[]; total: number }>(
              `/conteos/admin/historial?${paramsTodos}`,
            ),
            api.get(`/cultivos/admin/todos`),
            api.get(`/cultivos/${cultivoId}/operadores`),
            api.get<Usuario[]>(`/usuarios/`),
          ]);
        setTotal(resTodos.data.total);
        setConteosTendencia(resTodos.data.items);
        setCultivo(
          resCultivos.data.find((c: Cultivo) => c.id === Number(cultivoId)) ??
            null,
        );
        setOperadores(resOps.data);
        setTodosOperadores(resTodosUsers.data);
      } catch {
        setError("Error al cargar los datos del cultivo.");
      } finally {
        setLoading(false);
      }
    },
    [cultivoId, buildFiltros, mostrarInactivos],
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  // el pedazo visible de la tabla, lo sacamos en memoria sin volver a pedirle nada al server
  const conteos = useMemo(() => {
    const inicio = (pagina - 1) * PAGE_SIZE;
    return conteosTendencia.slice(inicio, inicio + PAGE_SIZE);
  }, [conteosTendencia, pagina]);

  // cuando cambian los filtros, volvemos a la pagina 1
  useEffect(() => {
    setPagina(1);
  }, [filtroOperador, fechaDesde, fechaHasta]);

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
      notify.success("Operador asignado correctamente.");
    } catch (err: any) {
      notify.error(mensajeDeError(err, "Error al asignar operador."));
    } finally {
      setAsignando(false);
    }
  };

  const handleQuitar = async (usuario_id: number, nombre: string) => {
    if (
      !(await confirmar(`¿Quitar el acceso de "${nombre}" a este cultivo?`, {
        peligroso: true,
        textoConfirmar: "Quitar acceso",
      }))
    )
      return;
    try {
      await api.delete(`/cultivos/${cultivoId}/operadores/${usuario_id}`);
      await cargar();
      notify.success("Acceso removido correctamente.");
    } catch (err: any) {
      notify.error(mensajeDeError(err, "Error al quitar operador."));
    }
  };

  const handleToggleInactivos = (checked: boolean) => {
    setMostrarInactivos(checked);
    setPagina(1);
    cargar(checked);
  };

  const handleDesactivarConteo = async (conteoId: number, fecha: string) => {
    if (
      !(await confirmar(
        `¿Desactivar el conteo del ${new Date(fecha + "T00:00:00").toLocaleDateString("es-GT")}? Sus procesamientos quedarán excluidos.`,
        { peligroso: true, textoConfirmar: "Desactivar" },
      ))
    )
      return;
    setAccionConteoId(conteoId);
    try {
      await api.patch(`/conteos/admin/${conteoId}/desactivar`);
      await cargar();
      notify.success("Conteo desactivado correctamente.");
    } catch (err: any) {
      notify.error(mensajeDeError(err, "Error al desactivar el conteo."));
    } finally {
      setAccionConteoId(null);
    }
  };

  const handleReactivarConteo = async (conteoId: number, fecha: string) => {
    if (
      !(await confirmar(
        `¿Reactivar el conteo del ${new Date(fecha + "T00:00:00").toLocaleDateString("es-GT")}?`,
      ))
    )
      return;
    setAccionConteoId(conteoId);
    try {
      await api.patch(`/conteos/admin/${conteoId}/reactivar`);
      await cargar();
      notify.success("Conteo reactivado correctamente.");
    } catch (err: any) {
      notify.error(mensajeDeError(err, "Error al reactivar el conteo."));
    } finally {
      setAccionConteoId(null);
    }
  };

  // agrupamos los conteos por año pa la vista anual
  const conteosAgrupados = (() => {
    const ordenConfianza: Record<string, number> = {
      alto: 0,
      moderado: 1,
      bajo: 2,
    };
    const mapa = new Map<
      number,
      {
        anio: number;
        conteos: Conteo[];
        total: number;
        operadoresUnicos: string[];
        variedadesUnicas: string[];
        todosCompletos: boolean;
        peorConfianza: string | null;
      }
    >();

    for (const c of conteosTendencia) {
      const anio = new Date(c.fecha_conteo + "T00:00:00").getFullYear();
      if (!mapa.has(anio)) {
        mapa.set(anio, {
          anio,
          conteos: [],
          total: 0,
          operadoresUnicos: [],
          variedadesUnicas: [],
          todosCompletos: true,
          peorConfianza: null,
        });
      }
      const g = mapa.get(anio)!;
      g.conteos.push(c);
      g.total += c.conteo_total_acumulado;
      if (c.operador_nombre && !g.operadoresUnicos.includes(c.operador_nombre))
        g.operadoresUnicos.push(c.operador_nombre);
      if (c.variedad_nombre && !g.variedadesUnicas.includes(c.variedad_nombre))
        g.variedadesUnicas.push(c.variedad_nombre);
      if (c.estado_nombre !== "completado") g.todosCompletos = false;
      if (c.nivel_confiabilidad) {
        const peorActual = g.peorConfianza
          ? (ordenConfianza[g.peorConfianza] ?? 0)
          : -1;
        if ((ordenConfianza[c.nivel_confiabilidad] ?? 0) > peorActual)
          g.peorConfianza = c.nivel_confiabilidad;
      }
    }
    return Array.from(mapa.values()).sort((a, b) => b.anio - a.anio);
  })();

  const handleExportarPDFAnual = async () => {
    if (!cultivo || conteosAgrupados.length === 0) return;
    const { generarReporteAnualPDF } = await import("@/lib/generarReportePDF");
    generarReporteAnualPDF({
      grupos: conteosAgrupados.map((g) => ({
        ...g,
        cultivosUnicos: [cultivo.nombre],
      })),
      filtros: {
        cultivo: cultivo.nombre,
        operador: todosOperadores.find((u) => String(u.id) === filtroOperador)
          ?.nombre,
        fechaDesde: fechaDesde || null,
        fechaHasta: fechaHasta || null,
      },
    });
  };

  // los operadores que todavia no estan asignados a este campo
  const asignadosIds = new Set(operadores.map((o) => o.usuario_id));
  const disponibles = todosOperadores.filter(
    (u) => !asignadosIds.has(u.id) && u.rol_nombre !== "Administrador", // excluir admins
  );

  if (loading)
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <span>Cargando...</span>
      </div>
    );

  const completados = conteosTendencia.filter(
    (c) => c.estado_nombre === "completado",
  ).length;

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
              .filter((u) => u.rol_nombre !== "Administrador")
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {modoVista === "anual" && conteosAgrupados.length > 0 && (
              <button
                onClick={handleExportarPDFAnual}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  border: "1.5px solid var(--color-border)",
                  background: "none",
                  color: "var(--color-text-muted)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                Exportar PDF anual
              </button>
            )}
            <div className={styles.vistaToggle}>
              {(["tabla", "anual"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setModoVista(v)}
                  className={`${styles.vistaBtn} ${modoVista === v ? styles.vistaBtnActivo : ""}`}
                >
                  {v === "tabla" ? "Tabla" : "Por año"}
                </button>
              ))}
            </div>
            <label className={styles.toggleLabel}>
              <div
                className={`${styles.toggle} ${mostrarInactivos ? styles.toggleOn : ""}`}
                onClick={() => handleToggleInactivos(!mostrarInactivos)}
                role="switch"
                aria-checked={mostrarInactivos}
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === "Enter" || e.key === " "
                    ? handleToggleInactivos(!mostrarInactivos)
                    : null
                }
              >
                <div className={styles.toggleThumb} />
              </div>
              <span className={styles.toggleText}>Desactivados</span>
            </label>
          </div>
        </div>

        {/* Vista tabla */}
        {modoVista === "tabla" && (
          <>
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
                    {conteos.map((c, i) => {
                      const inactivo = !c.activo;
                      const enAccion = accionConteoId === c.id;
                      return (
                        <tr
                          key={c.id}
                          className={`${styles.tablaTr} ${i % 2 !== 0 ? styles.tablaTrAlt : ""} ${inactivo ? styles.tablaTrInactivo : ""}`}
                          onClick={() =>
                            !inactivo &&
                            router.push(
                              `/cultivos/${cultivoId}/conteos/${c.id}`,
                            )
                          }
                          style={{ cursor: inactivo ? "default" : "pointer" }}
                        >
                          <td className={styles.tdId}>#{c.id}</td>
                          <td
                            className={`${styles.tdNombre} ${inactivo ? styles.tdInactivo : ""}`}
                          >
                            {c.operador_nombre ?? "—"}
                          </td>
                          <td
                            className={`${styles.tdBase} ${inactivo ? styles.tdInactivo : ""}`}
                          >
                            {new Date(
                              c.fecha_conteo + "T00:00:00",
                            ).toLocaleDateString("es-GT", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td
                            className={`${styles.tdTotal} ${c.conteo_total_acumulado > 0 && !inactivo ? styles.totalValido : ""}`}
                          >
                            {c.conteo_total_acumulado > 0
                              ? c.conteo_total_acumulado.toLocaleString()
                              : "—"}
                          </td>
                          <td className={styles.tdBase}>
                            {!inactivo && (c as any).nivel_confiabilidad ? (
                              <span
                                className={`${styles.badgeConfianza} ${
                                  (c as any).nivel_confiabilidad === "alto"
                                    ? styles.badgeAlto
                                    : (c as any).nivel_confiabilidad ===
                                        "moderado"
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
                            {inactivo ? (
                              <span
                                className={`${styles.badgeEstado} ${styles.badgeDesactivado}`}
                              >
                                Desactivado
                              </span>
                            ) : (
                              <span
                                className={`${styles.badgeEstado} ${c.estado_nombre === "completado" ? styles.badgeCompletado : styles.badgeEnProgreso}`}
                              >
                                {c.estado_nombre === "completado"
                                  ? "Completado"
                                  : "En progreso"}
                              </span>
                            )}
                          </td>
                          <td
                            className={styles.tdAcciones}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {inactivo ? (
                              <button
                                className={styles.btnReactivarConteo}
                                onClick={() =>
                                  handleReactivarConteo(c.id, c.fecha_conteo)
                                }
                                disabled={enAccion}
                              >
                                {enAccion ? "…" : "Reactivar"}
                              </button>
                            ) : (
                              <>
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className={styles.tdChevron}
                                >
                                  <path d="m9 18 6-6-6-6" />
                                </svg>
                                <button
                                  className={styles.btnDesactivarConteo}
                                  onClick={() =>
                                    handleDesactivarConteo(c.id, c.fecha_conteo)
                                  }
                                  disabled={enAccion}
                                  title="Desactivar conteo"
                                >
                                  {enAccion ? (
                                    "…"
                                  ) : (
                                    <svg
                                      width="13"
                                      height="13"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                      <path d="M10 11v6" />
                                      <path d="M14 11v6" />
                                    </svg>
                                  )}
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
                    setPagina((p) =>
                      Math.min(Math.ceil(total / PAGE_SIZE), p + 1),
                    )
                  }
                  disabled={pagina >= Math.ceil(total / PAGE_SIZE)}
                  className={styles.btnPag}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}

        {/* Vista anual */}
        {modoVista === "anual" && (
          <div className={styles.anualWrap}>
            {conteosAgrupados.length === 0 ? (
              <p className={styles.tablaVaciaMsg}>
                No hay conteos para agrupar con los filtros aplicados.
              </p>
            ) : (
              conteosAgrupados.map((g) => {
                const expandido = anioExpandido === g.anio;
                return (
                  <div key={g.anio} className={styles.anualCard}>
                    <div
                      className={styles.anualHeader}
                      onClick={() =>
                        setAnioExpandido(expandido ? null : g.anio)
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) =>
                        (e.key === "Enter" || e.key === " ") &&
                        setAnioExpandido(expandido ? null : g.anio)
                      }
                    >
                      <div className={styles.anualHeaderLeft}>
                        <span className={styles.anualAnio}>{g.anio}</span>
                        <div className={styles.anualMeta}>
                          <span>
                            {g.conteos.length} conteo
                            {g.conteos.length !== 1 ? "s" : ""}
                          </span>
                          {g.variedadesUnicas.length > 0 && (
                            <span>
                              {g.variedadesUnicas.length === 1
                                ? g.variedadesUnicas[0]
                                : `${g.variedadesUnicas.length} variedades`}
                            </span>
                          )}
                          {g.operadoresUnicos.length > 1 && (
                            <span>{g.operadoresUnicos.length} operadores</span>
                          )}
                          {g.operadoresUnicos.length === 1 && (
                            <span>{g.operadoresUnicos[0]}</span>
                          )}
                          {!g.todosCompletos && (
                            <span className={styles.anualBadgeProgreso}>
                              Hay conteos en progreso
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.anualHeaderRight}>
                        <div className={styles.anualTotalWrap}>
                          <span className={styles.anualTotalLabel}>
                            Total del año
                          </span>
                          <span className={styles.anualTotal}>
                            {g.total.toLocaleString()}
                          </span>
                          <span className={styles.anualTotalSub}>melones</span>
                        </div>
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            transform: expandido ? "rotate(180deg)" : "none",
                            transition: "transform 0.2s",
                            color: "var(--color-text-muted)",
                            flexShrink: 0,
                          }}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </div>
                    </div>

                    {expandido && (
                      <div className={styles.anualDetalle}>
                        <table className={styles.anualTabla}>
                          <thead>
                            <tr className={styles.anualTablaHead}>
                              {[
                                "#",
                                "Operador",
                                "Variedad",
                                "Fecha",
                                "Total",
                                "Estado",
                              ].map((h) => (
                                <th key={h} className={styles.anualTablaTh}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {g.conteos
                              .slice()
                              .sort(
                                (a, b) =>
                                  new Date(b.fecha_conteo).getTime() -
                                  new Date(a.fecha_conteo).getTime(),
                              )
                              .map((c, i) => (
                                <tr
                                  key={c.id}
                                  className={`${styles.anualTablaTr} ${i % 2 !== 0 ? styles.anualTablaTrImpar : ""} ${c.activo ? styles.anualTablaTrClick : ""}`}
                                  onClick={() =>
                                    c.activo &&
                                    router.push(
                                      `/cultivos/${cultivoId}/conteos/${c.id}`,
                                    )
                                  }
                                  style={{
                                    cursor: c.activo ? "pointer" : "default",
                                    opacity: c.activo ? 1 : 0.5,
                                  }}
                                >
                                  <td
                                    className={styles.anualTablaTd}
                                    style={{
                                      color: "var(--color-text-muted)",
                                      fontSize: "0.8rem",
                                    }}
                                  >
                                    #{c.id}
                                  </td>
                                  <td
                                    className={styles.anualTablaTd}
                                    style={{ color: "var(--color-text-muted)" }}
                                  >
                                    {c.operador_nombre ?? "—"}
                                  </td>
                                  <td
                                    className={styles.anualTablaTd}
                                    style={{ color: "var(--color-text-muted)" }}
                                  >
                                    {c.variedad_nombre ?? "—"}
                                  </td>
                                  <td className={styles.anualTablaTd}>
                                    {new Date(
                                      c.fecha_conteo + "T00:00:00",
                                    ).toLocaleDateString("es-GT", {
                                      day: "2-digit",
                                      month: "short",
                                    })}
                                  </td>
                                  <td
                                    className={styles.anualTablaTd}
                                    style={{
                                      fontWeight: 700,
                                      fontFamily: "monospace",
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
                                  <td className={styles.anualTablaTd}>
                                    {!c.activo ? (
                                      <span
                                        className={styles.anualBadgeDesactivado}
                                      >
                                        Desactivado
                                      </span>
                                    ) : (
                                      <span
                                        className={`${styles.anualBadgeEstado} ${c.estado_nombre === "completado" ? styles.badgeCompletado : styles.badgeEnProgreso}`}
                                      >
                                        {c.estado_nombre === "completado"
                                          ? "Completado"
                                          : "En progreso"}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

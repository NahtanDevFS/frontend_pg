"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Cultivo, Usuario } from "@/types";
import { useNotification } from "@/components/NotificationProvider";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const router = useRouter();
  const { notify, confirmar } = useNotification();
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [operadores, setOperadores] = useState<Usuario[]>([]);
  const [filtroOperador, setFiltroOperador] = useState("");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDatos = async (usuarioId?: string, inactivos?: boolean) => {
    try {
      const incluir = inactivos ?? mostrarInactivos;
      let url = incluir
        ? "/cultivos/admin/todos?incluir_inactivos=true"
        : "/cultivos/admin/todos";
      if (usuarioId) {
        url += `${incluir ? "&" : "?"}usuario_id=${usuarioId}`;
      }
      const [resCultivos, resOperadores] = await Promise.all([
        api.get<Cultivo[]>(url),
        api.get<Usuario[]>("/usuarios/"),
      ]);
      setCultivos(resCultivos.data);
      setOperadores(
        resOperadores.data.filter((u) => u.rol_nombre !== "Administrador"),
      );
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiltroOperador = (id: string) => {
    setFiltroOperador(id);
    fetchDatos(id || undefined);
  };

  const handleToggleInactivos = (checked: boolean) => {
    setMostrarInactivos(checked);
    fetchDatos(filtroOperador || undefined, checked);
  };

  const handleDesactivar = async (id: number, nombre: string) => {
    if (
      !(await confirmar(`¿Desactivar el cultivo "${nombre}"?`, {
        peligroso: true,
        textoConfirmar: "Desactivar",
      }))
    )
      return;
    try {
      await api.patch(`/cultivos/${id}/desactivar`);
      setCultivos((prev) => prev.filter((c) => c.id !== id));
      notify.success("Cultivo desactivado correctamente.");
    } catch {
      notify.error("Error al desactivar el cultivo.");
    }
  };

  const handleReactivar = async (id: number, nombre: string) => {
    if (!(await confirmar(`¿Reactivar el cultivo "${nombre}"?`))) return;
    try {
      await api.patch(`/cultivos/${id}/reactivar`);
      await fetchDatos(filtroOperador || undefined);
      notify.success("Cultivo reactivado correctamente.");
    } catch {
      notify.error("Error al reactivar el cultivo.");
    }
  };

  const nombreOperador = (usuario_id: number) =>
    operadores.find((u) => u.id === usuario_id)?.nombre ?? `#${usuario_id}`;

  if (loading)
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <span>Cargando cultivos...</span>
      </div>
    );

  const cultivosActivos = cultivos.filter((c) => c.activo);
  const cultivosInactivos = cultivos.filter((c) => !c.activo);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerTitles}>
          <h1 className={styles.pageTitle}>Campos de cultivo</h1>
          <p className={styles.pageSubtitle}>
            {cultivosActivos.length} campo de cultivo
            {cultivosActivos.length !== 1 ? "s" : ""} activo
            {cultivosActivos.length !== 1 ? "s" : ""}
            {mostrarInactivos && cultivosInactivos.length > 0
              ? ` · ${cultivosInactivos.length} desactivado${cultivosInactivos.length !== 1 ? "s" : ""}`
              : ""}
          </p>
        </div>
        <button
          className={styles.btnPrimary}
          onClick={() => router.push("/cultivos/nuevo")}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo campo de cultivo
        </button>
      </div>

      {/* Filtros */}
      <div className={styles.filtroRow}>
        {operadores.length > 0 && (
          <div className={styles.filtroGroup}>
            <label htmlFor="filtroOperador" className={styles.filtroLabel}>
              Filtrar por operador:
            </label>
            <select
              id="filtroOperador"
              className={styles.filtroSelect}
              value={filtroOperador}
              onChange={(e) => handleFiltroOperador(e.target.value)}
            >
              <option value="">Todos los operadores</option>
              {operadores.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

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
          <span className={styles.toggleText}>Mostrar desactivados</span>
        </label>
      </div>

      {/* Lista activos */}
      {cultivosActivos.length === 0 && !mostrarInactivos ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <p>
            No hay cultivos registrados
            {filtroOperador ? " para este operador" : ""}.
          </p>
          <button
            className={styles.btnPrimarySmall}
            onClick={() => router.push("/cultivos/nuevo")}
          >
            Registrar primer cultivo
          </button>
        </div>
      ) : (
        <div className={styles.cultivoList}>
          {cultivosActivos.map((cultivo) => (
            <div key={cultivo.id} className={styles.cultivoCard}>
              <div className={styles.cultivoData}>
                <div className={styles.cultivoBadge}>
                  {cultivo.nombre[0].toUpperCase()}
                </div>
                <div className={styles.cultivoInfo}>
                  <p className={styles.cultivoName}>{cultivo.nombre}</p>
                  <div className={styles.cultivoMeta}>
                    {cultivo.municipio_nombre && (
                      <span
                        className={styles.metaItem}
                        style={{ textTransform: "capitalize" }}
                      >
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {cultivo.municipio_nombre},{" "}
                        {cultivo.departamento_nombre}
                      </span>
                    )}
                    <span className={styles.metaItem}>
                      {cultivo.total_surcos} surcos
                    </span>
                    {cultivo.hectareas && (
                      <span className={styles.metaItem}>
                        {cultivo.hectareas} ha
                      </span>
                    )}
                    <span className={styles.operadorBadge}>
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      {nombreOperador(cultivo.usuario_id)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.cardActions}>
                <button
                  className={styles.btnDetalle}
                  onClick={() => router.push(`/cultivos/${cultivo.id}`)}
                >
                  Ver conteos
                </button>
                <button
                  className={`${styles.btnDetalle} ${styles.btnEditar}`}
                  onClick={() => router.push(`/cultivos/${cultivo.id}/editar`)}
                >
                  Editar
                </button>
                <button
                  className={styles.btnIcono}
                  onClick={() => handleDesactivar(cultivo.id, cultivo.nombre)}
                  title="Desactivar cultivo"
                  aria-label="Desactivar cultivo"
                >
                  <svg
                    width="14"
                    height="14"
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
                </button>
              </div>
            </div>
          ))}

          {/* Sección de inactivos */}
          {mostrarInactivos && cultivosInactivos.length > 0 && (
            <>
              <div className={styles.seccionInactivosDivider}>
                <span>Desactivados ({cultivosInactivos.length})</span>
              </div>
              {cultivosInactivos.map((cultivo) => (
                <div
                  key={cultivo.id}
                  className={`${styles.cultivoCard} ${styles.cultivoCardInactivo}`}
                >
                  <div className={styles.cultivoData}>
                    <div
                      className={`${styles.cultivoBadge} ${styles.cultivoBadgeInactivo}`}
                    >
                      {cultivo.nombre[0].toUpperCase()}
                    </div>
                    <div className={styles.cultivoInfo}>
                      <div className={styles.cultivoNameRow}>
                        <p
                          className={`${styles.cultivoName} ${styles.cultivoNameInactivo}`}
                        >
                          {cultivo.nombre}
                        </p>
                        <span className={styles.badgeInactivo}>
                          Desactivado
                        </span>
                      </div>
                      <div className={styles.cultivoMeta}>
                        {cultivo.municipio_nombre && (
                          <span
                            className={styles.metaItem}
                            style={{ textTransform: "capitalize" }}
                          >
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {cultivo.municipio_nombre},{" "}
                            {cultivo.departamento_nombre}
                          </span>
                        )}
                        <span className={styles.metaItem}>
                          {cultivo.total_surcos} surcos
                        </span>
                        {cultivo.hectareas && (
                          <span className={styles.metaItem}>
                            {cultivo.hectareas} ha
                          </span>
                        )}
                        <span className={styles.operadorBadge}>
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          {nombreOperador(cultivo.usuario_id)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <button
                      className={`${styles.btnDetalle} ${styles.btnReactivar}`}
                      onClick={() =>
                        handleReactivar(cultivo.id, cultivo.nombre)
                      }
                    >
                      Reactivar
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {mostrarInactivos &&
            cultivosInactivos.length === 0 &&
            cultivosActivos.length > 0 && (
              <p className={styles.sinInactivosMsg}>
                No hay cultivos desactivados.
              </p>
            )}
        </div>
      )}
    </div>
  );
}

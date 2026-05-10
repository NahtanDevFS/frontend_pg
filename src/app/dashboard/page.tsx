"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Cultivo, Usuario } from "@/types";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const router = useRouter();
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [operadores, setOperadores] = useState<Usuario[]>([]);
  const [filtroOperador, setFiltroOperador] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const fetchDatos = async (usuarioId?: string) => {
    try {
      const url = usuarioId
        ? `/cultivos/admin/todos?usuario_id=${usuarioId}`
        : "/cultivos/admin/todos";
      const [resCultivos, resOperadores] = await Promise.all([
        api.get<Cultivo[]>(url),
        api.get<Usuario[]>("/usuarios/"),
      ]);
      setCultivos(resCultivos.data);
      // Mostrar solo operadores en el filtro
      setOperadores(resOperadores.data.filter((u) => u.rol_id !== 1)); // asume rol_id 1 = admin; se refina abajo
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
  }, []);

  const handleFiltroOperador = (id: string) => {
    setFiltroOperador(id);
    fetchDatos(id || undefined);
  };

  const handleDesactivar = async (id: number) => {
    if (!confirm("¿Seguro que deseas desactivar este cultivo?")) return;
    try {
      await api.patch(`/cultivos/${id}/desactivar`);
      setCultivos((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert("Error al desactivar el cultivo.");
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

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Áreas de Cultivo</h1>
          <p className={styles.pageSubtitle}>
            {cultivos.length} cultivo{cultivos.length !== 1 ? "s" : ""}{" "}
            registrado{cultivos.length !== 1 ? "s" : ""}
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
          Nuevo cultivo
        </button>
      </div>

      {/* Filtro por operador */}
      {operadores.length > 0 && (
        <div
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <label
            style={{
              fontSize: "0.85rem",
              color: "var(--color-text-muted)",
              fontWeight: 600,
            }}
          >
            Filtrar por operador:
          </label>
          <select
            value={filtroOperador}
            onChange={(e) => handleFiltroOperador(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1.5px solid var(--color-border)",
              fontSize: "0.875rem",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              cursor: "pointer",
            }}
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

      {cultivos.length === 0 ? (
        <div className={styles.emptyState}>
          <p>
            No hay cultivos registrados
            {filtroOperador ? " para este operador" : ""}.
          </p>
          <button
            className={styles.btnPrimary}
            onClick={() => router.push("/cultivos/nuevo")}
          >
            Registrar primer cultivo
          </button>
        </div>
      ) : (
        <div className={styles.cultivoGrid}>
          {cultivos.map((cultivo) => (
            <div key={cultivo.id} className={styles.cultivoCard}>
              <div className={styles.cultivoCardHeader}>
                <h3 className={styles.cultivoNombre}>{cultivo.nombre}</h3>
                <span
                  style={{
                    fontSize: "0.7rem",
                    background: "var(--color-primary-light, #e8f5ee)",
                    color: "var(--color-primary, #2d6a4f)",
                    padding: "2px 8px",
                    borderRadius: 99,
                    fontWeight: 600,
                  }}
                >
                  {nombreOperador(cultivo.usuario_id)}
                </span>
              </div>

              {cultivo.ubicacion && (
                <p className={styles.cultivoUbicacion}>{cultivo.ubicacion}</p>
              )}

              <div className={styles.cultivoMeta}>
                {cultivo.hectareas && <span>{cultivo.hectareas} ha</span>}
                <span>{cultivo.total_surcos} surcos</span>
              </div>

              <div className={styles.cultivoActions}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => router.push(`/cultivos/${cultivo.id}`)}
                >
                  Ver conteos
                </button>
                <button
                  className={styles.btnSecondary}
                  onClick={() => router.push(`/cultivos/${cultivo.id}/editar`)}
                >
                  Editar
                </button>
                <button
                  className={styles.btnDanger}
                  onClick={() => handleDesactivar(cultivo.id)}
                >
                  Desactivar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

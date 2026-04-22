"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Cultivo } from "@/types";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const router = useRouter();
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCultivos = async () => {
    try {
      const response = await api.get<Cultivo[]>("/cultivos/");
      setCultivos(response.data.filter((c) => c.activo));
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
    fetchCultivos();
  }, [router]);

  const handleDesactivar = async (id: number) => {
    if (!confirm("¿Seguro que deseas desactivar este cultivo?")) return;
    try {
      await api.patch(`/cultivos/${id}/desactivar`);
      setCultivos(cultivos.filter((c) => c.id !== id));
    } catch {
      alert("Error al desactivar el cultivo.");
    }
  };

  const handleEditar = async (cultivo: Cultivo) => {
    const nuevoNombre = prompt("Nuevo nombre del cultivo:", cultivo.nombre);
    if (!nuevoNombre || nuevoNombre === cultivo.nombre) return;
    try {
      await api.put(`/cultivos/${cultivo.id}`, {
        ...cultivo,
        nombre: nuevoNombre,
      });
      fetchCultivos();
    } catch {
      alert("Error al actualizar.");
    }
  };

  if (loading)
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <span>Cargando cultivos...</span>
      </div>
    );

  return (
    <div className={styles.container}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Áreas de Cultivo</h1>
          <p className={styles.pageSubtitle}>
            Gestiona y analiza tus parcelas activas
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

      {cultivos.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a10 10 0 1 0 10 10" />
              <path d="M12 8v4l2 2" />
              <path d="M18 2v6" />
              <path d="M15 5h6" />
            </svg>
          </div>
          <p>No tienes cultivos activos.</p>
          <button
            className={styles.btnPrimarySmall}
            onClick={() => router.push("/cultivos/nuevo")}
          >
            Registrar primer cultivo
          </button>
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className={styles.statsBar}>
            <div className={styles.statChip}>
              <span className={styles.statNum}>{cultivos.length}</span>
              <span className={styles.statLabel}>
                cultivo{cultivos.length !== 1 ? "s" : ""} activo
                {cultivos.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Cards (mobile) / Table (desktop) */}
          <div className={styles.cardGrid}>
            {cultivos.map((cultivo, i) => (
              <div
                key={cultivo.id}
                className={styles.cultivoCard}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cultivoBadge}>
                    {cultivo.nombre[0].toUpperCase()}
                  </div>
                  <div className={styles.cultivoInfo}>
                    <h3 className={styles.cultivoName}>{cultivo.nombre}</h3>
                    <div className={styles.cultivoMeta}>
                      {cultivo.ubicacion && (
                        <span className={styles.metaItem}>
                          <svg
                            width="12"
                            height="12"
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
                          {cultivo.ubicacion}
                        </span>
                      )}
                      {cultivo.hectareas && (
                        <span className={styles.metaItem}>
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M9 9h6v6H9z" />
                          </svg>
                          {cultivo.hectareas} ha
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className={styles.btnCardPrimary}
                    onClick={() => router.push(`/cultivos/${cultivo.id}`)}
                  >
                    Ver historial
                  </button>
                  <button
                    className={styles.btnCardSecondary}
                    onClick={() => handleEditar(cultivo)}
                  >
                    Editar
                  </button>
                  <button
                    className={styles.btnCardDanger}
                    onClick={() => handleDesactivar(cultivo.id)}
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
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

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
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCultivos = async () => {
      try {
        const response = await api.get("/cultivos/");
        setCultivos(response.data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
        } else {
          setError("Error al cargar los cultivos.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCultivos();
  }, [router]);

  if (loading) {
    return <div className={styles.loading}>Cargando información...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Mis Cultivos</h1>
        <button
          className={styles.btnPrimary}
          onClick={() => router.push("/cultivos/nuevo")}
        >
          + Nuevo Cultivo
        </button>
      </header>

      {error && (
        <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>
      )}

      <div className={styles.tableContainer}>
        {cultivos.length === 0 ? (
          <div className={styles.emptyState}>
            No tienes cultivos registrados aún. Comienza agregando uno.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Ubicación</th>
                <th>Hectáreas</th>
                <th>Fecha de Creación</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {cultivos.map((cultivo) => (
                <tr key={cultivo.id}>
                  <td>{cultivo.id}</td>
                  <td>
                    <strong>{cultivo.nombre}</strong>
                  </td>
                  <td>{cultivo.ubicacion || "N/A"}</td>
                  <td>
                    {cultivo.hectareas ? `${cultivo.hectareas} ha` : "N/A"}
                  </td>
                  <td>{new Date(cultivo.creado_en).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={() => router.push(`/cultivos/${cultivo.id}`)}
                      style={{ padding: "0.5rem", cursor: "pointer" }}
                    >
                      Ver detalles
                    </button>
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

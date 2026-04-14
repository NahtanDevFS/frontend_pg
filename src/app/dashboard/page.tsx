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
    if (!confirm("¿seguro que deseas desactivar este cultivo?")) return;
    try {
      await api.patch(`/cultivos/${id}/desactivar`);
      setCultivos(cultivos.filter((c) => c.id !== id));
    } catch (error) {
      alert("error al desactivar el cultivo");
    }
  };

  const handleEditar = async (cultivo: Cultivo) => {
    const nuevoNombre = prompt("nuevo nombre del cultivo:", cultivo.nombre);
    if (!nuevoNombre || nuevoNombre === cultivo.nombre) return;

    try {
      await api.put(`/cultivos/${cultivo.id}`, {
        ...cultivo,
        nombre: nuevoNombre,
      });
      fetchCultivos();
    } catch (error) {
      alert("error al actualizar");
    }
  };

  if (loading) return <div className={styles.loading}>cargando...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Áreas de cultivos</h1>
        <button
          className={styles.btnPrimary}
          onClick={() => router.push("/cultivos/nuevo")}
        >
          + nuevo cultivo
        </button>
      </header>

      <div className={styles.tableContainer}>
        {cultivos.length === 0 ? (
          <div className={styles.emptyState}>no tienes cultivos activos.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>nombre</th>
                <th>ubicación</th>
                <th>acciones</th>
              </tr>
            </thead>
            <tbody>
              {cultivos.map((cultivo) => (
                <tr key={cultivo.id}>
                  <td>
                    <strong>{cultivo.nombre}</strong>
                  </td>
                  <td>{cultivo.ubicacion || "n/a"}</td>
                  <td className={styles.actionsGroup}>
                    <button
                      className={styles.btnAction}
                      onClick={() => router.push(`/cultivos/${cultivo.id}`)}
                    >
                      ver detalles
                    </button>
                    <button
                      className={styles.btnAction}
                      onClick={() => handleEditar(cultivo)}
                    >
                      editar
                    </button>
                    <button
                      className={styles.btnDanger}
                      onClick={() => handleDesactivar(cultivo.id)}
                    >
                      desactivar
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

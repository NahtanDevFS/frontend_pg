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
    } catch (error) {
      alert("Error al desactivar el cultivo");
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
    } catch (error) {
      alert("Error al actualizar");
    }
  };

  if (loading) return <div className={styles.loading}>Cargando...</div>;

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

      <div className={styles.tableContainer}>
        {cultivos.length === 0 ? (
          <div className={styles.emptyState}>No tienes cultivos activos.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Ubicación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cultivos.map((cultivo) => (
                <tr key={cultivo.id}>
                  <td>
                    <strong>{cultivo.nombre}</strong>
                  </td>
                  <td>{cultivo.ubicacion || "N/A"}</td>
                  <td style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={() => router.push(`/cultivos/${cultivo.id}`)}
                    >
                      Ver videos
                    </button>
                    <button onClick={() => handleEditar(cultivo)}>
                      Editar
                    </button>
                    <button
                      onClick={() => handleDesactivar(cultivo.id)}
                      style={{ color: "red" }}
                    >
                      Desactivar
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

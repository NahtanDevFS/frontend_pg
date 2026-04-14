"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Procesamiento } from "@/types";
import styles from "./detalle.module.css";

export default function DetalleCultivoPage() {
  const router = useRouter();
  const { id: cultivoId } = useParams();

  const [historial, setHistorial] = useState<Procesamiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const response = await api.get(`/procesamientos/cultivo/${cultivoId}`);
        setHistorial(response.data);
      } catch (err: any) {
        setError("Error al cargar el historial de este cultivo.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistorial();
  }, [cultivoId]);

  if (loading)
    return <div className={styles.loading}>Cargando historial...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Historial del Cultivo</h1>
          <button
            className={styles.btnBack}
            onClick={() => router.push("/dashboard")}
          >
            &larr; Volver a Cultivos
          </button>
        </div>
        <button
          className={styles.btnPrimary}
          onClick={() => router.push(`/cultivos/${cultivoId}/procesar`)}
        >
          + Analizar Nuevo Video
        </button>
      </header>

      {error && <div className={styles.errorText}>{error}</div>}

      <div className={styles.tableContainer}>
        {historial.length === 0 ? (
          <div className={styles.emptyState}>
            Aún no has procesado ningún video para este cultivo.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha de Grabación</th>
                <th>Estado</th>
                <th>Conteo IA</th>
                <th>Conteo Ajustado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((proc) => (
                <tr key={proc.id}>
                  <td>#{proc.id}</td>
                  <td>{new Date(proc.fecha_grabacion).toLocaleDateString()}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[proc.estado]}`}>
                      {proc.estado.toUpperCase()}
                    </span>
                  </td>
                  <td className={styles.textSuccess}>
                    <strong>
                      {proc.resultado ? proc.resultado.conteo_ia : "-"}
                    </strong>
                  </td>
                  <td className={styles.textWarning}>
                    <strong>
                      {proc.resultado &&
                      proc.resultado.conteo_final_ajustado !== null
                        ? proc.resultado.conteo_final_ajustado
                        : "Sin ajustar"}
                    </strong>
                  </td>
                  <td>
                    {proc.estado === "completado" && (
                      <button
                        className={styles.btnAction}
                        onClick={() =>
                          router.push(
                            `/cultivos/${cultivoId}/procesamientos/${proc.id}`,
                          )
                        }
                      >
                        Ver Detalles
                      </button>
                    )}
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

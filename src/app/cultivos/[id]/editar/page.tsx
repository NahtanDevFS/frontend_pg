"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Cultivo } from "@/types";
import BtnBack from "@/components/BtnBack";
import styles from "./editar.module.css";

export default function EditarCultivoPage() {
  const router = useRouter();
  const { id } = useParams();
  const [cultivo, setCultivo] = useState<Cultivo | null>(null);
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [hectareas, setHectareas] = useState("");
  const [totalSurcos, setTotalSurcos] = useState("");
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/cultivos/admin/todos`)
      .then((res) => {
        const c = res.data.find((cu: Cultivo) => cu.id === Number(id));
        if (!c) {
          setError("Cultivo no encontrado.");
          return;
        }
        setCultivo(c);
        setNombre(c.nombre);
        setUbicacion(c.ubicacion ?? "");
        setHectareas(c.hectareas ? String(c.hectareas) : "");
        setTotalSurcos(String(c.total_surcos));
      })
      .catch(() => setError("Error al cargar el cultivo."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      await api.put(`/cultivos/${id}`, {
        nombre: nombre.trim(),
        ubicacion: ubicacion.trim() || null,
        hectareas: hectareas ? parseFloat(hectareas) : null,
        total_surcos: parseInt(totalSurcos),
      });
      router.push(`/cultivos/${id}`);
    } catch (err: any) {
      const d = err.response?.data?.detail;
      setError(
        Array.isArray(d)
          ? "Revisa los datos ingresados."
          : (d ?? "Error al guardar."),
      );
    } finally {
      setGuardando(false);
    }
  };

  if (loading)
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <span>Cargando...</span>
      </div>
    );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <BtnBack href="/dashboard" label="Volver" />
        <h1 className={styles.pageTitle}>Editar cultivo</h1>
        <p className={styles.pageSubtitle}>{cultivo?.nombre}</p>
      </div>

      <div className={styles.card}>
        {error && <div className={styles.errorMsg}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>
              Nombre del cultivo <span className={styles.labelRequired}>*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              maxLength={150}
            />
          </div>

          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>
                Ubicación{" "}
                <span className={styles.labelOpcional}>(opcional)</span>
              </label>
              <input
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                maxLength={255}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                Hectáreas{" "}
                <span className={styles.labelOpcional}>(opcional)</span>
              </label>
              <input
                type="number"
                value={hectareas}
                onChange={(e) => setHectareas(e.target.value)}
                min="0.01"
                step="0.01"
                placeholder="Ej. 3.5"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Total de surcos <span className={styles.labelRequired}>*</span>
            </label>
            <input
              type="number"
              value={totalSurcos}
              onChange={(e) => setTotalSurcos(e.target.value)}
              required
              min="1"
            />
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnCancelar}
              onClick={() => router.push(`/cultivos/${id}`)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.btnGuardar}
              disabled={guardando}
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Cultivo } from "@/types";
import type { Departamento, Municipio } from "@/types";
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

  // Cascada departamento -> municipio
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [departamentoId, setDepartamentoId] = useState("");
  const [municipioId, setMunicipioId] = useState("");
  const [cargandoMunicipios, setCargandoMunicipios] = useState(false);
  // Evita que el efecto de cascada borre el municipio durante la precarga inicial
  const [precargando, setPrecargando] = useState(true);

  // Cargar departamentos + datos del cultivo
  useEffect(() => {
    const cargar = async () => {
      try {
        const [resDeptos, resCultivos] = await Promise.all([
          api.get<Departamento[]>("/catalogos/departamentos"),
          api.get(`/cultivos/admin/todos`),
        ]);
        setDepartamentos(resDeptos.data);

        const c = resCultivos.data.find((cu: Cultivo) => cu.id === Number(id));
        if (!c) {
          setError("Cultivo no encontrado.");
          setPrecargando(false);
          return;
        }
        setCultivo(c);
        setNombre(c.nombre);
        setUbicacion(c.ubicacion ?? "");
        setHectareas(c.hectareas ? String(c.hectareas) : "");
        setTotalSurcos(String(c.total_surcos));
        setDepartamentoId(String(c.departamento_id));

        // Cargar los municipios del departamento actual y seleccionar el municipio
        const resMunis = await api.get<Municipio[]>(
          `/catalogos/departamentos/${c.departamento_id}/municipios`,
        );
        setMunicipios(resMunis.data);
        setMunicipioId(String(c.municipio_id));
      } catch {
        setError("Error al cargar el cultivo.");
      } finally {
        setPrecargando(false);
        setLoading(false);
      }
    };
    cargar();
  }, [id]);

  // Cuando el usuario cambia el departamento (después de la precarga)
  useEffect(() => {
    if (precargando) return; // no borrar el municipio durante la carga inicial
    if (!departamentoId) {
      setMunicipios([]);
      setMunicipioId("");
      return;
    }
    setCargandoMunicipios(true);
    setMunicipioId("");
    api
      .get<Municipio[]>(`/catalogos/departamentos/${departamentoId}/municipios`)
      .then((res) => setMunicipios(res.data))
      .catch(() => setError("No se pudieron cargar los municipios."))
      .finally(() => setCargandoMunicipios(false));
  }, [departamentoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      if (!municipioId) throw new Error("Selecciona un municipio.");
      await api.put(`/cultivos/${id}`, {
        nombre: nombre.trim(),
        municipio_id: parseInt(municipioId),
        ubicacion: ubicacion.trim() || null,
        hectareas: hectareas ? parseFloat(hectareas) : null,
        total_surcos: parseInt(totalSurcos),
      });
      router.push(`/cultivos/${id}`);
    } catch (err: any) {
      if (err?.message && !err?.response) {
        setError(err.message);
      } else {
        const d = err.response?.data?.detail;
        setError(
          Array.isArray(d)
            ? "Revisa los datos ingresados."
            : (d ?? "Error al guardar."),
        );
      }
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
                Departamento <span className={styles.labelRequired}>*</span>
              </label>
              <select
                value={departamentoId}
                onChange={(e) => setDepartamentoId(e.target.value)}
                required
                style={{ textTransform: "capitalize" }}
              >
                <option value="">Selecciona un departamento</option>
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                Municipio <span className={styles.labelRequired}>*</span>
              </label>
              <select
                value={municipioId}
                onChange={(e) => setMunicipioId(e.target.value)}
                required
                disabled={!departamentoId || cargandoMunicipios}
                style={{ textTransform: "capitalize" }}
              >
                <option value="">
                  {!departamentoId
                    ? "Selecciona un departamento primero"
                    : cargandoMunicipios
                      ? "Cargando..."
                      : "Selecciona un municipio"}
                </option>
                {municipios.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>
                Dirección / referencia{" "}
                <span className={styles.labelOpcional}>(opcional)</span>
              </label>
              <input
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                maxLength={255}
                placeholder="Ej. sector norte, km 5"
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

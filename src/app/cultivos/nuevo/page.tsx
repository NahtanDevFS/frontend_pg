"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./nuevo.module.css";
import BtnBack from "@/components/BtnBack";
import type { Departamento, Municipio } from "@/types";

export default function NuevoCultivoPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [hectareas, setHectareas] = useState("");
  const [totalSurcos, setTotalSurcos] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // cascada departamento a municipio
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [departamentoId, setDepartamentoId] = useState("");
  const [municipioId, setMunicipioId] = useState("");
  const [cargandoMunicipios, setCargandoMunicipios] = useState(false);

  // cargamos los departamentos al montar
  useEffect(() => {
    api
      .get<Departamento[]>("/catalogos/departamentos")
      .then((res) => setDepartamentos(res.data))
      .catch(() => setError("No se pudieron cargar los departamentos."));
  }, []);

  // cargamos los municipios cuando cambia el departamento
  useEffect(() => {
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
    setLoading(true);
    try {
      if (!municipioId) throw new Error("Selecciona un municipio.");
      if (!totalSurcos || parseInt(totalSurcos) <= 0)
        throw new Error("El número de surcos debe ser mayor a 0.");

      const payload = {
        nombre: nombre.trim(),
        municipio_id: parseInt(municipioId),
        ubicacion: ubicacion.trim() || null,
        hectareas: hectareas ? parseFloat(hectareas) : null,
        total_surcos: parseInt(totalSurcos),
      };
      const res = await api.post("/cultivos/", payload);
      // al detalle del cultivo recien creado pa poder asignarle operadores
      router.push(`/cultivos/${res.data.id}`);
    } catch (err: any) {
      if (err instanceof Error && err.message) setError(err.message);
      else if (err.response?.data?.detail) {
        const d = err.response.data.detail;
        setError(Array.isArray(d) ? "Revisa los datos ingresados." : d);
      } else setError("Ocurrió un error al guardar el cultivo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <BtnBack href="/dashboard" label="Volver al panel" />
        <h1 className={styles.pageTitle}>Registrar nuevo campo de cultivo</h1>
        <p className={styles.pageSubtitle}>
          Después de crearlo podrás asignar los operadores autorizados.
        </p>
      </div>

      <div className={styles.formCard}>
        {error && (
          <div className={styles.errorMsg}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="nombre">
              Nombre del campo de cultivo{" "}
              <span className={styles.required}>*</span>
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Cultivo sector A"
              required
              maxLength={150}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="departamento">
                Departamento <span className={styles.required}>*</span>
              </label>
              <select
                id="departamento"
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
            <div className={styles.formGroup}>
              <label htmlFor="municipio">
                Municipio <span className={styles.required}>*</span>
              </label>
              <select
                id="municipio"
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

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="ubicacion">
                Dirección / referencia{" "}
                <span className={styles.optional}>(opcional)</span>
              </label>
              <input
                id="ubicacion"
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="Ej. sector norte, km 5"
                maxLength={255}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="hectareas">
                Hectáreas <span className={styles.optional}>(opcional)</span>
              </label>
              <input
                id="hectareas"
                type="number"
                value={hectareas}
                onChange={(e) => setHectareas(e.target.value)}
                placeholder="Ej. 3.5"
                min="0.01"
                step="0.01"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="surcos">
              Total de surcos <span className={styles.required}>*</span>
            </label>
            <input
              id="surcos"
              type="number"
              value={totalSurcos}
              onChange={(e) => setTotalSurcos(e.target.value)}
              placeholder="Ej. 48"
              required
              min="1"
            />
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={() => router.push("/dashboard")}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={loading}
            >
              {loading
                ? "Guardando..."
                : "Crear campo de cultivo y asignar operadores"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { CalibreAdmin, VariedadAdmin, CalibreDeVariedad } from "@/types";
import {
  useNotification,
  mensajeDeError,
} from "@/components/NotificationProvider";
import styles from "./catalogo.module.css";

type Pestana = "calibres" | "variedades";

interface CalibreEdit {
  id: number | null;
  nombre: string;
  descripcion: string;
  orden: string;
}

interface VariedadEdit {
  id: number | null;
  nombre: string;
  descripcion: string;
}

export default function GestionMelonesPage() {
  const { notify, confirmar } = useNotification();
  const [pestana, setPestana] = useState<Pestana>("calibres");

  // ── calibres ──
  const [calibres, setCalibres] = useState<CalibreAdmin[]>([]);
  const [loadingCal, setLoadingCal] = useState(true);
  const [errorCal, setErrorCal] = useState("");
  const [editCal, setEditCal] = useState<CalibreEdit | null>(null);
  const [guardandoCal, setGuardandoCal] = useState(false);

  // ── variedades ──
  const [variedades, setVariedades] = useState<VariedadAdmin[]>([]);
  const [loadingVar, setLoadingVar] = useState(true);
  const [errorVar, setErrorVar] = useState("");
  const [editVar, setEditVar] = useState<VariedadEdit | null>(null);
  const [guardandoVar, setGuardandoVar] = useState(false);

  // ── calibres de una variedad ──
  const [varCalibres, setVarCalibres] = useState<VariedadAdmin | null>(null);
  const [listaCalVar, setListaCalVar] = useState<CalibreDeVariedad[]>([]);
  const [loadingCalVar, setLoadingCalVar] = useState(false);
  const [procesandoCalId, setProcesandoCalId] = useState<number | null>(null);

  const cargarCalibres = useCallback(async () => {
    setLoadingCal(true);
    try {
      const { data } = await api.get<CalibreAdmin[]>(
        "/catalogos/admin/calibres",
      );
      setCalibres(data);
      setErrorCal("");
    } catch {
      setErrorCal("No se pudieron cargar los calibres.");
    } finally {
      setLoadingCal(false);
    }
  }, []);

  const cargarVariedades = useCallback(async () => {
    setLoadingVar(true);
    try {
      const { data } = await api.get<VariedadAdmin[]>(
        "/catalogos/admin/variedades",
      );
      setVariedades(data);
      setErrorVar("");
    } catch {
      setErrorVar("No se pudieron cargar las variedades.");
    } finally {
      setLoadingVar(false);
    }
  }, []);

  useEffect(() => {
    cargarCalibres();
    cargarVariedades();
  }, [cargarCalibres, cargarVariedades]);

  // ── acciones de calibres ──
  const abrirCrearCal = () =>
    setEditCal({ id: null, nombre: "", descripcion: "", orden: "0" });
  const abrirEditarCal = (c: CalibreAdmin) =>
    setEditCal({
      id: c.id,
      nombre: c.nombre,
      descripcion: c.descripcion ?? "",
      orden: String(c.orden),
    });

  const guardarCal = async () => {
    if (!editCal || !editCal.nombre.trim()) return;
    setGuardandoCal(true);
    try {
      const payload = {
        nombre: editCal.nombre.trim(),
        descripcion: editCal.descripcion.trim() || null,
        orden: parseInt(editCal.orden) || 0,
      };
      if (editCal.id === null)
        await api.post("/catalogos/admin/calibres", payload);
      else await api.patch(`/catalogos/admin/calibres/${editCal.id}`, payload);
      setEditCal(null);
      await cargarCalibres();
      notify.success("Calibre guardado correctamente.");
    } catch (err: any) {
      notify.error(mensajeDeError(err, "No se pudo guardar el calibre."));
    } finally {
      setGuardandoCal(false);
    }
  };

  const toggleActivoCal = async (c: CalibreAdmin) => {
    if (c.activo) {
      const msg =
        c.conteos_asociados > 0
          ? `El calibre "${c.nombre}" está asociado a ${c.conteos_asociados} conteo(s). Se conservarán intactos, pero el calibre dejará de ofrecerse para nuevos muestreos. ¿Desactivarlo?`
          : `¿Desactivar el calibre "${c.nombre}"? Dejará de ofrecerse para nuevos muestreos.`;
      if (
        !(await confirmar(msg, {
          peligroso: true,
          textoConfirmar: "Desactivar",
        }))
      )
        return;
    }
    try {
      await api.patch(
        `/catalogos/admin/calibres/${c.id}/${c.activo ? "desactivar" : "activar"}`,
      );
      await cargarCalibres();
      notify.success(
        c.activo
          ? "Calibre desactivado correctamente."
          : "Calibre activado correctamente.",
      );
    } catch (err: any) {
      notify.error(mensajeDeError(err, "No se pudo cambiar el estado."));
    }
  };

  // ── acciones de variedades ──
  const abrirCrearVar = () =>
    setEditVar({ id: null, nombre: "", descripcion: "" });
  const abrirEditarVar = (v: VariedadAdmin) =>
    setEditVar({
      id: v.id,
      nombre: v.nombre,
      descripcion: v.descripcion ?? "",
    });

  const guardarVar = async () => {
    if (!editVar || !editVar.nombre.trim()) return;
    setGuardandoVar(true);
    try {
      const payload = {
        nombre: editVar.nombre.trim(),
        descripcion: editVar.descripcion.trim() || null,
      };
      if (editVar.id === null)
        await api.post("/catalogos/admin/variedades", payload);
      else
        await api.patch(`/catalogos/admin/variedades/${editVar.id}`, payload);
      setEditVar(null);
      await cargarVariedades();
      notify.success("Variedad guardada correctamente.");
    } catch (err: any) {
      notify.error(mensajeDeError(err, "No se pudo guardar la variedad."));
    } finally {
      setGuardandoVar(false);
    }
  };

  const toggleActivoVar = async (v: VariedadAdmin) => {
    if (v.activo) {
      const msg =
        v.conteos_asociados > 0
          ? `La variedad "${v.nombre}" está asociada a ${v.conteos_asociados} conteo(s). Se conservarán intactos, pero la variedad dejará de ofrecerse para nuevos conteos. ¿Desactivarla?`
          : `¿Desactivar la variedad "${v.nombre}"? Dejará de ofrecerse para nuevos conteos.`;
      if (
        !(await confirmar(msg, {
          peligroso: true,
          textoConfirmar: "Desactivar",
        }))
      )
        return;
    }
    try {
      await api.patch(
        `/catalogos/admin/variedades/${v.id}/${v.activo ? "desactivar" : "activar"}`,
      );
      await cargarVariedades();
      notify.success(
        v.activo
          ? "Variedad desactivada correctamente."
          : "Variedad activada correctamente.",
      );
    } catch (err: any) {
      notify.error(mensajeDeError(err, "No se pudo cambiar el estado."));
    }
  };

  // ── gestion de calibres de una variedad ──
  const abrirCalibresVar = async (v: VariedadAdmin) => {
    setVarCalibres(v);
    setLoadingCalVar(true);
    try {
      const { data } = await api.get<CalibreDeVariedad[]>(
        `/catalogos/admin/variedades/${v.id}/calibres`,
      );
      setListaCalVar(data);
    } catch {
      notify.error("No se pudieron cargar los calibres de la variedad.");
      setVarCalibres(null);
    } finally {
      setLoadingCalVar(false);
    }
  };

  const recargarCalVar = async (variedadId: number) => {
    const { data } = await api.get<CalibreDeVariedad[]>(
      `/catalogos/admin/variedades/${variedadId}/calibres`,
    );
    setListaCalVar(data);
  };

  const toggleAsignacion = async (cal: CalibreDeVariedad) => {
    if (!varCalibres) return;
    // avisamos antes de quitar un calibre que tiene historial en esta variedad
    if (cal.asignado) {
      if (cal.conteos_en_variedad > 0) {
        const ok = await confirmar(
          `El calibre "${cal.nombre}" se usó en ${cal.conteos_en_variedad} conteo(s) de esta variedad. Quitarlo solo afecta nuevos muestreos; los conteos históricos se conservan intactos. ¿Quitarlo?`,
          { peligroso: true, textoConfirmar: "Quitar" },
        );
        if (!ok) return;
      }
    }
    setProcesandoCalId(cal.calibre_id);
    try {
      if (cal.asignado) {
        await api.delete(
          `/catalogos/admin/variedades/${varCalibres.id}/calibres/${cal.calibre_id}`,
        );
      } else {
        await api.post(
          `/catalogos/admin/variedades/${varCalibres.id}/calibres`,
          { calibre_id: cal.calibre_id },
        );
      }
      await recargarCalVar(varCalibres.id);
      notify.success(
        cal.asignado
          ? "Calibre quitado correctamente."
          : "Calibre asignado correctamente.",
      );
    } catch (err: any) {
      notify.error(mensajeDeError(err, "No se pudo actualizar la asignación."));
    } finally {
      setProcesandoCalId(null);
    }
  };

  return (
    <div className={styles.container}>
      {/* Hero */}
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Gestión de melones</h1>
        <p className={styles.heroDesc}>
          Administra los calibres y las variedades de melón del sistema.
        </p>
      </div>

      {/* Pestañas */}
      <div className={styles.tabsWrap}>
        {(
          [
            ["calibres", "Calibres"],
            ["variedades", "Variedades"],
          ] as [Pestana, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPestana(key)}
            className={`${styles.tabBtn} ${pestana === key ? styles.tabBtnActive : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {pestana === "calibres" ? (
        <>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Calibres ({calibres.length})
            </h2>
            <button onClick={abrirCrearCal} className={styles.btnPrimary}>
              + Nuevo calibre
            </button>
          </div>

          {errorCal && <div className={styles.errorBox}>{errorCal}</div>}

          {loadingCal ? (
            <p className={styles.loadingText}>Cargando...</p>
          ) : (
            <div className={styles.tableWrap}>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr className={styles.theadRow}>
                      {[
                        "Orden",
                        "Nombre",
                        "Descripción",
                        "Conteos",
                        "Estado",
                        "",
                      ].map((h) => (
                        <th key={h} className={styles.th}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calibres.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.tdVacio}>
                          No hay calibres registrados.
                        </td>
                      </tr>
                    ) : (
                      calibres.map((c, i) => (
                        <tr
                          key={c.id}
                          className={`${styles.tr} ${i % 2 !== 0 ? styles.trAlt : ""} ${!c.activo ? styles.trInactive : ""}`}
                        >
                          <td className={styles.tdMuted}>{c.orden}</td>
                          <td className={styles.tdNombre}>{c.nombre}</td>
                          <td className={styles.tdDesc}>
                            {c.descripcion ?? "—"}
                          </td>
                          <td className={styles.tdMuted}>
                            {c.conteos_asociados}
                          </td>
                          <td className={styles.tdCenter}>
                            <BadgeActivo activo={c.activo} />
                          </td>
                          <td className={styles.tdAcciones}>
                            <div className={styles.accionesWrap}>
                              <button
                                onClick={() => abrirEditarCal(c)}
                                className={styles.btnSec}
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => toggleActivoCal(c)}
                                className={`${styles.btnSec} ${c.activo ? styles.btnToggleActive : styles.btnToggleInactive}`}
                              >
                                {c.activo ? "Desactivar" : "Activar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Variedades ({variedades.length})
            </h2>
            <button onClick={abrirCrearVar} className={styles.btnPrimary}>
              + Nueva variedad
            </button>
          </div>

          {errorVar && <div className={styles.errorBox}>{errorVar}</div>}

          {loadingVar ? (
            <p className={styles.loadingText}>Cargando...</p>
          ) : (
            <div className={styles.tableWrap}>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr className={styles.theadRow}>
                      {["Nombre", "Descripción", "Conteos", "Estado", ""].map(
                        (h) => (
                          <th key={h} className={styles.th}>
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {variedades.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={styles.tdVacio}>
                          No hay variedades registradas.
                        </td>
                      </tr>
                    ) : (
                      variedades.map((v, i) => (
                        <tr
                          key={v.id}
                          className={`${styles.tr} ${i % 2 !== 0 ? styles.trAlt : ""} ${!v.activo ? styles.trInactive : ""}`}
                        >
                          <td className={styles.tdNombre}>{v.nombre}</td>
                          <td className={styles.tdDesc}>
                            {v.descripcion ?? "—"}
                          </td>
                          <td className={styles.tdMuted}>
                            {v.conteos_asociados}
                          </td>
                          <td className={styles.tdCenter}>
                            <BadgeActivo activo={v.activo} />
                          </td>
                          <td className={styles.tdAcciones}>
                            <div className={styles.accionesWrap}>
                              <button
                                onClick={() => abrirCalibresVar(v)}
                                className={styles.btnSec}
                              >
                                Calibres
                              </button>
                              <button
                                onClick={() => abrirEditarVar(v)}
                                className={styles.btnSec}
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => toggleActivoVar(v)}
                                className={`${styles.btnSec} ${v.activo ? styles.btnToggleActive : styles.btnToggleInactive}`}
                              >
                                {v.activo ? "Desactivar" : "Activar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal crear/editar calibre */}
      {editCal && (
        <Modal onClose={() => !guardandoCal && setEditCal(null)}>
          <h3 className={styles.modalTitle}>
            {editCal.id === null ? "Nuevo calibre" : "Editar calibre"}
          </h3>
          <label className={styles.label}>Nombre *</label>
          <input
            value={editCal.nombre}
            onChange={(e) => setEditCal({ ...editCal, nombre: e.target.value })}
            maxLength={20}
            placeholder="Ej: 12J"
            className={styles.input}
          />
          <label className={styles.label}>Descripción</label>
          <input
            value={editCal.descripcion}
            onChange={(e) =>
              setEditCal({ ...editCal, descripcion: e.target.value })
            }
            maxLength={255}
            placeholder="Opcional"
            className={styles.input}
          />
          <label className={styles.label}>Orden</label>
          <input
            type="number"
            value={editCal.orden}
            onChange={(e) => setEditCal({ ...editCal, orden: e.target.value })}
            className={styles.input}
          />
          <p className={styles.ayuda}>
            Define la secuencia en que aparece el calibre (menor primero).
          </p>
          <div className={styles.modalAcciones}>
            <button
              onClick={() => setEditCal(null)}
              disabled={guardandoCal}
              className={styles.btnSec}
            >
              Cancelar
            </button>
            <button
              onClick={guardarCal}
              disabled={guardandoCal || !editCal.nombre.trim()}
              className={styles.btnPrimary}
            >
              {guardandoCal ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal crear/editar variedad */}
      {editVar && (
        <Modal onClose={() => !guardandoVar && setEditVar(null)}>
          <h3 className={styles.modalTitle}>
            {editVar.id === null ? "Nueva variedad" : "Editar variedad"}
          </h3>
          <label className={styles.label}>Nombre *</label>
          <input
            value={editVar.nombre}
            onChange={(e) => setEditVar({ ...editVar, nombre: e.target.value })}
            maxLength={100}
            placeholder="Ej: Caribbean Gold RZ"
            className={styles.input}
          />
          <label className={styles.label}>Descripción</label>
          <textarea
            value={editVar.descripcion}
            onChange={(e) =>
              setEditVar({ ...editVar, descripcion: e.target.value })
            }
            maxLength={2000}
            placeholder="Opcional"
            rows={4}
            className={`${styles.input} ${styles.textarea}`}
          />
          <div className={styles.modalAcciones}>
            <button
              onClick={() => setEditVar(null)}
              disabled={guardandoVar}
              className={styles.btnSec}
            >
              Cancelar
            </button>
            <button
              onClick={guardarVar}
              disabled={guardandoVar || !editVar.nombre.trim()}
              className={styles.btnPrimary}
            >
              {guardandoVar ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal gestión de calibres de variedad (Fase 3) */}
      {varCalibres && (
        <Modal onClose={() => setVarCalibres(null)}>
          <h3 className={styles.modalTitle}>
            Calibres de “{varCalibres.nombre}”
          </h3>
          <p className={`${styles.ayuda} ${styles.mb16}`}>
            Activa los calibres que aplican a esta variedad. Solo los calibres
            activos del catálogo aparecen aquí. Quitar un calibre no afecta los
            conteos históricos.
          </p>

          {loadingCalVar ? (
            <p className={styles.loadingText}>Cargando...</p>
          ) : listaCalVar.length === 0 ? (
            <p className={styles.emptyText}>
              No hay calibres activos en el catálogo. Crea calibres primero en
              la pestaña “Calibres”.
            </p>
          ) : (
            <div className={styles.calVarList}>
              {listaCalVar.map((cal) => (
                <div
                  key={cal.calibre_id}
                  className={`${styles.calVarItem} ${
                    cal.asignado
                      ? styles.calVarItemAsignado
                      : styles.calVarItemNoAsignado
                  }`}
                >
                  <div>
                    <div className={styles.calVarName}>{cal.nombre}</div>
                    {cal.descripcion && (
                      <div className={styles.calVarDesc}>{cal.descripcion}</div>
                    )}
                    {cal.conteos_en_variedad > 0 && (
                      <div className={styles.calVarUsage}>
                        Usado en {cal.conteos_en_variedad} conteo(s) de esta
                        variedad
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => toggleAsignacion(cal)}
                    disabled={procesandoCalId === cal.calibre_id}
                    className={`${styles.btnAsignar} ${
                      cal.asignado
                        ? styles.btnAsignarActivo
                        : styles.btnAsignarInactivo
                    } ${procesandoCalId === cal.calibre_id ? styles.btnDisabled : ""}`}
                  >
                    {cal.asignado ? "Quitar" : "Asignar"}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={`${styles.modalAcciones} ${styles.mt18}`}>
            <button
              onClick={() => {
                setVarCalibres(null);
                cargarVariedades();
              }}
              className={styles.btnPrimary}
            >
              Listo
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── componentes auxiliares ──

function BadgeActivo({ activo }: { activo: boolean }) {
  return (
    <span
      className={`${styles.badgeActivo} ${activo ? styles.badgeGreen : styles.badgeRed}`}
    >
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

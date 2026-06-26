"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { CalibreAdmin, VariedadAdmin, CalibreDeVariedad } from "@/types";

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
  const [pestana, setPestana] = useState<Pestana>("calibres");

  // ── Calibres ──
  const [calibres, setCalibres] = useState<CalibreAdmin[]>([]);
  const [loadingCal, setLoadingCal] = useState(true);
  const [errorCal, setErrorCal] = useState("");
  const [editCal, setEditCal] = useState<CalibreEdit | null>(null);
  const [guardandoCal, setGuardandoCal] = useState(false);

  // ── Variedades ──
  const [variedades, setVariedades] = useState<VariedadAdmin[]>([]);
  const [loadingVar, setLoadingVar] = useState(true);
  const [errorVar, setErrorVar] = useState("");
  const [editVar, setEditVar] = useState<VariedadEdit | null>(null);
  const [guardandoVar, setGuardandoVar] = useState(false);

  // ── Gestión de calibres de una variedad (Fase 3) ──
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

  // ── Acciones calibres ──
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
    } catch (err: any) {
      alert(err.response?.data?.detail ?? "No se pudo guardar el calibre.");
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
      if (!window.confirm(msg)) return;
    }
    try {
      await api.patch(
        `/catalogos/admin/calibres/${c.id}/${c.activo ? "desactivar" : "activar"}`,
      );
      await cargarCalibres();
    } catch (err: any) {
      alert(err.response?.data?.detail ?? "No se pudo cambiar el estado.");
    }
  };

  // ── Acciones variedades ──
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
    } catch (err: any) {
      alert(err.response?.data?.detail ?? "No se pudo guardar la variedad.");
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
      if (!window.confirm(msg)) return;
    }
    try {
      await api.patch(
        `/catalogos/admin/variedades/${v.id}/${v.activo ? "desactivar" : "activar"}`,
      );
      await cargarVariedades();
    } catch (err: any) {
      alert(err.response?.data?.detail ?? "No se pudo cambiar el estado.");
    }
  };

  // ── Gestión de calibres de variedad (Fase 3) ──
  const abrirCalibresVar = async (v: VariedadAdmin) => {
    setVarCalibres(v);
    setLoadingCalVar(true);
    try {
      const { data } = await api.get<CalibreDeVariedad[]>(
        `/catalogos/admin/variedades/${v.id}/calibres`,
      );
      setListaCalVar(data);
    } catch {
      alert("No se pudieron cargar los calibres de la variedad.");
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
    // Aviso al quitar un calibre con historial en la variedad
    if (cal.asignado) {
      if (cal.conteos_en_variedad > 0) {
        const ok = window.confirm(
          `El calibre "${cal.nombre}" se usó en ${cal.conteos_en_variedad} conteo(s) de esta variedad. Quitarlo solo afecta nuevos muestreos; los conteos históricos se conservan intactos. ¿Quitarlo?`,
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
    } catch (err: any) {
      alert(
        err.response?.data?.detail ?? "No se pudo actualizar la asignación.",
      );
    } finally {
      setProcesandoCalId(null);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Hero */}
      <div
        style={{
          background: "#2d6a4f",
          borderRadius: 14,
          padding: "1.5rem 1.75rem",
          color: "#fff",
          marginBottom: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 }}>
          Gestión de melones
        </h1>
        <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.85)" }}>
          Administra los calibres y las variedades de melón del sistema.
        </p>
      </div>

      {/* Pestañas */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: "1.5rem",
          borderBottom: "1.5px solid var(--color-border)",
        }}
      >
        {(
          [
            ["calibres", "Calibres"],
            ["variedades", "Variedades"],
          ] as [Pestana, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPestana(key)}
            style={{
              padding: "10px 18px",
              border: "none",
              background: "none",
              fontFamily: "inherit",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
              color:
                pestana === key
                  ? "var(--color-primary, #2d6a4f)"
                  : "var(--color-text-muted)",
              borderBottom:
                pestana === key
                  ? "2.5px solid var(--color-primary, #2d6a4f)"
                  : "2.5px solid transparent",
              marginBottom: -1.5,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {pestana === "calibres" ? (
        <>
          <div style={cabeceraSeccion}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>
              Calibres ({calibres.length})
            </h2>
            <button onClick={abrirCrearCal} style={btnPrimary}>
              + Nuevo calibre
            </button>
          </div>

          {errorCal && <div style={errorBox}>{errorCal}</div>}

          {loadingCal ? (
            <p style={{ color: "var(--color-text-muted)" }}>Cargando...</p>
          ) : (
            <div style={tablaWrap}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{ background: "var(--color-surface-alt, #f4f7f5)" }}
                  >
                    {[
                      "Orden",
                      "Nombre",
                      "Descripción",
                      "Conteos",
                      "Estado",
                      "",
                    ].map((h) => (
                      <th key={h} style={thStyle}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calibres.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={tdVacio}>
                        No hay calibres registrados.
                      </td>
                    </tr>
                  ) : (
                    calibres.map((c, i) => (
                      <tr key={c.id} style={trStyle(i, c.activo)}>
                        <td style={tdMuted}>{c.orden}</td>
                        <td style={tdNombre}>{c.nombre}</td>
                        <td style={tdMuted}>{c.descripcion ?? "—"}</td>
                        <td style={tdMuted}>{c.conteos_asociados}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <BadgeActivo activo={c.activo} />
                        </td>
                        <td
                          style={{ padding: "12px 16px", textAlign: "right" }}
                        >
                          <div style={accionesWrap}>
                            <button
                              onClick={() => abrirEditarCal(c)}
                              style={btnSec}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => toggleActivoCal(c)}
                              style={btnToggle(c.activo)}
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
          )}
        </>
      ) : (
        <>
          <div style={cabeceraSeccion}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>
              Variedades ({variedades.length})
            </h2>
            <button onClick={abrirCrearVar} style={btnPrimary}>
              + Nueva variedad
            </button>
          </div>

          {errorVar && <div style={errorBox}>{errorVar}</div>}

          {loadingVar ? (
            <p style={{ color: "var(--color-text-muted)" }}>Cargando...</p>
          ) : (
            <div style={tablaWrap}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{ background: "var(--color-surface-alt, #f4f7f5)" }}
                  >
                    {["Nombre", "Descripción", "Conteos", "Estado", ""].map(
                      (h) => (
                        <th key={h} style={thStyle}>
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {variedades.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={tdVacio}>
                        No hay variedades registradas.
                      </td>
                    </tr>
                  ) : (
                    variedades.map((v, i) => (
                      <tr key={v.id} style={trStyle(i, v.activo)}>
                        <td style={tdNombre}>{v.nombre}</td>
                        <td
                          style={{
                            ...tdMuted,
                            maxWidth: 320,
                            whiteSpace: "normal",
                          }}
                        >
                          {v.descripcion ?? "—"}
                        </td>
                        <td style={tdMuted}>{v.conteos_asociados}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <BadgeActivo activo={v.activo} />
                        </td>
                        <td
                          style={{ padding: "12px 16px", textAlign: "right" }}
                        >
                          <div style={accionesWrap}>
                            <button
                              onClick={() => abrirCalibresVar(v)}
                              style={btnSec}
                            >
                              Calibres
                            </button>
                            <button
                              onClick={() => abrirEditarVar(v)}
                              style={btnSec}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => toggleActivoVar(v)}
                              style={btnToggle(v.activo)}
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
          )}
        </>
      )}

      {/* Modal crear/editar calibre */}
      {editCal && (
        <Modal onClose={() => !guardandoCal && setEditCal(null)}>
          <h3 style={modalTitulo}>
            {editCal.id === null ? "Nuevo calibre" : "Editar calibre"}
          </h3>
          <label style={labelStyle}>Nombre *</label>
          <input
            value={editCal.nombre}
            onChange={(e) => setEditCal({ ...editCal, nombre: e.target.value })}
            maxLength={20}
            placeholder="Ej: 12J"
            style={inputStyle}
          />
          <label style={labelStyle}>Descripción</label>
          <input
            value={editCal.descripcion}
            onChange={(e) =>
              setEditCal({ ...editCal, descripcion: e.target.value })
            }
            maxLength={255}
            placeholder="Opcional"
            style={inputStyle}
          />
          <label style={labelStyle}>Orden</label>
          <input
            type="number"
            value={editCal.orden}
            onChange={(e) => setEditCal({ ...editCal, orden: e.target.value })}
            style={inputStyle}
          />
          <p style={ayudaStyle}>
            Define la secuencia en que aparece el calibre (menor primero).
          </p>
          <div style={modalAcciones}>
            <button
              onClick={() => setEditCal(null)}
              disabled={guardandoCal}
              style={btnSec}
            >
              Cancelar
            </button>
            <button
              onClick={guardarCal}
              disabled={guardandoCal || !editCal.nombre.trim()}
              style={{
                ...btnPrimary,
                opacity: guardandoCal || !editCal.nombre.trim() ? 0.6 : 1,
              }}
            >
              {guardandoCal ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal crear/editar variedad */}
      {editVar && (
        <Modal onClose={() => !guardandoVar && setEditVar(null)}>
          <h3 style={modalTitulo}>
            {editVar.id === null ? "Nueva variedad" : "Editar variedad"}
          </h3>
          <label style={labelStyle}>Nombre *</label>
          <input
            value={editVar.nombre}
            onChange={(e) => setEditVar({ ...editVar, nombre: e.target.value })}
            maxLength={100}
            placeholder="Ej: Caribbean Gold RZ"
            style={inputStyle}
          />
          <label style={labelStyle}>Descripción</label>
          <textarea
            value={editVar.descripcion}
            onChange={(e) =>
              setEditVar({ ...editVar, descripcion: e.target.value })
            }
            maxLength={2000}
            placeholder="Opcional"
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
          />
          <div style={modalAcciones}>
            <button
              onClick={() => setEditVar(null)}
              disabled={guardandoVar}
              style={btnSec}
            >
              Cancelar
            </button>
            <button
              onClick={guardarVar}
              disabled={guardandoVar || !editVar.nombre.trim()}
              style={{
                ...btnPrimary,
                opacity: guardandoVar || !editVar.nombre.trim() ? 0.6 : 1,
              }}
            >
              {guardandoVar ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal gestión de calibres de variedad (Fase 3) */}
      {varCalibres && (
        <Modal onClose={() => setVarCalibres(null)}>
          <h3 style={modalTitulo}>Calibres de “{varCalibres.nombre}”</h3>
          <p style={{ ...ayudaStyle, margin: "0 0 16px" }}>
            Activa los calibres que aplican a esta variedad. Solo los calibres
            activos del catálogo aparecen aquí. Quitar un calibre no afecta los
            conteos históricos.
          </p>

          {loadingCalVar ? (
            <p style={{ color: "var(--color-text-muted)" }}>Cargando...</p>
          ) : listaCalVar.length === 0 ? (
            <p
              style={{ color: "var(--color-text-muted)", fontSize: "0.88rem" }}
            >
              No hay calibres activos en el catálogo. Crea calibres primero en
              la pestaña “Calibres”.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: 360,
                overflowY: "auto",
              }}
            >
              {listaCalVar.map((cal) => (
                <div
                  key={cal.calibre_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    border: "1px solid var(--color-border)",
                    borderRadius: 10,
                    background: cal.asignado
                      ? "rgba(45,106,79,0.06)"
                      : "var(--color-surface)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                      {cal.nombre}
                    </div>
                    {cal.descripcion && (
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {cal.descripcion}
                      </div>
                    )}
                    {cal.conteos_en_variedad > 0 && (
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--color-text-muted)",
                          marginTop: 2,
                        }}
                      >
                        Usado en {cal.conteos_en_variedad} conteo(s) de esta
                        variedad
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => toggleAsignacion(cal)}
                    disabled={procesandoCalId === cal.calibre_id}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      border: cal.asignado
                        ? "1px solid var(--color-border)"
                        : "none",
                      background: cal.asignado
                        ? "var(--color-surface)"
                        : "#2d6a4f",
                      color: cal.asignado ? "#991b1b" : "#fff",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      fontFamily: "inherit",
                      cursor:
                        procesandoCalId === cal.calibre_id
                          ? "not-allowed"
                          : "pointer",
                      opacity: procesandoCalId === cal.calibre_id ? 0.6 : 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cal.asignado ? "Quitar" : "Asignar"}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ ...modalAcciones, marginTop: 18 }}>
            <button
              onClick={() => {
                setVarCalibres(null);
                cargarVariedades();
              }}
              style={btnPrimary}
            >
              Listo
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Componentes auxiliares ──

function BadgeActivo({ activo }: { activo: boolean }) {
  return (
    <span
      style={{
        fontSize: "0.75rem",
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: 999,
        background: activo ? "#d1fae5" : "#fee2e2",
        color: activo ? "#065f46" : "#991b1b",
      }}
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
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-surface, #fff)",
          borderRadius: 14,
          padding: "1.75rem",
          width: "100%",
          maxWidth: 480,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Estilos compartidos ──

const cabeceraSeccion: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1rem",
};

const btnPrimary: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "none",
  background: "#2d6a4f",
  color: "#fff",
  fontSize: "0.85rem",
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
};

const btnSec: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: 7,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  fontSize: "0.8rem",
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
};

const btnToggle = (activo: boolean): React.CSSProperties => ({
  padding: "5px 12px",
  borderRadius: 7,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: activo ? "#991b1b" : "#065f46",
  fontSize: "0.8rem",
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
});

const tablaWrap: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1.5px solid var(--color-border)",
  borderRadius: 14,
  overflow: "hidden",
};

const thStyle: React.CSSProperties = {
  padding: "10px 16px",
  textAlign: "left",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--color-text-muted)",
};

const trStyle = (i: number, activo: boolean): React.CSSProperties => ({
  borderTop: "1px solid var(--color-border)",
  background: i % 2 === 0 ? "transparent" : "var(--color-surface-alt, #fafcfb)",
  opacity: activo ? 1 : 0.55,
});

const tdMuted: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: "0.85rem",
  color: "var(--color-text-muted)",
};

const tdNombre: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: "0.9rem",
  fontWeight: 600,
};

const tdVacio: React.CSSProperties = {
  padding: "2rem",
  textAlign: "center",
  color: "var(--color-text-muted)",
};

const accionesWrap: React.CSSProperties = {
  display: "flex",
  gap: 8,
  justifyContent: "flex-end",
};

const errorBox: React.CSSProperties = {
  padding: "1rem",
  background: "#fee2e2",
  borderRadius: 10,
  color: "#991b1b",
  marginBottom: "1rem",
  fontSize: "0.9rem",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--color-text-muted)",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  fontSize: "0.9rem",
  fontFamily: "inherit",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  marginBottom: 14,
  boxSizing: "border-box",
};

const ayudaStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  color: "var(--color-text-muted)",
  margin: "4px 0 16px",
};

const modalTitulo: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 700,
  marginBottom: 16,
};

const modalAcciones: React.CSSProperties = {
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
};

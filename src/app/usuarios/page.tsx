"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Usuario, Rol } from "@/types";
import {
  useNotification,
  mensajeDeError,
} from "@/components/NotificationProvider";
import styles from "./usuarios.module.css";

interface UsuarioEditando {
  id: number;
  nombre: string;
  rolId: string;
  nuevaPassword: string;
}

export default function GestionUsuariosPage() {
  const router = useRouter();
  const { notify, confirmar } = useNotification();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usuarioActualId, setUsuarioActualId] = useState<number | null>(null);

  // form de crear usuario
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [rolId, setRolId] = useState("");
  const [guardando, setGuardando] = useState(false);

  // estado de edicion de un usuario
  const [editando, setEditando] = useState<UsuarioEditando | null>(null);
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  const cargarDatos = async () => {
    try {
      const [resU, resR, resMe] = await Promise.all([
        api.get("/usuarios/"),
        api.get("/catalogos/roles"),
        api.get("/usuarios/me"),
      ]);
      setUsuarios(resU.data);
      setRoles(resR.data);
      setUsuarioActualId(resMe.data.id ?? null);
      if (resR.data.length > 0)
        setRolId(
          String(
            resR.data.find((r: Rol) => r.nombre === "Operador")?.id ??
              resR.data[0].id,
          ),
        );
    } catch (err: any) {
      if (err.response?.status === 403) {
        router.push("/dashboard");
      } else {
        setError("Error al cargar usuarios.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api.post("/usuarios/", {
        nombre,
        password,
        rol_id: parseInt(rolId),
      });
      setNombre("");
      setPassword("");
      setMostrarForm(false);
      cargarDatos();
      notify.success("Usuario creado correctamente.");
    } catch (err: any) {
      notify.error(mensajeDeError(err, "Error al crear usuario."));
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    setGuardandoEdit(true);
    try {
      const original = usuarios.find((u) => u.id === editando.id);
      const payload: Record<string, string | number> = {};
      if (editando.nombre.trim()) payload.nombre = editando.nombre.trim();
      if (editando.nuevaPassword.trim())
        payload.password = editando.nuevaPassword.trim();
      if (
        editando.rolId &&
        original &&
        Number(editando.rolId) !== original.rol_id
      ) {
        payload.rol_id = Number(editando.rolId);
      }

      await api.patch(`/usuarios/${editando.id}`, payload);
      setEditando(null);
      cargarDatos();
      notify.success("Cambios guardados correctamente.");
    } catch (err: any) {
      notify.error(mensajeDeError(err, "Error al guardar los cambios."));
    } finally {
      setGuardandoEdit(false);
    }
  };

  const handleDesactivar = async (id: number, nombre: string) => {
    if (
      !(await confirmar(
        `¿Desactivar al usuario "${nombre}"? Ya no podrá iniciar sesión.`,
        { peligroso: true, textoConfirmar: "Desactivar" },
      ))
    )
      return;
    try {
      await api.patch(`/usuarios/${id}/desactivar`);
      cargarDatos();
      notify.success("Usuario desactivado correctamente.");
    } catch (err: any) {
      notify.error(mensajeDeError(err, "Error al desactivar."));
    }
  };

  const nombreRol = (rol_id: number) =>
    roles.find((r) => r.id === rol_id)?.nombre ?? `#${rol_id}`;

  if (loading)
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        Cargando usuarios...
      </div>
    );

  return (
    <div className={styles.container}>
      {/* Modal de edición */}
      {editando && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>Editar usuario</h3>
            <form onSubmit={handleGuardarEdicion} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Nombre de usuario</label>
                <input
                  type="text"
                  value={editando.nombre}
                  onChange={(e) =>
                    setEditando({ ...editando, nombre: e.target.value })
                  }
                  maxLength={100}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>
                  Rol{" "}
                  {editando.id === usuarioActualId && (
                    <span className={styles.labelHint}>
                      (no puedes cambiar tu propio rol)
                    </span>
                  )}
                </label>
                <select
                  value={editando.rolId}
                  onChange={(e) =>
                    setEditando({ ...editando, rolId: e.target.value })
                  }
                  disabled={editando.id === usuarioActualId}
                  required
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>
                  Nueva contraseña{" "}
                  <span className={styles.labelHint}>
                    (dejar vacío para no cambiar)
                  </span>
                </label>
                <input
                  type="password"
                  value={editando.nuevaPassword}
                  onChange={(e) =>
                    setEditando({ ...editando, nuevaPassword: e.target.value })
                  }
                  placeholder="Nueva contraseña..."
                  autoComplete="new-password"
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  className={styles.btnCancelarModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEdit || !editando.nombre.trim()}
                  className={styles.btnGuardarModal}
                >
                  {guardandoEdit ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Gestión de usuarios</h1>
          <p className={styles.pageSubtitle}>
            {usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""} activo
            {usuarios.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className={styles.btnNuevo}
        >
          {mostrarForm ? "Cancelar" : "+ Nuevo usuario"}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Formulario de creación */}
      {mostrarForm && (
        <form onSubmit={handleCrear} className={styles.formCard}>
          <h3 className={styles.formTitle}>Crear nuevo usuario</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Nombre de usuario</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="ej. juan.operador"
                maxLength={100}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Contraseña inicial</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Rol</label>
              <select
                value={rolId}
                onChange={(e) => setRolId(e.target.value)}
                required
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={guardando || !nombre || !password}
            className={styles.btnSubmit}
          >
            {guardando ? "Creando..." : "Crear usuario"}
          </button>
        </form>
      )}

      {/* Tabla de usuarios */}
      <div className={styles.tableWrap}>
        {usuarios.length === 0 ? (
          <p className={styles.tablaVacia}>No hay usuarios registrados.</p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  {["Usuario", "Rol", "Creado", "Acciones"].map((h) => (
                    <th key={h} className={styles.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u, i) => (
                  <tr
                    key={u.id}
                    className={`${styles.tr} ${i % 2 !== 0 ? styles.trAlt : ""}`}
                  >
                    <td className={styles.tdNombre}>
                      {u.nombre}
                      {u.id === usuarioActualId && (
                        <span className={styles.badgeYo}>Yo</span>
                      )}
                    </td>
                    <td className={styles.tdRol}>
                      <span
                        className={
                          nombreRol(u.rol_id) === "Administrador"
                            ? styles.badgeAdmin
                            : styles.badgeOperador
                        }
                      >
                        {nombreRol(u.rol_id)}
                      </span>
                    </td>
                    <td className={styles.tdFecha}>
                      {new Date(u.created_at).toLocaleDateString("es-GT")}
                    </td>
                    <td className={styles.tdAcciones}>
                      <div className={styles.accionesWrap}>
                        <button
                          onClick={() =>
                            setEditando({
                              id: u.id,
                              nombre: u.nombre,
                              rolId: String(u.rol_id),
                              nuevaPassword: "",
                            })
                          }
                          className={styles.btnEditar}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDesactivar(u.id, u.nombre)}
                          className={styles.btnDesactivar}
                        >
                          Desactivar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

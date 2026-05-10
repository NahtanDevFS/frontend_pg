"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Usuario, Rol } from "@/types";

interface UsuarioEditando {
  id: number;
  nombre: string;
  nuevaPassword: string;
}

export default function GestionUsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Crear
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [rolId, setRolId] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Editar
  const [editando, setEditando] = useState<UsuarioEditando | null>(null);
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  const cargarDatos = async () => {
    try {
      const [resU, resR] = await Promise.all([
        api.get("/usuarios/"),
        api.get("/catalogos/roles"),
      ]);
      setUsuarios(resU.data);
      setRoles(resR.data);
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
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al crear usuario.");
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    setGuardandoEdit(true);
    try {
      const payload: Record<string, string> = {};
      if (editando.nombre.trim()) payload.nombre = editando.nombre.trim();
      if (editando.nuevaPassword.trim())
        payload.password = editando.nuevaPassword.trim();

      await api.patch(`/usuarios/${editando.id}`, payload);
      setEditando(null);
      cargarDatos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al guardar los cambios.");
    } finally {
      setGuardandoEdit(false);
    }
  };

  const handleDesactivar = async (id: number, nombre: string) => {
    if (
      !confirm(
        `¿Desactivar al usuario "${nombre}"? Ya no podrá iniciar sesión.`,
      )
    )
      return;
    try {
      await api.patch(`/usuarios/${id}/desactivar`);
      cargarDatos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al desactivar.");
    }
  };

  const nombreRol = (rol_id: number) =>
    roles.find((r) => r.id === rol_id)?.nombre ?? `#${rol_id}`;

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "60vh",
          gap: 12,
          flexDirection: "column",
          color: "var(--color-text-muted)",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            border: "3px solid var(--color-border)",
            borderTop: "3px solid var(--color-primary)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        Cargando usuarios...
      </div>
    );

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Modal de edición */}
      {editando && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: "2rem",
              width: "100%",
              maxWidth: 440,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <h3
              style={{
                fontWeight: 700,
                fontSize: "1.1rem",
                marginBottom: "1.25rem",
              }}
            >
              Editar usuario
            </h3>
            <form
              onSubmit={handleGuardarEdicion}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  Nombre de usuario
                </label>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  Nueva contraseña{" "}
                  <span
                    style={{
                      color: "var(--color-text-muted)",
                      fontWeight: 400,
                    }}
                  >
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
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "none",
                    border: "1.5px solid var(--color-border)",
                    borderRadius: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "var(--color-text-muted)",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEdit || !editando.nombre.trim()}
                  style={{
                    flex: 2,
                    padding: "10px",
                    background: "var(--color-primary)",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                    opacity: guardandoEdit ? 0.6 : 1,
                  }}
                >
                  {guardandoEdit ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.75rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 4 }}>
            Gestión de usuarios
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
            {usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""} activo
            {usuarios.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "var(--color-primary)",
            color: "white",
            border: "none",
            padding: "10px 18px",
            borderRadius: 10,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {mostrarForm ? "Cancelar" : "+ Nuevo usuario"}
        </button>
      </div>

      {error && (
        <div
          style={{
            color: "var(--color-danger)",
            marginBottom: "1rem",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Formulario de creación */}
      {mostrarForm && (
        <form
          onSubmit={handleCrear}
          style={{
            background: "var(--color-surface)",
            border: "1.5px solid var(--color-border)",
            borderRadius: 12,
            padding: "1.5rem",
            marginBottom: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <h3 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 4 }}>
            Crear nuevo usuario
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                Nombre de usuario
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="ej. juan.operador"
                maxLength={100}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                Contraseña inicial
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                Rol
              </label>
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
            style={{
              alignSelf: "flex-end",
              padding: "10px 24px",
              background: "var(--color-primary)",
              color: "white",
              border: "none",
              borderRadius: 10,
              fontWeight: 600,
              cursor: "pointer",
              opacity: guardando ? 0.6 : 1,
            }}
          >
            {guardando ? "Creando..." : "Crear usuario"}
          </button>
        </form>
      )}

      {/* Tabla de usuarios */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {usuarios.length === 0 ? (
          <p
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "var(--color-text-muted)",
            }}
          >
            No hay usuarios registrados.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-alt, #f4f7f5)" }}>
                {["Usuario", "Rol", "Creado", "Acciones"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px",
                      textAlign: "left",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u, i) => (
                <tr
                  key={u.id}
                  style={{
                    borderTop: "1px solid var(--color-border)",
                    background:
                      i % 2 === 0
                        ? "transparent"
                        : "var(--color-surface-alt, #fafcfb)",
                  }}
                >
                  <td
                    style={{
                      padding: "12px 16px",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                    }}
                  >
                    {u.nombre}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        padding: "3px 10px",
                        borderRadius: 99,
                        fontWeight: 600,
                        background:
                          nombreRol(u.rol_id) === "Administrador"
                            ? "#e8f5ee"
                            : "#fff3cd",
                        color:
                          nombreRol(u.rol_id) === "Administrador"
                            ? "#2d6a4f"
                            : "#856404",
                      }}
                    >
                      {nombreRol(u.rol_id)}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: "0.85rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {new Date(u.created_at).toLocaleDateString("es-GT")}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() =>
                          setEditando({
                            id: u.id,
                            nombre: u.nombre,
                            nuevaPassword: "",
                          })
                        }
                        style={{
                          padding: "5px 12px",
                          background: "none",
                          border: "1.5px solid var(--color-border)",
                          borderRadius: 8,
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDesactivar(u.id, u.nombre)}
                        style={{
                          padding: "5px 12px",
                          background: "none",
                          border: "1.5px solid #fca5a5",
                          borderRadius: 8,
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          color: "#c0392b",
                        }}
                      >
                        Desactivar
                      </button>
                    </div>
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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Usuario, Rol } from "@/types";

export default function GestionUsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [rolId, setRolId] = useState("");
  const [guardando, setGuardando] = useState(false);

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
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <button
        onClick={() => router.push("/dashboard")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--color-text-muted)",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: "0.85rem",
        }}
      >
        ← Volver al dashboard
      </button>

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
            background: "var(--color-danger-soft)",
            color: "var(--color-danger)",
            border: "1px solid var(--color-danger-border)",
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Formulario nuevo usuario */}
      {mostrarForm && (
        <form
          onSubmit={handleCrear}
          style={{
            background: "var(--color-surface)",
            border: "1.5px solid var(--color-accent-soft)",
            borderRadius: 16,
            padding: "1.5rem",
            marginBottom: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <h3 style={{ fontWeight: 700, margin: 0 }}>Crear nuevo usuario</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "1rem",
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
                placeholder="Ej. juan.operador"
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
              padding: "11px",
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

      {/* Lista de usuarios */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {usuarios.map((u) => (
          <div
            key={u.id}
            style={{
              background: "var(--color-surface)",
              border: "1.5px solid var(--color-border)",
              borderRadius: 12,
              padding: "1rem 1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                background: "linear-gradient(135deg, #52b788, #2d6a4f)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {u.nombre[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, margin: 0 }}>{u.nombre}</p>
              <p
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "0.8rem",
                  margin: 0,
                }}
              >
                {nombreRol(u.rol_id)} · Creado el{" "}
                {new Date(u.created_at).toLocaleDateString("es-GT")}
              </p>
            </div>
            <span
              style={{
                background:
                  nombreRol(u.rol_id) === "Administrador"
                    ? "#dbeafe"
                    : "#dcfce7",
                color:
                  nombreRol(u.rol_id) === "Administrador"
                    ? "#1e40af"
                    : "#166534",
                padding: "3px 10px",
                borderRadius: 99,
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              {nombreRol(u.rol_id)}
            </span>
            <button
              onClick={() => handleDesactivar(u.id, u.nombre)}
              style={{
                background: "none",
                border: "1.5px solid var(--color-border)",
                color: "var(--color-text-light)",
                padding: "7px 10px",
                borderRadius: 8,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = "var(--color-danger)";
                e.currentTarget.style.borderColor =
                  "var(--color-danger-border)";
                e.currentTarget.style.background = "var(--color-danger-soft)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = "var(--color-text-light)";
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.background = "none";
              }}
            >
              Desactivar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

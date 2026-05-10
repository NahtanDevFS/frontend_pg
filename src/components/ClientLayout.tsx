"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

interface UsuarioMe {
  nombre: string;
  rol_id: number;
  activo: boolean;
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UsuarioMe | null>(null);
  const [loading, setLoading] = useState(true);
  // Evita que el effect de auth se dispare más de una vez simultáneamente
  const authChecked = useRef(false);

  useEffect(() => {
    // Si ya corrió la verificación de auth, no repetir
    if (authChecked.current) return;
    authChecked.current = true;

    const checkAuth = async () => {
      const token = localStorage.getItem("token");

      // Sin token: si no estamos en /login, redirigir
      if (!token) {
        if (!window.location.pathname.startsWith("/login")) {
          router.push("/login");
        }
        setLoading(false);
        return;
      }

      // Con token: verificar identidad y rol
      try {
        const [resMe, resRoles] = await Promise.all([
          api.get("/usuarios/me"),
          api.get("/catalogos/roles").catch(() => ({ data: [] })),
        ]);

        const userData: UsuarioMe = resMe.data;
        const rolesData: { id: number; nombre: string }[] = resRoles.data;
        const rolNombre =
          rolesData.find((r) => r.id === userData.rol_id)?.nombre ?? "";

        if (rolNombre !== "Administrador") {
          // Operador intentando usar la web — forzar logout sin bucle
          localStorage.removeItem("token");
          setLoading(false);
          // Usar replace para no añadir al historial
          router.replace("/login?acceso=denegado");
          return;
        }

        setUser(userData);

        // Admin autenticado en /login → ir al dashboard
        if (window.location.pathname.startsWith("/login")) {
          router.replace("/dashboard");
        }
      } catch {
        // Token inválido o expirado
        localStorage.removeItem("token");
        if (!window.location.pathname.startsWith("/login")) {
          router.replace("/login");
        }
      }

      setLoading(false);
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← array vacío: solo corre una vez al montar

  // Re-verificar solo cuando cambia el pathname (navegación del usuario)
  // pero de forma ligera: solo leer el estado actual, sin llamar a la API
  useEffect(() => {
    if (!loading && !user) {
      const token = localStorage.getItem("token");
      if (!token && !pathname.startsWith("/login")) {
        router.replace("/login");
      }
    }
  }, [pathname, loading, user, router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    authChecked.current = false; // permitir re-chequeo si hace login de nuevo
    router.replace("/login");
  };

  const NAV_LINKS = [
    { href: "/dashboard", label: "Cultivos" },
    { href: "/historial", label: "Historial" },
    { href: "/usuarios", label: "Usuarios" },
  ];

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            border: "3px solid #dde8e2",
            borderTop: "3px solid #2d6a4f",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ color: "#5a7a6a", fontSize: "0.9rem" }}>
          cargando...
        </span>
      </div>
    );

  return (
    <>
      {!pathname.startsWith("/login") && user && (
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 2rem",
            height: "60px",
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid #e8eeeb",
            boxShadow: "0 1px 8px rgba(45,106,79,0.06)",
          }}
        >
          {/* Logo + nav */}
          <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
            <span
              style={{
                fontWeight: 800,
                fontSize: "1.05rem",
                color: "#2d6a4f",
                letterSpacing: "-0.02em",
              }}
            >
              MelonCount
            </span>
            <nav style={{ display: "flex", gap: "6px" }}>
              {NAV_LINKS.map(({ href, label }) => {
                const active =
                  pathname === href || pathname.startsWith(href + "/");
                return (
                  <button
                    key={href}
                    onClick={() => router.push(href)}
                    style={{
                      padding: "6px 14px",
                      cursor: "pointer",
                      backgroundColor: active
                        ? "var(--color-primary-light, #e8f5ee)"
                        : "transparent",
                      color: active
                        ? "var(--color-primary, #2d6a4f)"
                        : "#5a7a6a",
                      border: "1.5px solid",
                      borderColor: active
                        ? "var(--color-accent-soft, #b7e4c7)"
                        : "#dde8e2",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User info + logout */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                background: "#f4f7f5",
                borderRadius: "99px",
                border: "1px solid #dde8e2",
              }}
            >
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  background: "linear-gradient(135deg, #52b788, #2d6a4f)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    color: "white",
                    fontWeight: "700",
                    fontSize: "0.7rem",
                  }}
                >
                  {user.nombre[0].toUpperCase()}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    color: "#1a2e25",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    lineHeight: 1.2,
                  }}
                >
                  {user.nombre.toLowerCase()}
                </span>
                <span
                  style={{
                    color: "#8fa898",
                    fontSize: "0.7rem",
                    lineHeight: 1.2,
                  }}
                >
                  Administrador
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                padding: "7px 14px",
                cursor: "pointer",
                backgroundColor: "transparent",
                color: "#5a7a6a",
                border: "1.5px solid #dde8e2",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: "500",
                fontFamily: "inherit",
                transition: "all 0.18s",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = "#c0392b";
                e.currentTarget.style.borderColor = "#f5b7b1";
                e.currentTarget.style.backgroundColor = "#fdf0ee";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = "#5a7a6a";
                e.currentTarget.style.borderColor = "#dde8e2";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              salir
            </button>
          </div>
        </header>
      )}
      <main style={{ minHeight: "calc(100vh - 60px)", paddingBottom: "3rem" }}>
        {children}
      </main>
    </>
  );
}

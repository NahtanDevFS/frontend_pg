"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

interface UsuarioMe {
  nombre: string;
  rol_id: number;
  activo: boolean;
}

// Estado de auth fuera del componente — sobrevive re-mounts del layout
let authCache: { user: UsuarioMe | null; checked: boolean } = {
  user: null,
  checked: false,
};

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UsuarioMe | null>(authCache.user);
  const [loading, setLoading] = useState(!authCache.checked);

  const enLogin = pathname.startsWith("/login");

  useEffect(() => {
    // Si ya verificamos auth antes (re-mount del layout), usar el cache
    if (authCache.checked) {
      setUser(authCache.user);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      authCache.checked = true;
      authCache.user = null;
      setLoading(false);
      if (!enLogin) {
        router.replace("/login");
      }
      return;
    }

    // Verificar token con el backend
    api
      .get("/usuarios/me")
      .then(async (resMe) => {
        const userData: UsuarioMe = resMe.data;

        // Verificar rol
        try {
          const resRoles = await api.get("/catalogos/roles");
          const rolesData: { id: number; nombre: string }[] = resRoles.data;
          const rolNombre =
            rolesData.find((r) => r.id === userData.rol_id)?.nombre ?? "";

          if (rolNombre !== "Administrador") {
            localStorage.removeItem("token");
            authCache.checked = true;
            authCache.user = null;
            setLoading(false);
            router.replace("/login?acceso=denegado");
            return;
          }
        } catch {
          // Fallo al cargar roles — continuar con el usuario igualmente
        }

        authCache.checked = true;
        authCache.user = userData;
        setUser(userData);
        setLoading(false);

        if (enLogin) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
        authCache.checked = true;
        authCache.user = null;
        setLoading(false);
        if (!enLogin) {
          router.replace("/login");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar

  // Guard ligero de navegación — no llama a la API
  useEffect(() => {
    if (loading) return;
    const token = localStorage.getItem("token");
    if (!token && !enLogin) {
      authCache.checked = false;
      authCache.user = null;
      router.replace("/login");
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = () => {
    localStorage.removeItem("token");
    authCache.checked = false;
    authCache.user = null;
    setUser(null);
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
      {!enLogin && user && (
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

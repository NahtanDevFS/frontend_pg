"use client";

import { useEffect, useState } from "react";
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
  const [roles, setRoles] = useState<{ id: number; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token && pathname !== "/login") {
        router.push("/login");
        return;
      }
      if (token) {
        try {
          const [resMe, resRoles] = await Promise.all([
            api.get("/usuarios/me"),
            api.get("/catalogos/roles").catch(() => ({ data: [] })),
          ]);
          setUser(resMe.data);
          setRoles(resRoles.data);
          if (pathname === "/login") router.push("/dashboard");
        } catch {
          localStorage.removeItem("token");
          if (pathname !== "/login") router.push("/login");
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    router.push("/login");
  };

  const nombreRol = user
    ? (roles.find((r) => r.id === user.rol_id)?.nombre ?? "")
    : "";
  const esAdmin = nombreRol === "Administrador";

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
      {pathname !== "/login" && user && (
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 1.5rem",
            height: "60px",
            backgroundColor: "#fff",
            borderBottom: "1.5px solid #dde8e2",
            boxShadow: "0 2px 8px rgba(30,60,40,0.06)",
          }}
        >
          {/* Logo */}
          <div
            onClick={() => router.push("/dashboard")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                background: "linear-gradient(135deg, #2d6a4f 0%, #52b788 100%)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3 Q15 8 12 12 Q9 16 12 21" />
                <path d="M3 12 Q8 9 12 12 Q16 15 21 12" />
              </svg>
            </div>
            <span
              style={{
                fontWeight: "700",
                fontSize: "1rem",
                color: "#1a2e25",
                letterSpacing: "-0.02em",
              }}
            >
              MelonCount
            </span>
          </div>

          {/* Nav links */}
          <nav style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {esAdmin && (
              <button
                onClick={() => router.push("/usuarios")}
                style={{
                  padding: "7px 14px",
                  cursor: "pointer",
                  background:
                    pathname === "/usuarios"
                      ? "var(--color-primary-light)"
                      : "transparent",
                  color:
                    pathname === "/usuarios"
                      ? "var(--color-primary)"
                      : "#5a7a6a",
                  border: "1.5px solid",
                  borderColor:
                    pathname === "/usuarios"
                      ? "var(--color-accent-soft)"
                      : "#dde8e2",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  fontFamily: "inherit",
                }}
              >
                Usuarios
              </button>
            )}
          </nav>

          {/* Right side */}
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
                {nombreRol && (
                  <span
                    style={{
                      color: "#8fa898",
                      fontSize: "0.7rem",
                      lineHeight: 1.2,
                    }}
                  >
                    {nombreRol}
                  </span>
                )}
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

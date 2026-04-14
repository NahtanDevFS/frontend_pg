"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ nombre: string } | null>(null);
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
          const res = await api.get("/usuarios/me");
          setUser(res.data);

          if (pathname === "/login") {
            router.push("/dashboard");
          }
        } catch (err) {
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

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "#666",
        }}
      >
        cargando...
      </div>
    );
  }

  return (
    <>
      {pathname !== "/login" && user && (
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem 2rem",
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #eaeaea",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              fontSize: "1.2rem",
              color: "#333",
              cursor: "pointer",
            }}
            onClick={() => router.push("/dashboard")}
          >
            Contador de melones
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <span style={{ color: "#666" }}>
              hola, <strong>{user.nombre.toLowerCase()}</strong>
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontWeight: "bold",
                transition: "background-color 0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#c82333")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "#dc3545")
              }
            >
              cerrar sesión
            </button>
          </div>
        </header>
      )}
      <main style={{ paddingBottom: "2rem" }}>{children}</main>
    </>
  );
}

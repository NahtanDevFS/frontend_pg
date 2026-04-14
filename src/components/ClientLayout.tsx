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
            backgroundColor: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              fontWeight: "700",
              fontSize: "1.2rem",
              color: "var(--color-primary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
            onClick={() => router.push("/dashboard")}
          >
            Contador de melones
          </div>
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
            <span
              style={{ color: "var(--color-text-muted)", fontSize: "0.95rem" }}
            >
              hola,{" "}
              <strong style={{ color: "var(--color-text)" }}>
                {user.nombre.toLowerCase()}
              </strong>
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: "6px 12px",
                cursor: "pointer",
                backgroundColor: "transparent",
                color: "var(--color-text-muted)",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                fontSize: "0.9rem",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = "var(--color-danger)";
                e.currentTarget.style.borderColor = "var(--color-danger)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = "var(--color-text-muted)";
                e.currentTarget.style.borderColor = "var(--color-border)";
              }}
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

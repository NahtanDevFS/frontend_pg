"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./ClientLayout.module.css";

interface UsuarioMe {
  nombre: string;
  rol_id: number;
  activo: boolean;
}

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
  const pathname = usePathname() ?? "";
  const [user, setUser] = useState<UsuarioMe | null>(authCache.user);
  const [loading, setLoading] = useState(!authCache.checked);

  const enLogin = pathname.startsWith("/login");

  useEffect(() => {
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
      if (!enLogin) router.replace("/login");
      return;
    }

    api
      .get("/usuarios/me")
      .then(async (resMe) => {
        const userData: UsuarioMe = resMe.data;

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
        } catch {}

        authCache.checked = true;
        authCache.user = userData;
        setUser(userData);
        setLoading(false);

        if (enLogin) router.replace("/dashboard");
      })
      .catch(() => {
        localStorage.removeItem("token");
        authCache.checked = true;
        authCache.user = null;
        setLoading(false);
        if (!enLogin) router.replace("/login");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading) return;
    const token = localStorage.getItem("token");

    if (!token && !enLogin) {
      authCache.checked = false;
      authCache.user = null;
      router.replace("/login");
      return;
    }

    // Hay token pero el cache no tiene usuario (tras login sin recargar) re-verificar e hidratar el header
    if (token && !authCache.user && !enLogin) {
      api
        .get("/usuarios/me")
        .then((resMe) => {
          const userData: UsuarioMe = resMe.data;
          authCache.checked = true;
          authCache.user = userData;
          setUser(userData);
        })
        .catch(() => {
          localStorage.removeItem("token");
          authCache.checked = false;
          authCache.user = null;
          router.replace("/login");
        });
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
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span className={styles.loadingText}>cargando...</span>
      </div>
    );

  return (
    <>
      {!enLogin && user && (
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.brandName}>MelonCount</span>
            <nav className={styles.nav}>
              {NAV_LINKS.map(({ href, label }) => {
                const active =
                  pathname === href || pathname.startsWith(href + "/");
                return (
                  <button
                    key={href}
                    onClick={() => router.push(href)}
                    className={`${styles.navBtn} ${active ? styles.navBtnActivo : ""}`}
                  >
                    {label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.userPill}>
              <div className={styles.userAvatar}>
                <span className={styles.userAvatarInitial}>
                  {user.nombre[0].toUpperCase()}
                </span>
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>
                  {user.nombre.toLowerCase()}
                </span>
                <span className={styles.userRole}>Administrador</span>
              </div>
            </div>

            <button className={styles.btnLogout} onClick={handleLogout}>
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
      <main className={styles.main}>{children}</main>
    </>
  );
}

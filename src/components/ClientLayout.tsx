"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./ClientLayout.module.css";

interface UsuarioMe {
  nombre: string;
  rol_id: number;
  rol_nombre?: string;
  activo: boolean;
  debe_cambiar_password?: boolean;
}

let authCache: { user: UsuarioMe | null; checked: boolean } = {
  user: null,
  checked: false,
};

import { NotificationProvider, useNotification } from "./NotificationProvider";

function ClientLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { notify } = useNotification();
  const [user, setUser] = useState<UsuarioMe | null>(authCache.user);
  const [loading, setLoading] = useState(!authCache.checked);

  // Estado para el menú responsivo
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Estado del modal "cambiar mi contraseña"
  const [modalPass, setModalPass] = useState(false);
  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");
  const [passNueva2, setPassNueva2] = useState("");
  const [guardandoPass, setGuardandoPass] = useState(false);
  const [errorPass, setErrorPass] = useState("");

  const cerrarModalPass = () => {
    setModalPass(false);
    setPassActual("");
    setPassNueva("");
    setPassNueva2("");
    setErrorPass("");
  };

  const guardarPass = async () => {
    setErrorPass("");
    if (passNueva.length < 6) {
      setErrorPass("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (passNueva !== passNueva2) {
      setErrorPass("Las contraseñas no coinciden.");
      return;
    }
    setGuardandoPass(true);
    try {
      await api.patch("/usuarios/me/password", {
        password_actual: passActual,
        password_nueva: passNueva,
      });
      // Refrescar el flag local
      if (user) {
        const actualizado = { ...user, debe_cambiar_password: false };
        setUser(actualizado);
        authCache.user = actualizado;
      }
      cerrarModalPass();
      notify.success("Contraseña actualizada correctamente.");
    } catch (err: any) {
      setErrorPass(
        err.response?.data?.detail ?? "No se pudo cambiar la contraseña.",
      );
    } finally {
      setGuardandoPass(false);
    }
  };

  const enLogin = pathname.startsWith("/login");

  // Cerrar el menú móvil al cambiar de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
      .then((resMe) => {
        const userData: UsuarioMe = resMe.data;

        if (userData.rol_nombre !== "Administrador") {
          localStorage.removeItem("token");
          authCache.checked = true;
          authCache.user = null;
          setLoading(false);
          router.replace("/login?acceso=denegado");
          return;
        }

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

          if (userData.rol_nombre !== "Administrador") {
            localStorage.removeItem("token");
            authCache.checked = true;
            authCache.user = null;
            router.replace("/login?acceso=denegado");
            return;
          }

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
    { href: "/dashboard", label: "Campos de cultivo" },
    { href: "/historial", label: "Historial de conteos" },
    { href: "/catalogo", label: "Gestión de melones" },
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
            <button
              className={styles.hamburgerBtn}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Abrir menú"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <span className={styles.brandName}>MelonCount</span>
            <nav
              className={`${styles.nav} ${isMobileMenuOpen ? styles.navOpen : ""}`}
            >
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

            <button
              className={styles.btnLogout}
              onClick={() => setModalPass(true)}
              aria-label="Cambiar contraseña"
              title="Cambiar mi contraseña"
              style={{ position: "relative" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {user.debe_cambiar_password && (
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#f59e0b",
                  }}
                />
              )}
            </button>

            <button
              className={styles.btnLogout}
              onClick={handleLogout}
              aria-label="Cerrar sesión"
            >
              <svg
                width="16"
                height="16"
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
              <span className={styles.btnLogoutText}>salir</span>
            </button>
          </div>
        </header>
      )}

      {!enLogin && user?.debe_cambiar_password && (
        <div
          style={{
            background: "#fff3cd",
            color: "#856404",
            padding: "10px 16px",
            fontSize: "0.85rem",
            textAlign: "center",
            borderBottom: "1px solid #ffe69c",
          }}
        >
          Tu contraseña fue establecida por un administrador. Te recomendamos{" "}
          <button
            onClick={() => setModalPass(true)}
            style={{
              background: "none",
              border: "none",
              color: "#856404",
              fontWeight: 700,
              textDecoration: "underline",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "0.85rem",
              padding: 0,
            }}
          >
            cambiarla ahora
          </button>
          .
        </div>
      )}
      <main className={styles.main}>{children}</main>

      {/* Overlay oscuro para móviles cuando el menú está abierto */}
      {isMobileMenuOpen && (
        <div
          className={styles.mobileOverlay}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Modal: cambiar mi contraseña */}
      {modalPass && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 100,
          }}
          onClick={() => !guardandoPass && cerrarModalPass()}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--color-surface, #fff)",
              borderRadius: 14,
              padding: "1.75rem",
              width: "100%",
              maxWidth: 420,
            }}
          >
            <h3
              style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 16 }}
            >
              Cambiar mi contraseña
            </h3>

            {errorPass && (
              <div
                style={{
                  padding: "0.65rem 0.85rem",
                  background: "#fee2e2",
                  borderRadius: 8,
                  color: "#991b1b",
                  fontSize: "0.83rem",
                  marginBottom: 14,
                }}
              >
                {errorPass}
              </div>
            )}

            {(
              [
                ["Contraseña actual", passActual, setPassActual],
                ["Nueva contraseña", passNueva, setPassNueva],
                ["Confirmar nueva contraseña", passNueva2, setPassNueva2],
              ] as [string, string, (v: string) => void][]
            ).map(([label, val, setter]) => (
              <div key={label}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--color-text-muted)",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </label>
                <input
                  type="password"
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  style={{
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
                  }}
                />
              </div>
            ))}

            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                marginTop: 4,
              }}
            >
              <button
                onClick={cerrarModalPass}
                disabled={guardandoPass}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={guardarPass}
                disabled={
                  guardandoPass || !passActual || !passNueva || !passNueva2
                }
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#2d6a4f",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: guardandoPass ? "not-allowed" : "pointer",
                  opacity:
                    guardandoPass || !passActual || !passNueva || !passNueva2
                      ? 0.6
                      : 1,
                }}
              >
                {guardandoPass ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NotificationProvider>
      <ClientLayoutInner>{children}</ClientLayoutInner>
    </NotificationProvider>
  );
}

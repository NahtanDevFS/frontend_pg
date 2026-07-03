"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [intentosRestantes, setIntentosRestantes] = useState<number | null>(
    null,
  );

  useEffect(() => {
    // Leer el query param directamente del browser, sin useSearchParams
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("acceso") === "denegado") {
        setError(
          "Esta interfaz es exclusiva para administradores. Los operadores deben usar la aplicación móvil",
        );
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIntentosRestantes(null);

    try {
      const params = new URLSearchParams();
      params.append("username", username);
      params.append("password", password);

      const response = await api.post("/login", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      localStorage.setItem("token", response.data.access_token);
      // Redirigir al dashboard, ClientLayout verificará el rol
      router.replace("/dashboard");
    } catch (err: any) {
      const detail = err.response?.data?.detail;

      if (detail?.tipo === "bloqueado") {
        setError(detail.mensaje);
      } else if (detail?.tipo === "credenciales_invalidas") {
        setError(detail.mensaje);
        if (typeof detail.intentos_restantes === "number") {
          setIntentosRestantes(detail.intentos_restantes);
        }
      } else if (err.response?.status === 401) {
        setError("Usuario o contraseña incorrectos.");
      } else if (err.response?.status === 429) {
        setError(
          "Demasiados intentos fallidos. Intenta de nuevo en unos segundos.",
        );
      } else if (err.response) {
        setError("Ocurrió un error al intentar iniciar sesión.");
      } else {
        setError("No se pudo conectar con el servidor. Verifica tu conexión.");
      }
    }
  };

  return (
    <div className={styles.container}>
      <form className={styles.formCard} onSubmit={handleLogin}>
        <div className={styles.cardHeader}>
          {/* Logo agregado */}
          <div className={styles.logoContainer}>
            <Image
              src="/logo_meloncount.png"
              alt="Logo MelonCount"
              width={100}
              height={100}
              className={styles.logo}
              priority
            />
          </div>
          <p className={styles.subtitle}>Amadeo Export, S.A.</p>
          <h2 className={styles.title}>MelonCount</h2>
          <p className={styles.subtitle}>Panel administrativo</p>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <div className={styles.inputGroup}>
          <label htmlFor="username">Nombre de Usuario</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ingrese su usuario"
            required
            autoComplete="username"
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password">Contraseña</label>
          <div className={styles.inputWrapper}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese su contraseña"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className={styles.eyeBtn}
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
            >
              {showPassword ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {intentosRestantes !== null && intentosRestantes > 0 && (
            <p className={styles.intentosMsg}>
              Te queda{intentosRestantes === 1 ? "" : "n"} {intentosRestantes}{" "}
              intento{intentosRestantes === 1 ? "" : "s"} antes del bloqueo
              temporal.
            </p>
          )}
        </div>

        <button type="submit" className={styles.submitBtn}>
          Iniciar sesión
        </button>
      </form>

      <div className={styles.adminMessage}>
        <p>Acceso exclusivo para administradores del sistema</p>
      </div>
    </div>
  );
}

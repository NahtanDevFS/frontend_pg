"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const params = new URLSearchParams();
      params.append("username", username);
      params.append("password", password);

      const response = await api.post("/login", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      localStorage.setItem("token", response.data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Usuario o contraseña incorrectos.");
      } else {
        setError("Ocurrió un error al intentar iniciar sesión.");
      }
    }
  };

  return (
    <div className={styles.container}>
      <form className={styles.formCard} onSubmit={handleLogin}>
        <h2 className={styles.title}>
          MelonCount - Sistema de conteo de melones
        </h2>
        {error && <div className={styles.errorMsg}>{error}</div>}

        <div className={styles.inputGroup}>
          <label htmlFor="username">Nombre de Usuario</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password">Contraseña</label>
          <div style={{ position: "relative" }}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: "2.75rem" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0",
                display: "flex",
                alignItems: "center",
                color: "var(--color-text-muted)",
              }}
            >
              {showPassword ? (
                // Ojo cerrado (ocultar)
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
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
                // Ojo abierto (mostrar)
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
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
        </div>

        <button type="submit" className={styles.submitBtn}>
          Iniciar Sesión
        </button>
      </form>
    </div>
  );
}

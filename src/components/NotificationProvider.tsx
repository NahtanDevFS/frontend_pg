"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import styles from "./NotificationProvider.module.css";

type TipoToast = "success" | "error" | "info";

interface Toast {
  id: number;
  tipo: TipoToast;
  mensaje: string;
}

interface ConfirmState {
  titulo: string;
  mensaje: string;
  textoConfirmar: string;
  textoCancelar: string;
  peligroso: boolean;
  resolver: (valor: boolean) => void;
}

interface NotifyApi {
  success: (mensaje: string) => void;
  error: (mensaje: string) => void;
  info: (mensaje: string) => void;
}

interface ConfirmOptions {
  titulo?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  // Si es true, el botón de confirmar se pinta en rojo (acciones destructivas).
  peligroso?: boolean;
}

interface NotificationContextType {
  notify: NotifyApi;
  // Reemplazo asíncrono de window.confirm(): if (await confirmar("¿Seguro?")) { ... }
  confirmar: (mensaje: string, opciones?: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

let idCounter = 0;

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const quitarToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const mostrarToast = useCallback(
    (tipo: TipoToast, mensaje: string) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, tipo, mensaje }]);
      const duracion = tipo === "error" ? 6000 : 4000;
      const timeout = setTimeout(() => quitarToast(id), duracion);
      timeoutsRef.current.set(id, timeout);
    },
    [quitarToast],
  );

  const notify: NotifyApi = {
    success: (mensaje) => mostrarToast("success", mensaje),
    error: (mensaje) => mostrarToast("error", mensaje),
    info: (mensaje) => mostrarToast("info", mensaje),
  };

  const confirmar = useCallback(
    (mensaje: string, opciones?: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolver) => {
        setConfirmState({
          titulo: opciones?.titulo ?? "Confirmar acción",
          mensaje,
          textoConfirmar: opciones?.textoConfirmar ?? "Confirmar",
          textoCancelar: opciones?.textoCancelar ?? "Cancelar",
          peligroso: opciones?.peligroso ?? false,
          resolver,
        });
      });
    },
    [],
  );

  const cerrarConfirm = (valor: boolean) => {
    confirmState?.resolver(valor);
    setConfirmState(null);
  };

  return (
    <NotificationContext.Provider value={{ notify, confirmar }}>
      {children}

      {/* Contenedor de toasts */}
      <div className={styles.toastContainer} aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${styles.toast} ${styles[`toast_${t.tipo}`]}`}
            role="status"
          >
            <span className={styles.toastMensaje}>{t.mensaje}</span>
            <button
              className={styles.toastCerrar}
              onClick={() => quitarToast(t.id)}
              aria-label="Cerrar notificación"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Modal de confirmación */}
      {confirmState && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          onClick={() => cerrarConfirm(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitulo}>{confirmState.titulo}</h3>
            <p className={styles.modalMensaje}>{confirmState.mensaje}</p>
            <div className={styles.modalAcciones}>
              <button
                className={styles.btnCancelar}
                onClick={() => cerrarConfirm(false)}
              >
                {confirmState.textoCancelar}
              </button>
              <button
                className={
                  confirmState.peligroso
                    ? styles.btnConfirmarPeligroso
                    : styles.btnConfirmar
                }
                onClick={() => cerrarConfirm(true)}
                autoFocus
              >
                {confirmState.textoConfirmar}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotification debe usarse dentro de un NotificationProvider",
    );
  }
  return ctx;
}

// Extrae texto legible del error axios, ya sea detail string u objeto { tipo, mensaje }.
export function mensajeDeError(err: any, fallback: string): string {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (
    detail &&
    typeof detail === "object" &&
    typeof detail.mensaje === "string"
  ) {
    return detail.mensaje;
  }
  return fallback;
}

import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el token expiró o es inválido en medio de cualquier acción, se
    // limpia la sesión y se manda al login en vez de dejar que cada
    // pantalla muestre su propio alert() de error genérico sin explicar
    // que la sesión se perdió.
    // Se excluye la petición de /login: ahí un 401 significa "credenciales
    // incorrectas", no "sesión expirada" — redirigir ahí crearía un loop
    // (login falla -> 401 -> "redirige" a /login, donde ya se está) y el
    // mensaje de error del formulario nunca llegaría a mostrarse.
    const esLogin = error.config?.url?.includes("/login");
    if (
      typeof window !== "undefined" &&
      error.response?.status === 401 &&
      !esLogin
    ) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

// Configuracion central de acceso a datos.
// VITE_USE_MOCKS=true -> los servicios leen de /mockups/<recurso>.json (sin backend).
// Por defecto se usa la API real en VITE_API_URL (ver .env.example).
export const USE_MOCKS: boolean = import.meta.env.VITE_USE_MOCKS === "true";

export const API_URL: string = (
  import.meta.env.VITE_API_URL ?? "https://desarrollo-web1-backend.onrender.com"
).replace(/\/+$/, "");

export const MOCK_URL = "/mockups";

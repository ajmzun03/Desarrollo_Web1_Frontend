// Configuracion central de acceso a datos.
// USE_MOCKS=true -> los servicios leen de /mockups/<recurso>.json (sin backend).
// USE_MOCKS=false -> los servicios llaman a la API real en API_URL.
export const USE_MOCKS = true;

export const API_URL: string =
  import.meta.env.VITE_API_URL ?? "https://desarrollo-web1-backend.onrender.com";

export const MOCK_URL = "/mockups";

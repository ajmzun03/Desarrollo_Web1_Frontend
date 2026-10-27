import { API_URL, USE_MOCKS } from "../config/api";

// El bucket de S3 es privado: abrir directamente una URL como
//   https://umg-bucket.s3.us-east-2.amazonaws.com/productos/combos/Combo.jpg
// responde 403. El backend sirve esas imagenes en GET /archivos/imagen?key=..., que redirige a una
// URL firmada de corta vida. Aqui se convierte la URL que trae la API (imagen_url / imagen).
const HOST_S3 = /^[a-z0-9.-]+\.s3[.-]([a-z0-9-]+\.)?amazonaws\.com$/i;
const CARPETA_CATALOGO = "productos/";

export function urlImagen(url?: string | null): string | null {
  if (!url) return null;
  if (USE_MOCKS) return url;
  try {
    const u = new URL(url);
    if (!HOST_S3.test(u.hostname)) return url; // no es de nuestro bucket: se usa tal cual
    const key = decodeURIComponent(u.pathname.replace(/^\/+/, ""));
    if (!key.startsWith(CARPETA_CATALOGO)) return url; // el backend solo sirve la carpeta del catalogo
    return `${API_URL}/archivos/imagen?key=${encodeURIComponent(key)}`;
  } catch {
    return url; // no es una URL absoluta valida: se deja como viene
  }
}

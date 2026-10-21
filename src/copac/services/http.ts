import { API_URL, MOCK_URL, USE_MOCKS } from "../config/api";
import { sesionExpirada, tokenActivo } from "../utils/sesion";
import type { ApiEnvelope } from "../types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

// El backend devuelve las columnas `numeric` de Postgres como texto ("48.00").
// Se convierten a number en un solo punto para que el resto de la app trabaje con numeros.
// Lista explicita: otros campos numericos-como-texto (telefono, numero de factura) deben seguir siendo texto.
const CAMPOS_NUMERICOS = new Set([
  "cantidad", "cantidad_actual", "cantidad_despachada", "cantidad_inicial", "cantidad_lote",
  "cantidad_necesaria", "cantidad_produccion", "cantidad_recibida", "cantidad_solicitada",
  "merma", "monto_apertura", "monto_cierre_declarado", "monto_cierre_sistema",
  "monto_entregado_repartidor", "monto_recaudado_efectivo", "monto_recaudado_voucher",
  "precio", "precio_unitario", "saldo", "stock_minimo", "subtotal", "total",
]);

export function normalizarNumeros<T>(valor: T): T {
  if (Array.isArray(valor)) return valor.map(normalizarNumeros) as T;
  if (valor && typeof valor === "object") {
    const salida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      salida[k] = typeof v === "string" && CAMPOS_NUMERICOS.has(k) && v.trim() !== "" && Number.isFinite(Number(v))
        ? Number(v)
        : normalizarNumeros(v);
    }
    return salida as T;
  }
  return valor;
}

// En modo mock lee /mockups/<mockName>.json; en modo real llama a la API con el token de la
// sesion activa. Devuelve siempre el `data` del envelope { data, error }.
export async function request<T>(mockName: string, path: string, init?: RequestInit): Promise<T> {
  if (USE_MOCKS) {
    const res = await fetch(`${MOCK_URL}/${mockName}.json`);
    if (!res.ok) throw new ApiError(`Mock no disponible: ${mockName}`, res.status);
    const body = (await res.json()) as ApiEnvelope<T>;
    if (body.error) throw new ApiError(body.error);
    return body.data;
  }

  const token = tokenActivo();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.");
  }

  // Respuesta sin JSON (por ejemplo 502 del proxy): se informa con el codigo HTTP.
  const body = (await res.json().catch(() => null)) as
    | (ApiEnvelope<T> & { details?: { field: string; message: string }[] })
    | null;

  if (res.status === 401 && token && !path.startsWith("/auth") && !path.startsWith("/cliente/auth")) {
    sesionExpirada();
  }

  if (!res.ok || body?.error) {
    const detalle = body?.details?.map((d) => d.message).join(". ");
    throw new ApiError(detalle || body?.error || `Error ${res.status}`, res.status);
  }
  return normalizarNumeros(body?.data as T);
}

export const toQuery = (params: Record<string, string | number | null | undefined>): string => {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return qs ? `?${qs}` : "";
};

// Para listas cuyo endpoint aun no existe en el backend (responde 404): la pantalla se muestra
// vacia en vez de fallar por completo. Cualquier otro error (401, 500, red) sigue propagandose.
export async function listaOpcional<T>(peticion: Promise<T[]>): Promise<T[]> {
  try {
    return await peticion;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return [];
    throw e;
  }
}

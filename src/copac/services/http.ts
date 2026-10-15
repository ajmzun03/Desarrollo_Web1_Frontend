import { API_URL, MOCK_URL, USE_MOCKS } from "../config/api";
import { getCookie } from "../utils/cookies";
import type { ApiEnvelope } from "../types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

// En modo mock lee /mockups/<mockName>.json; en modo real llama a la API
// con el token de la cookie. Devuelve siempre el `data` del envelope { data, error }.
export async function request<T>(mockName: string, path: string, init?: RequestInit): Promise<T> {
  if (USE_MOCKS) {
    const res = await fetch(`${MOCK_URL}/${mockName}.json`);
    if (!res.ok) throw new ApiError(`Mock no disponible: ${mockName}`, res.status);
    const body = (await res.json()) as ApiEnvelope<T>;
    if (body.error) throw new ApiError(body.error);
    return body.data;
  }

  const token = getCookie("token");
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  const body = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || body.error) throw new ApiError(body.error ?? `Error ${res.status}`, res.status);
  return body.data;
}

export const toQuery = (params: Record<string, string | number | null | undefined>): string => {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return qs ? `?${qs}` : "";
};
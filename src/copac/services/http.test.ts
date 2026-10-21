import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, normalizarNumeros, request } from "./http";
import { CLAVE_CLIENTE, EVENTO_SESION_CLIENTE_EXPIRADA } from "../utils/sesion";

const respuesta = (cuerpo: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } }));

describe("normalizarNumeros", () => {
  it("convierte los decimales de Postgres (texto) a numero", () => {
    expect(normalizarNumeros({ precio: "48.00", total: "120.50", cantidad: "2.00" })).toEqual({ precio: 48, total: 120.5, cantidad: 2 });
  });

  it("no toca telefonos ni numeros de factura, que deben seguir siendo texto", () => {
    const r = normalizarNumeros({ telefono: "55512345", numero: "000123", serie: "A" });
    expect(r).toEqual({ telefono: "55512345", numero: "000123", serie: "A" });
  });

  it("recorre arreglos y objetos anidados", () => {
    const r = normalizarNumeros({ detalles: [{ precio_unitario: "10.00", cantidad: "3" }] });
    expect(r).toEqual({ detalles: [{ precio_unitario: 10, cantidad: 3 }] });
  });

  it("deja intactos null, vacios y valores no numericos", () => {
    expect(normalizarNumeros({ precio: null, total: "", stock_minimo: "abc" })).toEqual({ precio: null, total: "", stock_minimo: "abc" });
  });
});

describe("request (API real)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    document.cookie = "token=; path=/; max-age=0";
    localStorage.clear();
    window.history.pushState({}, "", "/");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("devuelve data con los numeros ya convertidos", async () => {
    fetchMock.mockReturnValue(respuesta({ data: [{ id: 1, precio: "48.00", telefono: "55512345" }], error: null }));
    const r = await request<{ id: number; precio: number; telefono: string }[]>("producto", "/productos");
    expect(r).toEqual([{ id: 1, precio: 48, telefono: "55512345" }]);
  });

  it("en el sistema interno (/copac) envia el token del personal", async () => {
    window.history.pushState({}, "", "/copac/ventas");
    document.cookie = "token=token-personal; path=/";
    localStorage.setItem(CLAVE_CLIENTE, JSON.stringify({ token: "token-cliente" }));
    fetchMock.mockReturnValue(respuesta({ data: [], error: null }));
    await request("pedido", "/pedidos");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer token-personal");
  });

  it("en el portal envia el token del cliente, no el del personal", async () => {
    window.history.pushState({}, "", "/mis-pedidos");
    document.cookie = "token=token-personal; path=/";
    localStorage.setItem(CLAVE_CLIENTE, JSON.stringify({ token: "token-cliente" }));
    fetchMock.mockReturnValue(respuesta({ data: [], error: null }));
    await request("pedido", "/pedidos");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer token-cliente");
  });

  it("un 401 con sesion de cliente la limpia y avisa a la interfaz", async () => {
    window.history.pushState({}, "", "/mis-pedidos");
    localStorage.setItem(CLAVE_CLIENTE, JSON.stringify({ token: "vencido" }));
    const aviso = vi.fn();
    window.addEventListener(EVENTO_SESION_CLIENTE_EXPIRADA, aviso);
    fetchMock.mockReturnValue(respuesta({ data: null, error: "Token expirado" }, 401));
    await expect(request("pedido", "/pedidos")).rejects.toThrow("Token expirado");
    expect(localStorage.getItem(CLAVE_CLIENTE)).toBeNull();
    expect(aviso).toHaveBeenCalledTimes(1);
    window.removeEventListener(EVENTO_SESION_CLIENTE_EXPIRADA, aviso);
  });

  it("un 401 del login (credenciales invalidas) no se trata como sesion vencida", async () => {
    window.history.pushState({}, "", "/login");
    localStorage.setItem(CLAVE_CLIENTE, JSON.stringify({ token: "otro" }));
    fetchMock.mockReturnValue(respuesta({ data: null, error: "Credenciales inválidas" }, 401));
    await expect(request("cliente", "/cliente/auth/login", { method: "POST" })).rejects.toThrow("Credenciales inválidas");
    expect(localStorage.getItem(CLAVE_CLIENTE)).not.toBeNull();
  });

  it("une los detalles de validacion del backend en el mensaje", async () => {
    fetchMock.mockReturnValue(
      respuesta({ data: null, error: "Error de validación", details: [{ field: "contrasenia", message: "Mínimo 8 caracteres" }, { field: "telefono", message: "Teléfono inválido" }] }, 400),
    );
    await expect(request("cliente", "/x")).rejects.toThrow("Mínimo 8 caracteres. Teléfono inválido");
  });

  it("explica el error cuando no hay conexion", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(request("producto", "/productos")).rejects.toBeInstanceOf(ApiError);
    await expect(request("producto", "/productos")).rejects.toThrow(/No se pudo conectar/);
  });

  it("maneja respuestas sin JSON (por ejemplo 502 del proxy)", async () => {
    fetchMock.mockReturnValue(Promise.resolve(new Response("<html>Bad Gateway</html>", { status: 502 })));
    await expect(request("producto", "/productos")).rejects.toThrow("Error 502");
  });
});

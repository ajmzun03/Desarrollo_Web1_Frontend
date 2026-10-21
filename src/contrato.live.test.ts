import { beforeAll, describe, expect, it, vi } from "vitest";

// Prueba de contrato contra el backend REAL (solo lectura: catalogos publicos y logins con
// credenciales invalidas; no crea datos). Se omite si no se indica la URL:
//   LIVE_API_URL=http://localhost:3000 npm test
const URL_API = process.env.LIVE_API_URL;

describe.skipIf(!URL_API)("contrato con el backend real", () => {
  let request: typeof import("./copac/services/http").request;
  let ApiError: typeof import("./copac/services/http").ApiError;
  let authService: typeof import("./copac/services/auth.service").authService;
  let portalService: typeof import("./portal/services/portal.service").portalService;

  beforeAll(async () => {
    vi.stubEnv("VITE_API_URL", URL_API!);
    vi.stubEnv("VITE_USE_MOCKS", "false");
    ({ request, ApiError } = await import("./copac/services/http"));
    ({ authService } = await import("./copac/services/auth.service"));
    ({ portalService } = await import("./portal/services/portal.service"));
  }, 30_000);

  it("productos/disponibilidad: precios como numero y campos de disponibilidad", async () => {
    const productos = await request<Record<string, unknown>[]>("producto", "/productos/disponibilidad");
    expect(productos.length).toBeGreaterThan(0);
    const p = productos[0];
    expect(typeof p.precio).toBe("number");
    expect(typeof p.disponible).toBe("number");
    expect(typeof p.agotado).toBe("boolean");
    expect(p).toHaveProperty("imagen_url");
    expect(typeof p.activo).toBe("boolean");
  }, 30_000);

  it("combos y extras: responden como lista", async () => {
    expect(Array.isArray(await request("combo", "/combos"))).toBe(true);
    expect(Array.isArray(await request("producto-extra", "/productos-extra/producto/1"))).toBe(true);
  }, 30_000);

  it("catalogos publicos para el checkout: sucursales, municipios y categorias", async () => {
    const [sucursales, municipios, categorias] = await Promise.all([
      request<{ id: number; sucursal: string }[]>("sucursal", "/sucursales"),
      request<{ id: number; municipio: string }[]>("municipio", "/municipios"),
      request<{ id: number; descripcion: string }[]>("categoria", "/categorias"),
    ]);
    expect(sucursales[0]).toHaveProperty("sucursal");
    expect(municipios[0]).toHaveProperty("municipio");
    expect(categorias[0]).toHaveProperty("descripcion");
  }, 30_000);

  it("rutas protegidas sin token responden 401 con mensaje claro", async () => {
    const error = await request("pedido", "/pedidos").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as InstanceType<typeof ApiError>).status).toBe(401);
  }, 30_000);

  it("login del personal con credenciales invalidas devuelve 401", async () => {
    const error = await authService.login("usuario.inexistente", "clave-incorrecta-123").catch((e: unknown) => e);
    expect((error as InstanceType<typeof ApiError>).status).toBe(401);
    expect((error as Error).message).toMatch(/Credenciales inv/);
  }, 30_000);

  it("login del cliente con credenciales invalidas devuelve 401", async () => {
    const error = await portalService.login("nadie@ejemplo.com", "clave-incorrecta-123").catch((e: unknown) => e);
    expect((error as InstanceType<typeof ApiError>).status).toBe(401);
  }, 30_000);

  it("el registro valida los datos antes de tocar la base (rechaza una contrasenia corta)", async () => {
    const error = await portalService
      .registrar({ nombre: "Prueba", apellido: "Contrato", correo_electronico: "prueba@ejemplo.com", telefono: "55512345", contrasenia: "corta" })
      .catch((e: unknown) => e);
    expect((error as InstanceType<typeof ApiError>).status).toBe(400);
    expect((error as Error).message).toMatch(/8 caracteres/);
  }, 30_000);
});

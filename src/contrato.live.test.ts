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

  it("las imágenes de productos y combos se cargan de verdad a través del backend (el bucket es privado)", async () => {
    const { urlImagen } = await import("./copac/utils/imagenes");
    const productos = await request<{ imagen_url: string | null }[]>("producto", "/productos");
    const combos = await request<{ imagen: string | null }[]>("combo", "/combos");
    const urls = [...productos.map((p) => p.imagen_url), ...combos.map((c) => c.imagen)].filter((u): u is string => !!u).slice(0, 12);
    if (urls.length === 0) return console.warn("La API no trae imágenes: nada que comprobar.");

    for (const url of urls) {
      const origen = urlImagen(url)!;
      expect(origen, "debe pasar por el backend").toContain("/archivos/imagen?key=");
      const res = await fetch(origen); // sigue la redirección a la URL firmada
      expect(res.status, origen).toBe(200);
      expect(res.headers.get("content-type") ?? "").toMatch(/^image\//);
    }
  }, 120_000);

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

// Paso 1 del login del personal con credenciales reales: el backend debe pedir el segundo factor.
// No enrola ni verifica nada (eso requiere el telefono de la persona). LIVE_STAFF_USER/LIVE_STAFF_PASS.
describe.skipIf(!URL_API || !process.env.LIVE_STAFF_USER || !process.env.LIVE_STAFF_PASS)("login del personal con segundo factor (paso 1 real)", () => {
  it("credenciales validas => pide verificar o enrolar el autenticador (nunca entrega sesion directa)", async () => {
    vi.stubEnv("VITE_API_URL", URL_API!);
    vi.stubEnv("VITE_USE_MOCKS", "false");
    const { authService } = await import("./copac/services/auth.service");
    const r = await authService.login(process.env.LIVE_STAFF_USER!, process.env.LIVE_STAFF_PASS!);
    expect(r.tipo).toBe("verificacion");
    if (r.tipo === "verificacion") {
      expect(["verificar", "enrolar"]).toContain(r.mfa);
      expect(r.tmpToken.length).toBeGreaterThan(20);
    }
  }, 60_000);

  it("un tmpToken inventado no sirve para enrolar ni verificar (401)", async () => {
    const { authService } = await import("./copac/services/auth.service");
    const falso = "x.y.z";
    await expect(authService.enrolar(falso)).rejects.toMatchObject({ status: 401 });
    await expect(authService.verificar(falso, "123456")).rejects.toMatchObject({ status: 401 });
  }, 60_000);
});

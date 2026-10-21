import { beforeAll, describe, expect, it, vi } from "vitest";

// Contrato del sistema interno contra el backend REAL con un usuario de personal. Solo lectura
// (GET): recorre el getAll() de cada servicio y comprueba que responde y que los numeros ya vienen
// convertidos. Las credenciales se pasan por entorno y no se guardan en ningun archivo:
//   LIVE_API_URL=http://localhost:3000 LIVE_STAFF_USER=... LIVE_STAFF_PASS=... npm test
const URL_API = process.env.LIVE_API_URL;
const USUARIO = process.env.LIVE_STAFF_USER;
const CLAVE = process.env.LIVE_STAFF_PASS;

type Servicio = Record<string, unknown> & { getAll?: () => Promise<unknown> };
const modulos = import.meta.glob<Record<string, Servicio>>("./copac/services/*.service.ts");

describe.skipIf(!URL_API || !USUARIO || !CLAVE)("sistema interno contra el backend real", () => {
  const resultados: { servicio: string; estado: "ok" | "error"; detalle: string }[] = [];

  beforeAll(async () => {
    vi.stubEnv("VITE_API_URL", URL_API!);
    vi.stubEnv("VITE_USE_MOCKS", "false");
    const { authService } = await import("./copac/services/auth.service");
    const login = await authService.login(USUARIO!, CLAVE!);
    expect(login.tipo, "el backend pidio codigo 2FA; arranca el backend sin Redis o usa una sesion ya verificada").toBe("sesion");
    if (login.tipo !== "sesion") return;
    // El cliente HTTP toma el token de la cookie cuando la ruta empieza por /copac.
    window.history.pushState({}, "", "/copac/dashboard");
    document.cookie = `token=${encodeURIComponent(login.sesion.token)}; path=/`;
    expect(login.sesion.usuario.rol).toBeTruthy();
  }, 60_000);

  it("cada servicio de lectura responde sin error de servidor", async () => {
    for (const [ruta, cargar] of Object.entries(modulos)) {
      const nombre = ruta.split("/").pop()!.replace(".service.ts", "");
      const mod = await cargar();
      for (const servicio of Object.values(mod)) {
        if (typeof servicio?.getAll !== "function") continue;
        try {
          const datos = await servicio.getAll();
          const filas = Array.isArray(datos) ? datos : [];
          // Ninguna columna numerica conocida debe quedar como texto.
          const texto = filas.flatMap((f) =>
            Object.entries(f as Record<string, unknown>).filter(([k, v]) => ["precio", "total", "subtotal", "cantidad", "precio_unitario"].includes(k) && typeof v === "string"),
          );
          expect(texto, `${nombre}: numeros sin convertir`).toEqual([]);
          resultados.push({ servicio: nombre, estado: "ok", detalle: `${filas.length} filas` });
        } catch (e) {
          resultados.push({ servicio: nombre, estado: "error", detalle: e instanceof Error ? `${(e as { status?: number }).status ?? ""} ${e.message}` : String(e) });
        }
      }
    }
    console.table(resultados);
    const caidos = resultados.filter((r) => r.estado === "error" && !/^(400|403|404) /.test(r.detalle));
    expect(caidos, "servicios con error inesperado").toEqual([]);
  }, 180_000);

  it("auditoria: transforma los movimientos del reporte real en registros validos", async () => {
    const { auditoriaService } = await import("./copac/services/auditoria.service");
    const { MODULOS_AUDITORIA, ESTADOS_AUDITORIA } = await import("./copac/types");
    const registros = await auditoriaService.getAll();
    expect(registros.length).toBeGreaterThan(0);
    expect(new Set(registros.map((r) => r.id)).size, "ids unicos para las claves de React").toBe(registros.length);
    for (const r of registros) {
      expect(MODULOS_AUDITORIA).toContain(r.modulo);
      expect(ESTADOS_AUDITORIA).toContain(r.estado);
      expect(Number.isNaN(new Date(r.fecha).getTime()), `fecha invalida: ${r.fecha}`).toBe(false);
    }
  }, 60_000);

  it("pedidos: el detalle trae lineas con numeros y los pedidos los nuevos campos", async () => {
    const { pedidosService } = await import("./copac/services/pedidos.service");
    const { ESTADOS_PEDIDO } = await import("./copac/types");
    const pedidos = await pedidosService.getAll();
    expect(pedidos.length).toBeGreaterThan(0);
    for (const p of pedidos) {
      expect(typeof p.total).toBe("number");
      expect(ESTADOS_PEDIDO, `estado desconocido: ${p.estado}`).toContain(p.estado);
    }
    const detalle = await pedidosService.getById(pedidos[0].id);
    expect(Array.isArray(detalle.detalles)).toBe(true);
    for (const d of detalle.detalles) {
      expect(typeof d.precio_unitario).toBe("number");
      expect(typeof d.cantidad).toBe("number");
    }
  }, 60_000);

  it("usuarios: los roles del backend existen en el frontend", async () => {
    const { usuariosService } = await import("./copac/services/usuarios.service");
    const { ROLES } = await import("./copac/types");
    const usuarios = await usuariosService.getAll();
    for (const u of usuarios) expect(ROLES, `rol desconocido: ${u.rol}`).toContain(u.rol);
  }, 60_000);

  it("servicios sin endpoint en el backend devuelven lista vacia en vez de fallar", async () => {
    const { notificacionesService } = await import("./copac/services/notificaciones.service");
    const { trasladosService } = await import("./copac/services/traslados.service");
    const { cuadreService } = await import("./copac/services/cuadre.service");
    const { gastosOperativosService } = await import("./copac/services/gastosOperativos.service");
    for (const s of [notificacionesService, trasladosService, cuadreService, gastosOperativosService]) {
      expect(await s.getAll()).toEqual([]);
    }
  }, 60_000);
});

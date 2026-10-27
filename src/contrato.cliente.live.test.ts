import { beforeAll, describe, expect, it, vi } from "vitest";

// Flujo completo del cliente contra el backend REAL (ESCRIBE datos de prueba: un cliente, una
// direccion y pedidos). Solo corre con LIVE_WRITE=1. Al final, el personal anula los pedidos creados
// usando LIVE_STAFF_TOKEN (el login del personal exige codigo TOTP, asi que se pasa un token ya emitido).
//   LIVE_API_URL=http://localhost:3000 LIVE_WRITE=1 LIVE_STAFF_TOKEN=<jwt> npm test
const URL_API = process.env.LIVE_API_URL;
const ACTIVO = Boolean(URL_API && process.env.LIVE_WRITE === "1");
const TOKEN_PERSONAL = process.env.LIVE_STAFF_TOKEN;

describe.skipIf(!ACTIVO)("flujo de cliente contra el backend real", () => {
  const sufijo = String(Date.now()).slice(-8);
  const correo = `prueba.front.${sufijo}@ejemplo.com`;
  const contrasenia = `Prueba-${sufijo}`;
  const pedidosCreados: number[] = [];

  let portal: typeof import("./portal/services/portal.service").portalService;
  let sesionStore: typeof import("./portal/store/sesion").sesionCliente;
  let carritoStore: typeof import("./portal/store/carrito").carrito;
  let sesionActual: import("./portal/store/sesion").SesionCliente;
  let productoId = 0;

  const enPortal = () => window.history.pushState({}, "", "/checkout");

  beforeAll(async () => {
    vi.stubEnv("VITE_API_URL", URL_API!);
    vi.stubEnv("VITE_USE_MOCKS", "false");
    ({ portalService: portal } = await import("./portal/services/portal.service"));
    ({ sesionCliente: sesionStore } = await import("./portal/store/sesion"));
    ({ carrito: carritoStore } = await import("./portal/store/carrito"));
    const { productosService } = await import("./copac/services/productos.service");
    const disponibles = (await productosService.getDisponibilidad()).filter((p) => p.activo !== false && p.agotado !== true);
    // Sin stock en la base no se puede crear un pedido: esas pruebas se omiten (skip) en vez de fallar.
    if (disponibles.length === 0) console.warn("Ningún producto disponible (stock 0): se omiten las pruebas que crean pedidos.");
    productoId = disponibles[0]?.id ?? 0;
    enPortal();
  }, 60_000);

  it("registro: crea la cuenta y devuelve token y cliente", async () => {
    const s = await portal.registrar({ nombre: "Prueba", apellido: "Frontend", correo_electronico: correo, telefono: `5${sufijo.slice(0, 7)}`, contrasenia });
    expect(s.token.length).toBeGreaterThan(20);
    expect(s.cliente.correo_electronico).toBe(correo);
    sesionStore.iniciar(s);
    sesionActual = s;
  }, 60_000);

  it("registro duplicado: el backend responde 409 con un mensaje claro", async () => {
    const error = await portal
      .registrar({ nombre: "Prueba", apellido: "Frontend", correo_electronico: correo, telefono: `6${sufijo.slice(0, 7)}`, contrasenia })
      .catch((e: unknown) => e);
    expect((error as { status: number }).status).toBe(409);
  }, 60_000);

  it("login: con la contrasenia correcta entrega la sesion directamente (sin segundo factor)", async () => {
    const r = await portal.login(correo, contrasenia); // los clientes no tienen segundo factor
    expect(r.token.length).toBeGreaterThan(20);
    expect(r.cliente.id).toBe(sesionActual.cliente.id);
    sesionStore.iniciar(r);
  }, 60_000);

  it("login: contrasenia incorrecta devuelve 401", async () => {
    const error = await portal.login(correo, "otra-contrasenia-123").catch((e: unknown) => e);
    expect((error as { status: number }).status).toBe(401);
  }, 60_000);

  it("pedido en efectivo a domicilio: crea direccion, pedido y lo lista", async ({ skip }) => {
    if (!productoId) skip();
    const direccion = await portal.crearDireccion({ municipio_id: 1, direccion1: "6a Avenida 14-08, Zona 10", direccion2: "Portón negro (prueba automática)" });
    expect(direccion.id).toBeGreaterThan(0);

    carritoStore.vaciar();
    carritoStore.agregar({ tipo: "producto", refId: productoId, nombre: "Producto de prueba", precio: 1, cantidad: 2 });
    const items = JSON.parse(localStorage.getItem("copac_carrito_v2")!);
    const pedido = await portal.crearPedido(sesionActual.cliente, items, { tipoEntrega: "DOMICILIO", metodoPago: "EFECTIVO", direccionId: direccion.id });
    pedidosCreados.push(pedido.id);

    expect(pedido.estado).toBe("CREADO");
    expect(typeof pedido.total, "el total debe ser numero").toBe("number");
    expect(pedido.total).toBeGreaterThan(0); // el precio real sale del catalogo, no del carrito
    expect(pedido.cliente_id).toBe(sesionActual.cliente.id);

    const propios = await portal.getPedidosDeCliente(sesionActual.cliente.id);
    expect(propios.map((p) => p.id)).toContain(pedido.id);
    const detalle = await portal.getPedido(pedido.id);
    expect(detalle.detalles.length).toBeGreaterThan(0);
    expect(typeof detalle.detalles[0].precio_unitario).toBe("number");
  }, 90_000);

  it("pedido para recoger con tarjeta: queda pendiente de pago y se pide el enlace de Stripe", async ({ skip }) => {
    if (!productoId) skip();
    const { sucursalesService } = await import("./copac/services/sucursales.service");
    const sucursal = (await sucursalesService.getAll())[0];
    carritoStore.vaciar();
    carritoStore.agregar({ tipo: "producto", refId: productoId, nombre: "Producto de prueba", precio: 1, cantidad: 1 });
    const items = JSON.parse(localStorage.getItem("copac_carrito_v2")!);
    const pedido = await portal.crearPedido(sesionActual.cliente, items, { tipoEntrega: "RECOGER", metodoPago: "TARJETA", sucursalId: sucursal.id });
    pedidosCreados.push(pedido.id);
    expect(pedido.metodo_pago).toBe("TARJETA");
    expect(pedido.pagado).toBe(false);

    // Pasarela propia: el backend cobra con la API de Stripe (tarjeta de prueba). Si Stripe no esta
    // configurado en este entorno responde 500: se informa, no se oculta.
    const resultado = await portal
      .pagarConTarjeta(pedido.id, [{ nombre: "Producto de prueba", cantidad: 1, monto: pedido.total }], { number: "4242424242424242", exp_month: 12, exp_year: 2030, cvc: "123" })
      .catch((e: unknown) => e);
    if (resultado instanceof Error) console.warn("Stripe no disponible en este entorno:", resultado.message);
    else expect((resultado as { status: string }).status).toBe("succeeded");
  }, 90_000);

  it("limpieza: el personal anula los pedidos de prueba", async ({ skip }) => {
    if (pedidosCreados.length === 0) skip();
    if (!TOKEN_PERSONAL) return console.warn("Sin LIVE_STAFF_TOKEN: los pedidos de prueba quedan sin anular.");
    const { pedidosService } = await import("./copac/services/pedidos.service");
    window.history.pushState({}, "", "/copac/ventas");
    document.cookie = `token=${encodeURIComponent(TOKEN_PERSONAL)}; path=/`;
    for (const id of pedidosCreados) {
      const p = await pedidosService.updateEstado(id, "ANULADO");
      expect(p.estado).toBe("ANULADO");
    }
  }, 90_000);
});

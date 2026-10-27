import { ApiError, request } from "../../copac/services/http";
import { USE_MOCKS } from "../../copac/config/api";
import { pedidosService } from "../../copac/services/pedidos.service";
import type {
  Cliente,
  DetallePedido,
  Direccion,
  EstadoPedido,
  MetodoPago,
  Pedido,
  PedidoConDetalles,
  PedidoCreateInput,
  TipoEntrega,
} from "../../copac/types";
import type { ItemCarrito } from "../store/carrito";
import { precioUnitario } from "../store/carrito";
import type { SesionCliente } from "../store/sesion";

export interface EventoEstado {
  estado: EstadoPedido;
  hora: string;
}

// Los pedidos del backend no guardan historial de estados con hora; solo los demo (modo mock) lo traen.
export interface PedidoPortal extends PedidoConDetalles {
  eventos?: EventoEstado[];
}

export interface DatosRegistro {
  nombre: string;
  apellido: string;
  correo_electronico: string;
  telefono: string;
  telefono_ref?: string;
  contrasenia: string;
}

export interface ItemPago {
  nombre: string;
  cantidad: number;
  monto: number;
}

export interface DatosEntrega {
  tipoEntrega: TipoEntrega;
  metodoPago: MetodoPago;
  sucursalId?: number;
  direccionId?: number;
}

// En modo mock el POST /pedidos del servicio base no persiste nada, asi que los pedidos creados
// desde el portal se guardan en localStorage y se mezclan con el mock.
const LOCAL_KEY = "copac_pedidos_demo";

const leerLocales = (): PedidoPortal[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as PedidoPortal[];
  } catch {
    return [];
  }
};
const guardarLocales = (lista: PedidoPortal[]) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(lista));
  } catch {
    // Sin almacenamiento: el pedido demo no sobrevive a la recarga.
  }
};

const post = <T,>(ruta: string, cuerpo: unknown) =>
  request<T>("cliente", ruta, { method: "POST", body: JSON.stringify(cuerpo) });

const clienteDemo = (): SesionCliente => ({
  token: `demo-cliente-${Date.now()}`,
  cliente: { id: 1, nombre: "Cliente", apellido: "Demo", telefono: "55510001", telefono_ref: null, creado_en: new Date().toISOString() },
});

export const portalService = {
  // ---- Autenticacion de clientes (POST /cliente/auth/*) ----
  async registrar(data: DatosRegistro): Promise<SesionCliente> {
    if (USE_MOCKS) return clienteDemo();
    const r = await post<{ cliente: Cliente; token: string }>("/cliente/auth/registro", data);
    return { cliente: r.cliente, token: r.token };
  },

  // Los clientes NO tienen segundo factor: correo y contrasena devuelven la sesion directamente.
  async login(correo_electronico: string, contrasenia: string): Promise<SesionCliente> {
    if (USE_MOCKS) return clienteDemo();
    const r = await post<{ cliente: Cliente; token: string }>("/cliente/auth/login", { correo_electronico, contrasenia });
    return { cliente: r.cliente, token: r.token };
  },

  // Siempre responde 202 (anti-enumeracion): Supabase envia un correo con un enlace de un solo uso.
  async recuperar(correo_electronico: string): Promise<void> {
    await post<unknown>("/cliente/auth/recuperar", { correo_electronico });
  },

  // tokenHash viene en el enlace del correo (?token_hash=...). 401 = enlace invalido, vencido o ya usado.
  async restablecer(tokenHash: string, nuevaContrasenia: string): Promise<void> {
    await post<unknown>("/cliente/auth/restablecer", { tokenHash, nuevaContrasenia });
  },

  async logout(): Promise<void> {
    if (USE_MOCKS) return;
    try {
      await post<unknown>("/cliente/auth/logout", {});
    } catch {
      // Token ya vencido: igual se cierra la sesion local.
    }
  },

  // ---- Direcciones del cliente ----
  async getDirecciones(): Promise<Direccion[]> {
    return request<Direccion[]>("direccion", "/direcciones");
  },

  async crearDireccion(data: { municipio_id: number; direccion1: string; direccion2: string }): Promise<Direccion> {
    if (USE_MOCKS) return { id: Date.now(), cliente_id: 1, ...data };
    return post<Direccion>("/direcciones", data);
  },

  // ---- Pedidos ----
  // El backend toma el cliente del token y calcula precios y total desde el catalogo.
  async crearPedido(
    cliente: Cliente,
    items: ItemCarrito[],
    entrega: DatosEntrega,
    observacionesExtra?: string,
  ): Promise<PedidoPortal> {
    const notas = items.filter((i) => i.nota).map((i) => `${i.nombre}: ${i.nota}`);
    // Las observaciones del backend admiten 255 caracteres.
    const observaciones = [...notas, observacionesExtra].filter(Boolean).join(" | ").slice(0, 255);

    const input: PedidoCreateInput = {
      ...(observaciones ? { observaciones } : {}),
      ...(entrega.direccionId ? { direccion_id: entrega.direccionId } : {}),
      ...(entrega.sucursalId ? { sucursal_id: entrega.sucursalId } : {}),
      metodo_pago: entrega.metodoPago,
      tipo_entrega: entrega.tipoEntrega,
      items: items.map((i) => ({
        ...(i.tipo === "combo" ? { combo_id: i.refId } : { producto_id: i.refId }),
        cantidad: i.cantidad,
        ...(i.extras.length ? { extras: i.extras.map((e) => ({ producto_extra_id: e.id })) } : {}),
      })),
    };

    if (!USE_MOCKS) {
      const creado = await pedidosService.create(input);
      return { ...creado, detalles: creado.detalles ?? [] };
    }

    const locales = leerLocales();
    const id = Math.max(1000, ...locales.map((p) => p.id)) + 1;
    const detalles: DetallePedido[] = items.map((i, n) => ({
      id: id * 100 + n,
      pedido_id: id,
      producto_id: i.refId,
      precio_unitario: precioUnitario(i),
      cantidad: i.cantidad,
    }));
    const ahora = new Date().toISOString();
    const pedido: PedidoPortal = {
      id,
      cliente_id: cliente.id,
      fecha_pedido: ahora,
      observaciones: input.observaciones ?? null,
      total: items.reduce((a, i) => a + precioUnitario(i) * i.cantidad, 0),
      estado: "CREADO",
      metodo_pago: entrega.metodoPago,
      tipo_entrega: entrega.tipoEntrega,
      pagado: false,
      detalles,
      eventos: [{ estado: "CREADO", hora: ahora }],
    };
    guardarLocales([pedido, ...locales]);
    return pedido;
  },

  // Crea la sesion de Stripe Checkout y devuelve la URL de pago. El monto lo calcula el servidor
  // a partir del pedido; `items` solo describe la compra.
  async iniciarPago(pedidoId: number, items: ItemPago[]): Promise<string> {
    const r = await post<{ url: string | null }>("/pagos/checkout", {
      pedido_id: pedidoId,
      items: items.map((i) => ({ nombre: i.nombre, cantidad: Math.max(1, Math.round(i.cantidad)), monto: Math.max(0.01, i.monto) })),
    });
    if (!r.url) throw new ApiError("No se pudo obtener el enlace de pago.");
    return r.url;
  },

  async getPedidosDeCliente(clienteId: number): Promise<Pedido[]> {
    const todos = await request<Pedido[]>("pedido", "/pedidos");
    // El backend ya filtra por el cliente del token; el filtro cubre el modo mock.
    const propios = todos.filter((p) => Number(p.cliente_id) === Number(clienteId));
    if (!USE_MOCKS) return propios;
    const locales = leerLocales().filter((p) => p.cliente_id === clienteId);
    return [...locales, ...propios.filter((p) => !locales.some((l) => l.id === p.id))];
  },

  async getPedido(id: number): Promise<PedidoPortal> {
    if (USE_MOCKS) {
      const local = leerLocales().find((p) => p.id === id);
      if (local) return local;
    }
    return pedidosService.getById(id);
  },
};

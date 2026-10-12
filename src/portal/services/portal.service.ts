import { ApiError, request } from "../../services/http";
import { clientesService } from "../../services/clientes.service";
import { pedidosService } from "../../services/pedidos.service";
import { USE_MOCKS } from "../../config/api";
import type { Cliente, DetallePedido, EstadoPedido, Pedido, PedidoConDetalles, PedidoCreateInput } from "../../types";
import type { ItemCarrito } from "../store/carrito";

// Tarifa fija de envio mostrada en el portal (el backend aun no la calcula).
export const COSTO_ENVIO = 25;

export interface EventoEstado {
  estado: EstadoPedido;
  hora: string;
}

export interface PedidoPortal extends PedidoConDetalles {
  // Solo informativo; la API V1 no guarda direccion ni metodo de pago en el pedido.
  direccion?: string;
  referencia?: string;
  metodoPago?: string;
  eventos?: EventoEstado[];
}

// En modo mock el POST /pedidos del servicio base no persiste nada, asi que los
// pedidos creados desde el portal se guardan en localStorage y se mezclan con el mock.
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

export interface DatosEntrega {
  direccion: string;
  referencia: string;
  metodoPago: string;
}

export const portalService = {
  // Registro: crea el cliente en POST /clientes (telefono y referencia: 8 digitos distintos).
  async registrar(data: Omit<Cliente, "id" | "creado_en">): Promise<Cliente> {
    if (USE_MOCKS) {
      const existentes = await clientesService.getAll();
      if (existentes.some((c) => c.telefono === data.telefono)) {
        throw new ApiError("Ese teléfono ya está registrado.", 400);
      }
      return { ...data, id: 1000 + Math.floor(Math.random() * 9000), creado_en: new Date().toISOString() };
    }
    return clientesService.create(data);
  },

  // Login: identifica al cliente por su telefono (GET /clientes?telefono=).
  async identificar(telefono: string): Promise<Cliente> {
    const lista = await clientesService.getAll(USE_MOCKS ? undefined : telefono);
    const cliente = lista.find((c) => c.telefono === telefono);
    if (!cliente) throw new ApiError("No encontramos un cliente con ese teléfono.", 404);
    return cliente;
  },

  async crearPedido(clienteId: number, items: ItemCarrito[], entrega: DatosEntrega): Promise<PedidoPortal> {
    const notas = items.filter((i) => i.nota).map((i) => `${i.nombre}: ${i.nota}`);
    const observaciones = [...notas, entrega.referencia && `Ref.: ${entrega.referencia}`].filter(Boolean).join(" | ");
    const input: PedidoCreateInput = {
      cliente_id: clienteId,
      observaciones: observaciones || undefined,
      items: items.map((i) => ({ producto_id: i.productoId, cantidad: i.cantidad })),
    };

    if (!USE_MOCKS) {
      const creado = await pedidosService.create(input);
      return { ...creado, ...entrega };
    }

    const locales = leerLocales();
    const id = Math.max(1000, ...locales.map((p) => p.id)) + 1;
    const detalles: DetallePedido[] = items.map((i, n) => ({
      id: id * 100 + n,
      pedido_id: id,
      producto_id: i.productoId,
      precio_unitario: i.precio,
      cantidad: i.cantidad,
    }));
    const ahora = new Date().toISOString();
    const pedido: PedidoPortal = {
      id,
      cliente_id: clienteId,
      fecha_pedido: ahora,
      observaciones: input.observaciones ?? null,
      total: items.reduce((a, i) => a + i.precio * i.cantidad, 0),
      estado: "CREADO",
      detalles,
      ...entrega,
      eventos: [{ estado: "CREADO", hora: ahora }],
    };
    guardarLocales([pedido, ...locales]);
    return pedido;
  },

  async getPedidosDeCliente(clienteId: number): Promise<Pedido[]> {
    const todos = await request<Pedido[]>("pedido", "/pedidos");
    const propios = todos.filter((p) => p.cliente_id === clienteId);
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

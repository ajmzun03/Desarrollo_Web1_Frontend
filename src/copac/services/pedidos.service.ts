import { ApiError, request } from "./http";
import { USE_MOCKS } from "../config/api";
import type { Pedido, PedidoConDetalles, PedidoCreateInput, EstadoPedido, DetallePedido } from "../types";

export const pedidosService = {
  // Nota: GET /pedidos no incluye detalles; GET /pedidos/{id} los incluye.
  async getAll(): Promise<Pedido[]> {
    return request<Pedido[]>("pedido", "/pedidos");
  },
  async getListos(): Promise<Pedido[]> {
    return request<Pedido[]>("pedido", "/pedidos/listos");
  },
  async getById(id: number): Promise<PedidoConDetalles> {
    if (USE_MOCKS) {
      const [pedidos, detalles] = await Promise.all([
        request<Pedido[]>("pedido", "/pedidos"),
        request<DetallePedido[]>("detalle-pedido", "/detalles-pedido"),
      ]);
      const pedido = pedidos.find((p) => p.id === id);
      if (!pedido) throw new ApiError(`Pedido ${id} no encontrado.`);
      return { ...pedido, detalles: detalles.filter((d) => d.pedido_id === id) };
    }
    return request<PedidoConDetalles>("pedido", `/pedidos/${id}`);
  },
  async create(data: PedidoCreateInput): Promise<PedidoConDetalles> {
    return request<PedidoConDetalles>("pedido", "/pedidos", { method: "POST", body: JSON.stringify(data) });
  },
  async confirmar(id: number): Promise<Pedido> {
    return request<Pedido>("pedido", `/pedidos/${id}/confirmar`, { method: "PATCH" });
  },
  async entregado(id: number): Promise<Pedido> {
    return request<Pedido>("pedido", `/pedidos/${id}/entregado`, { method: "PATCH" });
  },
  // El cliente deja la tarjeta (sin cobrar) y paga en efectivo contra entrega.
  async cambiarAEfectivo(id: number): Promise<Pedido> {
    return request<Pedido>("pedido", `/pedidos/${id}/metodo-efectivo`, { method: "PATCH" });
  },
  async updateEstado(id: number, estado: EstadoPedido): Promise<Pedido> {
    return request<Pedido>("pedido", `/pedidos/${id}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    });
  },
};
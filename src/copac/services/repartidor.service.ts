import { request } from "./http";
import type { Pedido } from "../types";

// El backend filtra por el token: un repartidor solo recibe los pedidos de sus hojas de despacho.
export const repartidorService = {
  async misPedidos(incluirCerrados = false): Promise<Pedido[]> {
    return request<Pedido[]>("pedido", `/repartidor/pedidos${incluirCerrados ? "?todos=true" : ""}`);
  },
  async reportarIncidente(pedidoId: number, motivo: string, detalle?: string): Promise<Pedido> {
    return request<Pedido>("pedido", `/pedidos/${pedidoId}/incidente`, {
      method: "POST",
      body: JSON.stringify({ motivo, ...(detalle ? { detalle } : {}) }),
    });
  },
};

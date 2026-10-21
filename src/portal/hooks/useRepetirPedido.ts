import { useLocation } from "wouter";
import { productosService } from "../../copac/services/productos.service";
import { carrito } from "../store/carrito";
import { portalService } from "../services/portal.service";

// Vuelve a poner en el carrito los productos de un pedido anterior (a precio actual).
export const useRepetirPedido = () => {
  const [, navegar] = useLocation();
  return async (pedidoId: number) => {
    const [pedido, productos] = await Promise.all([portalService.getPedido(pedidoId), productosService.getAll()]);
    for (const d of pedido.detalles) {
      const p = productos.find((x) => x.id === d.producto_id);
      if (p) carrito.agregar({ tipo: "producto", refId: p.id, nombre: p.producto, precio: p.precio, imagen_url: p.imagen_url, cantidad: d.cantidad });
    }
    navegar("/carrito");
  };
};

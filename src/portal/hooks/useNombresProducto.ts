import { productosService } from "../../services/productos.service";
import { useDatos } from "../../hooks/useDatos";

// Devuelve una funcion id -> nombre del producto (los detalles del pedido solo traen producto_id).
export const useNombresProducto = () => {
  const { datos } = useDatos(() => productosService.getAll());
  return (id: number) => datos?.find((p) => p.id === id)?.producto ?? `Producto #${id}`;
};

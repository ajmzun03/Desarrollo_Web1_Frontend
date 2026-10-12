import { categoriasService } from "../../services/categorias.service";
import { productosService, type ProductoDisponibilidad } from "../../services/productos.service";
import type { Categoria } from "../../types";
import { emojiDeCategoria } from "../utils/formato";
import { useDatos } from "../../hooks/useDatos";

export interface Catalogo {
  productos: ProductoDisponibilidad[];
  categorias: Categoria[];
  emojiDe: (categoriaId: number) => string;
  // El endpoint real devuelve `disponible`; el mock no, y ahi todo se considera disponible.
  estaDisponible: (p: ProductoDisponibilidad) => boolean;
}

export const useCatalogo = () =>
  useDatos<Catalogo>(async () => {
    const [productos, categorias] = await Promise.all([
      productosService.getDisponibilidad(),
      categoriasService.getAll(),
    ]);
    return {
      productos,
      categorias,
      emojiDe: (id) => emojiDeCategoria(categorias.find((c) => c.id === id)?.descripcion ?? ""),
      estaDisponible: (p) => p.disponible === undefined || p.disponible > 0,
    };
  });

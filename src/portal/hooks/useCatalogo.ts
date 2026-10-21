import { categoriasService } from "../../copac/services/categorias.service";
import { productosService, type ProductoDisponibilidad } from "../../copac/services/productos.service";
import { combosService } from "../../copac/services/combos.service";
import type { Categoria, Combo } from "../../copac/types";
import { emojiDeCategoria } from "../utils/formato";
import { useDatos } from "../../hooks/useDatos";

export interface Catalogo {
  productos: ProductoDisponibilidad[];
  combos: Combo[];
  categorias: Categoria[];
  emojiDe: (categoriaId: number) => string;
  // El backend marca `agotado` segun el stock; los productos inactivos no se listan.
  estaDisponible: (p: ProductoDisponibilidad) => boolean;
}

export const useCatalogo = () =>
  useDatos<Catalogo>(async () => {
    const [productos, categorias, combos] = await Promise.all([
      productosService.getDisponibilidad(),
      categoriasService.getAll(),
      combosService.getAll().catch(() => [] as Combo[]),
    ]);
    return {
      productos: productos.filter((p) => p.activo !== false),
      combos: combos.filter((c) => c.activo !== false),
      categorias,
      emojiDe: (id) => emojiDeCategoria(categorias.find((c) => c.id === id)?.descripcion ?? ""),
      estaDisponible: (p) => p.agotado !== true && (p.disponible === undefined || p.disponible > 0),
    };
  });

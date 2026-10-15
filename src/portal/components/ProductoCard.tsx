import { Link } from "wouter";
import { Plus } from "lucide-react";
import type { Producto } from "../../copac/types";
import { carrito } from "../store/carrito";
import { quetzales } from "../utils/formato";
import { ProductImage } from "./ProductImage";

interface Props {
  producto: Producto;
  emoji: string;
  disponible?: boolean;
}

export const ProductoCard = ({ producto, emoji, disponible = true }: Props) => (
  <article className={disponible ? "p-card" : "p-card p-card--agotado"}>
    <Link href={`/menu/${producto.id}`} className="p-card__media">
      <ProductImage src={producto.imagen_url} alt={producto.producto} emoji={emoji} />
      {!disponible && <span className="p-card__etiqueta">No disponible</span>}
    </Link>
    <div className="p-card__cuerpo">
      <h3>
        <Link href={`/menu/${producto.id}`}>{producto.producto}</Link>
      </h3>
      <div className="p-card__pie">
        <strong className="p-precio">{quetzales(producto.precio)}</strong>
        <button
          type="button"
          className="p-btn p-btn--sm"
          disabled={!disponible}
          onClick={() =>
            carrito.agregar({
              productoId: producto.id,
              nombre: producto.producto,
              precio: producto.precio,
              imagen_url: producto.imagen_url,
            })
          }
        >
          <Plus size={14} aria-hidden="true" /> Agregar
        </button>
      </div>
    </div>
  </article>
);
